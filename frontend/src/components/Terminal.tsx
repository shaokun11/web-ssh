import { useEffect, useRef } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useConnectionStore } from '../store/connectionStore';
import { usePreferencesStore } from '../store/preferencesStore';
import './Terminal.css';

// Dark theme (Dracula)
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

// Light theme (GitHub-style)
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

export function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const { ws, isConnected, currentConfig, disconnect } = useConnectionStore();
  const { theme, fontSize } = usePreferencesStore();

  // Initialize terminal once
  useEffect(() => {
    if (!containerRef.current) return;

    if (!xtermRef.current) {
      const xterm = new XTerminal({
        fontSize: fontSize,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        lineHeight: 1.4,
        theme: theme === 'dark' ? darkTheme : lightTheme,
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
    }

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update terminal theme when app theme changes
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = theme === 'dark' ? darkTheme : lightTheme;
    }
  }, [theme]);

  // Update font size when it changes
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.fontSize = fontSize;
      setTimeout(() => fitAddonRef.current?.fit(), 50);
    }
  }, [fontSize]);

  // Clear terminal when starting new connection
  useEffect(() => {
    if (ws && xtermRef.current) {
      xtermRef.current.clear();
    }
  }, [ws, currentConfig?.id]);

  // Handle WebSocket messages and input
  useEffect(() => {
    if (!ws || !xtermRef.current) return;

    const xterm = xtermRef.current;
    const fitAddon = fitAddonRef.current;

    // Handle incoming messages
    const handleMessage = (event: MessageEvent) => {
      // Raw output - write directly to terminal
      if (typeof event.data === 'string') {
        // Try to parse as JSON for control messages
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'error') {
            xterm.writeln('');
            xterm.writeln(`\x1b[1;31mError: ${msg.data?.message || 'Unknown error'}\x1b[0m`);
          } else if (msg.type === 'connected') {
            // Connected successfully - send terminal size
            if (fitAddon) {
              const dims = fitAddon.proposeDimensions();
              if (dims) {
                ws.send(JSON.stringify({
                  type: 'resize',
                  data: { cols: Math.round(dims.cols), rows: Math.round(dims.rows) }
                }));
              }
            }
          }
          // Other JSON messages are ignored (output comes as raw text)
        } catch {
          // Not JSON - it's raw terminal output, write directly
          xterm.write(event.data);
        }
      }
    };

    // Handle terminal input
    const onDataDisposable = xterm.onData((data) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'input',
          data: { input: data }
        }));
      }
    });

    ws.addEventListener('message', handleMessage);

    // Fit terminal
    setTimeout(() => fitAddon?.fit(), 100);

    return () => {
      ws.removeEventListener('message', handleMessage);
      onDataDisposable.dispose();
    };
  }, [ws, currentConfig]);

  // Fit terminal when connected
  useEffect(() => {
    if (isConnected && fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 100);
    }
  }, [isConnected]);

  const handleDisconnect = () => {
    if (ws) {
      ws.close();
    }
    disconnect();
  };

  return (
    <div className="terminal-wrapper">
      <div className="terminal-tabs">
        <div className="terminal-tab active">
          <span className="terminal-tab-title">
            {currentConfig?.name || 'Terminal'}
          </span>
          {isConnected && (
            <button className="terminal-tab-close" onClick={handleDisconnect} title="断开连接">
              ×
            </button>
          )}
        </div>
      </div>
      <div className="terminal-container" ref={containerRef}></div>
    </div>
  );
}
