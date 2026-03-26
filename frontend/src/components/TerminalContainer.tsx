import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useConnectionStore } from '../store/connectionStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { useHistoryStore } from '../store/historyStore';
import { TabBar } from './TabBar';
import { AutocompleteDropdown } from './AutocompleteDropdown';
import './Terminal.css';

// Theme definitions
const darkTheme = {
  background: '#282a36',
  foreground: '#f8f8f2',
  cursor: '#f8f8f2',
  cursorAccent: '#282a36',
  selectionBackground: '#44475a',
  selectionForeground: '#f8f8f2',
  black: '#000000',
  red: '#ff5555',
  green: '#50fa7b',
  yellow: '#f1fa8c',
  blue: '#bd93f9',
  magenta: '#ff79c6',
  cyan: '#8be9fd',
  white: '#f8f8f2',
  brightBlack: '#6272a4',
  brightRed: '#ff6e6e',
  brightGreen: '#69ff94',
  brightYellow: '#ffffa5',
  brightBlue: '#d6acff',
  brightMagenta: '#ff92df',
  brightCyan: '#a4ffff',
  brightWhite: '#ffffff',
};

const lightTheme = {
  background: '#ffffff',
  foreground: '#24292e',
  cursor: '#24292e',
  cursorAccent: '#ffffff',
  selectionBackground: '#c8e1ff',
  selectionForeground: '#24292e',
  black: '#24292e',
  red: '#d73a49',
  green: '#28a745',
  yellow: '#ffd33d',
  blue: '#0366d6',
  magenta: '#6f42c1',
  cyan: '#005cc5',
  white: '#586069',
  brightBlack: '#444d56',
  brightRed: '#cb2431',
  brightGreen: '#22863a',
  brightYellow: '#b08800',
  brightBlue: '#005cc5',
  brightMagenta: '#6f42c1',
  brightCyan: '#005cc5',
  brightWhite: '#fafbfc',
};

interface TerminalInstance {
  xterm: XTerminal;
  fitAddon: FitAddon;
  onDataDisposable?: { dispose: () => void };
  currentInput: string;
}

interface TerminalContainerProps {
  onNewConnection: () => void;
}

export function TerminalContainer({ onNewConnection }: TerminalContainerProps) {
  const containerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const terminalInstances = useRef<Map<string, TerminalInstance>>(new Map());
  const [autocompleteState, setAutocompleteState] = useState<{
    visible: boolean;
    suggestions: string[];
    selectedIndex: number;
    configId: string;
    prefix: string;
    position: { x: number; y: number };
  }>({
    visible: false,
    suggestions: [],
    selectedIndex: 0,
    configId: '',
    prefix: '',
    position: { x: 0, y: 0 },
  });

  const { sessions, activeConfigId, updateSessionStatus, updateSessionWs } = useConnectionStore();
  const { theme, fontSize } = usePreferencesStore();
  const { loadHistory, addCommand, searchHistory } = useHistoryStore();

  // Get current theme
  const currentTheme = theme === 'dark' ? darkTheme : lightTheme;

  // Create terminal instance
  const createTerminal = useCallback((configId: string) => {
    const container = containerRefs.current.get(configId);
    if (!container || terminalInstances.current.has(configId)) return null;

    const xterm = new XTerminal({
      fontSize,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      lineHeight: 1.4,
      theme: currentTheme,
      cursorBlink: true,
      cursorStyle: 'block',
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(container);
    fitAddon.fit();

    const instance: TerminalInstance = {
      xterm,
      fitAddon,
      currentInput: '',
    };

    terminalInstances.current.set(configId, instance);
    return instance;
  }, [fontSize, currentTheme]);

  // Destroy terminal instance
  const destroyTerminal = useCallback((configId: string) => {
    const instance = terminalInstances.current.get(configId);
    if (instance) {
      instance.onDataDisposable?.dispose();
      instance.xterm.dispose();
      terminalInstances.current.delete(configId);
    }
  }, []);

  // Setup WebSocket handlers for a session
  const setupWebSocket = useCallback((configId: string, ws: WebSocket, xterm: XTerminal, fitAddon: FitAddon) => {
    // Load history for this config
    loadHistory(configId);

    // Track current input for autocomplete
    let currentInput = '';

    // Handle incoming messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        const decoder = new TextDecoder('utf-8');
        const output = decoder.decode(event.data);
        xterm.write(output);

        // Buffer output for background tabs
        const session = sessions.get(configId);
        if (session && configId !== activeConfigId) {
          updateSessionWs(configId, ws);
        }
        return;
      }

      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'error') {
            xterm.writeln('');
            xterm.writeln(`\x1b[1;31mError: ${msg.data?.message || 'Unknown error'}\x1b[0m`);
            updateSessionStatus(configId, 'disconnected');
          } else if (msg.type === 'connected') {
            updateSessionStatus(configId, 'connected');
            const dims = fitAddon.proposeDimensions();
            if (dims) {
              ws.send(JSON.stringify({
                type: 'resize',
                data: { cols: Math.round(dims.cols), rows: Math.round(dims.rows) }
              }));
            }
          }
        } catch {
          xterm.write(event.data);
        }
      }
    };

    // Handle terminal input with autocomplete support
    const onDataDisposable = xterm.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Track input for autocomplete
        if (data === '\t') {
          // Tab pressed - trigger autocomplete
          const suggestions = searchHistory(configId, currentInput);
          if (suggestions.length > 0) {
            setAutocompleteState({
              visible: true,
              suggestions,
              selectedIndex: 0,
              configId,
              prefix: currentInput,
              position: { x: 10, y: 50 }, // Simplified position
            });
            return; // Don't send Tab to server
          }
        } else if (data === '\r') {
          // Enter pressed - save command to history
          if (currentInput.trim()) {
            addCommand(configId, currentInput.trim());
          }
          currentInput = '';
          setAutocompleteState(prev => ({ ...prev, visible: false }));
        } else if (data === '\x1b' || data.startsWith('\x1b[')) {
          // Escape or arrow keys - close autocomplete
          if (autocompleteState.visible) {
            // Handle arrow navigation in autocomplete
            if (data === '\x1b[A') { // Up arrow
              setAutocompleteState(prev => ({
                ...prev,
                selectedIndex: Math.max(0, prev.selectedIndex - 1),
              }));
              return;
            } else if (data === '\x1b[B') { // Down arrow
              setAutocompleteState(prev => ({
                ...prev,
                selectedIndex: Math.min(prev.suggestions.length - 1, prev.selectedIndex + 1),
              }));
              return;
            }
          }
          setAutocompleteState(prev => ({ ...prev, visible: false }));
        } else if (data.charCodeAt(0) === 127 || data === '\b') {
          // Backspace
          currentInput = currentInput.slice(0, -1);
          setAutocompleteState(prev => ({ ...prev, visible: false }));
        } else if (data.charCodeAt(0) >= 32) {
          // Regular character
          currentInput += data;
          setAutocompleteState(prev => ({ ...prev, visible: false }));
        }

        ws.send(JSON.stringify({
          type: 'input',
          data: { input: data }
        }));
      }
    });

    ws.addEventListener('message', handleMessage);

    ws.onclose = () => {
      updateSessionStatus(configId, 'disconnected');
      xterm.writeln('');
      xterm.writeln('\x1b[1;33mConnection closed\x1b[0m');
    };

    ws.onerror = () => {
      updateSessionStatus(configId, 'disconnected');
      xterm.writeln('');
      xterm.writeln('\x1b[1;31mConnection error\x1b[0m');
    };

    // Store disposable for cleanup
    const instance = terminalInstances.current.get(configId);
    if (instance) {
      instance.onDataDisposable = onDataDisposable;
      instance.currentInput = '';
    }

    return () => {
      ws.removeEventListener('message', handleMessage);
      onDataDisposable.dispose();
    };
  }, [sessions, activeConfigId, loadHistory, addCommand, searchHistory, updateSessionStatus, updateSessionWs, autocompleteState.visible]);

  // Manage terminal lifecycle based on sessions
  useEffect(() => {
    sessions.forEach((session, configId) => {
      // Create terminal if not exists
      if (!terminalInstances.current.has(configId)) {
        const instance = createTerminal(configId);
        if (instance && session.ws) {
          setupWebSocket(configId, session.ws, instance.xterm, instance.fitAddon);
        }
      }
    });

    // Destroy terminals for removed sessions
    terminalInstances.current.forEach((_, configId) => {
      if (!sessions.has(configId)) {
        destroyTerminal(configId);
      }
    });
  }, [sessions, createTerminal, destroyTerminal, setupWebSocket]);

  // Update theme for all terminals
  useEffect(() => {
    terminalInstances.current.forEach((instance) => {
      instance.xterm.options.theme = currentTheme;
    });
  }, [currentTheme]);

  // Update font size for all terminals
  useEffect(() => {
    terminalInstances.current.forEach((instance) => {
      instance.xterm.options.fontSize = fontSize;
      setTimeout(() => instance.fitAddon.fit(), 50);
    });
  }, [fontSize]);

  // Fit active terminal on resize
  useEffect(() => {
    const handleResize = () => {
      if (activeConfigId) {
        const instance = terminalInstances.current.get(activeConfigId);
        if (instance) {
          instance.fitAddon.fit();
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeConfigId]);

  // Handle autocomplete selection
  const handleAutocompleteSelect = useCallback((suggestion: string) => {
    const instance = terminalInstances.current.get(autocompleteState.configId);
    const session = sessions.get(autocompleteState.configId);

    if (instance && session?.ws) {
      // Clear current input and type the full suggestion
      const clearChars = autocompleteState.prefix.length;
      for (let i = 0; i < clearChars; i++) {
        session.ws.send(JSON.stringify({
          type: 'input',
          data: { input: '\b' }
        }));
      }

      // Send the full suggestion
      session.ws.send(JSON.stringify({
        type: 'input',
        data: { input: suggestion }
      }));

      // Update terminal display (approximate - actual display comes from server)
      instance.currentInput = suggestion;
    }

    setAutocompleteState(prev => ({ ...prev, visible: false }));
  }, [autocompleteState, sessions]);

  const handleAutocompleteClose = useCallback(() => {
    setAutocompleteState(prev => ({ ...prev, visible: false }));
  }, []);

  // Get sorted sessions for rendering
  const sortedSessions = Array.from(sessions.entries())
    .sort((a, b) => new Date(b[1].connectedAt).getTime() - new Date(a[1].connectedAt).getTime());

  return (
    <div className="terminal-wrapper">
      <TabBar onNewConnection={onNewConnection} />

      <div className="terminal-viewport">
        {sortedSessions.map(([configId]) => (
          <div
            key={configId}
            ref={(el) => {
              if (el) containerRefs.current.set(configId, el);
            }}
            className={`terminal-instance ${configId === activeConfigId ? 'active' : ''}`}
            style={{ display: configId === activeConfigId ? 'block' : 'none' }}
          >
            <div className="terminal-container"></div>
          </div>
        ))}

        {sessions.size === 0 && (
          <div className="welcome-screen">
            <div className="welcome-icon">🖥️</div>
            <h2 className="welcome-title">欢迎使用 Web SSH</h2>
            <p className="welcome-subtitle">点击"新建连接"开始您的 SSH 会话</p>
            <button className="btn btn-primary btn-lg" onClick={onNewConnection}>
              + 新建连接
            </button>
          </div>
        )}
      </div>

      {autocompleteState.visible && (
        <AutocompleteDropdown
          suggestions={autocompleteState.suggestions}
          selectedIndex={autocompleteState.selectedIndex}
          position={autocompleteState.position}
          onSelect={handleAutocompleteSelect}
          onClose={handleAutocompleteClose}
        />
      )}
    </div>
  );
}
