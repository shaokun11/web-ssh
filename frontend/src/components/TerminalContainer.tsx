import { useEffect, useRef, useState, useMemo } from 'react';
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

interface TerminalContainerProps {
  onNewConnection: () => void;
}

export function TerminalContainer({ onNewConnection }: TerminalContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const currentInputRef = useRef<string>('');
  const cleanupRef = useRef<(() => void) | null>(null);

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

  const { sessions, activeConfigId, updateSessionStatus } = useConnectionStore();
  const { theme, fontSize } = usePreferencesStore();
  const { addCommand, searchHistory } = useHistoryStore();

  // Get current theme
  const currentTheme = theme === 'dark' ? darkTheme : lightTheme;

  // Get active session
  const activeSession = useMemo(() => {
    if (!activeConfigId) return null;
    return sessions.get(activeConfigId) || null;
  }, [activeConfigId, sessions]);

  // Initialize terminal once
  useEffect(() => {
    if (!containerRef.current) return;

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
    xterm.open(containerRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    return () => {
      xterm.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  // Handle WebSocket connection changes
  useEffect(() => {
    const xterm = xtermRef.current;
    const fitAddon = fitAddonRef.current;
    if (!xterm || !fitAddon) return;

    // Cleanup previous connection handlers
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Clear terminal for new connection
    xterm.clear();
    currentInputRef.current = '';

    if (!activeSession?.ws) {
      xterm.writeln('欢迎使用 Web SSH');
      xterm.writeln('点击"新建连接"开始您的 SSH 会话');
      return;
    }

    const ws = activeSession.ws;

    // Handle incoming messages
    const handleMessage = (event: MessageEvent) => {
      // Binary message (terminal output)
      if (event.data instanceof ArrayBuffer) {
        const decoder = new TextDecoder('utf-8');
        const output = decoder.decode(event.data);
        xterm.write(output);
        return;
      }

      // Text message (control messages)
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'error') {
            xterm.writeln('');
            xterm.writeln(`\x1b[1;31mError: ${msg.data?.message || 'Unknown error'}\x1b[0m`);
            updateSessionStatus(activeConfigId!, 'disconnected');
          } else if (msg.type === 'connected') {
            updateSessionStatus(activeConfigId!, 'connected');
            // Send terminal size
            const dims = fitAddon.proposeDimensions();
            if (dims) {
              ws.send(JSON.stringify({
                type: 'resize',
                data: { cols: Math.round(dims.cols), rows: Math.round(dims.rows) }
              }));
            }
          }
        } catch {
          // Raw text output
          xterm.write(event.data);
        }
      }
    };

    // Handle terminal input
    const onDataDisposable = xterm.onData((data) => {
      if (ws.readyState !== WebSocket.OPEN) return;

      const configId = activeConfigId!;

      // Tab - autocomplete
      if (data === '\t') {
        const suggestions = searchHistory(configId, currentInputRef.current);
        if (suggestions.length > 0) {
          // Get cursor position from xterm
          const buffer = xterm.buffer.active;
          const cursorX = buffer.cursorX * 9; // Approximate char width
          const cursorY = buffer.cursorY * (fontSize * 1.4) + 80; // Add offset for tab bar

          setAutocompleteState({
            visible: true,
            suggestions,
            selectedIndex: 0,
            configId,
            prefix: currentInputRef.current,
            position: { x: Math.min(cursorX, 300), y: cursorY },
          });
          return; // Don't send Tab to server
        }
      }
      // Enter - save command
      else if (data === '\r') {
        if (currentInputRef.current.trim()) {
          addCommand(configId, currentInputRef.current.trim());
        }
        currentInputRef.current = '';
        setAutocompleteState(prev => ({ ...prev, visible: false }));
      }
      // Arrow keys - navigate autocomplete
      else if (data === '\x1b[A' && autocompleteState.visible) { // Up
        setAutocompleteState(prev => ({
          ...prev,
          selectedIndex: Math.max(0, prev.selectedIndex - 1),
        }));
        return;
      }
      else if (data === '\x1b[B' && autocompleteState.visible) { // Down
        setAutocompleteState(prev => ({
          ...prev,
          selectedIndex: Math.min(prev.suggestions.length - 1, prev.selectedIndex + 1),
        }));
        return;
      }
      // Escape - close autocomplete
      else if (data === '\x1b') {
        setAutocompleteState(prev => ({ ...prev, visible: false }));
      }
      // Backspace
      else if (data.charCodeAt(0) === 127 || data === '\b') {
        currentInputRef.current = currentInputRef.current.slice(0, -1);
        setAutocompleteState(prev => ({ ...prev, visible: false }));
      }
      // Regular character
      else if (data.charCodeAt(0) >= 32) {
        currentInputRef.current += data;
        setAutocompleteState(prev => ({ ...prev, visible: false }));
      }

      // Send to server
      ws.send(JSON.stringify({
        type: 'input',
        data: { input: data }
      }));
    });

    // Handle connection close
    const handleClose = () => {
      if (activeConfigId) {
        updateSessionStatus(activeConfigId, 'disconnected');
      }
      xterm.writeln('');
      xterm.writeln('\x1b[1;33mConnection closed\x1b[0m');
    };

    const handleError = () => {
      if (activeConfigId) {
        updateSessionStatus(activeConfigId, 'disconnected');
      }
      xterm.writeln('');
      xterm.writeln('\x1b[1;31mConnection error\x1b[0m');
    };

    ws.addEventListener('message', handleMessage);
    ws.addEventListener('close', handleClose);
    ws.addEventListener('error', handleError);

    // Fit terminal
    setTimeout(() => fitAddon.fit(), 100);

    // Store cleanup function
    cleanupRef.current = () => {
      ws.removeEventListener('message', handleMessage);
      ws.removeEventListener('close', handleClose);
      ws.removeEventListener('error', handleError);
      onDataDisposable.dispose();
    };

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [activeSession, activeConfigId, updateSessionStatus, addCommand, searchHistory, autocompleteState.visible, fontSize]);

  // Update theme
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = currentTheme;
    }
  }, [currentTheme]);

  // Update font size
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.fontSize = fontSize;
      setTimeout(() => fitAddonRef.current?.fit(), 50);
    }
  }, [fontSize]);

  // Fit on resize
  useEffect(() => {
    const handleResize = () => {
      fitAddonRef.current?.fit();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle autocomplete selection
  const handleAutocompleteSelect = (suggestion: string) => {
    const ws = activeSession?.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Clear current input
    const clearChars = autocompleteState.prefix.length;
    for (let i = 0; i < clearChars; i++) {
      ws.send(JSON.stringify({
        type: 'input',
        data: { input: '\x7f' } // Backspace
      }));
    }

    // Type suggestion
    ws.send(JSON.stringify({
      type: 'input',
      data: { input: suggestion }
    }));

    currentInputRef.current = suggestion;
    setAutocompleteState(prev => ({ ...prev, visible: false }));
  };

  const handleAutocompleteClose = () => {
    setAutocompleteState(prev => ({ ...prev, visible: false }));
  };

  return (
    <div className="terminal-wrapper">
      <TabBar onNewConnection={onNewConnection} />

      <div className="terminal-viewport">
        <div
          ref={containerRef}
          className="terminal-container"
          style={{ paddingBottom: '80px' }}
        />

        {!activeSession && (
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
