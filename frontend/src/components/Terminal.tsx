import { useEffect, useRef } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useConnectionStore } from '../store/connectionStore';
import { usePreferencesStore } from '../store/preferencesStore';

const darkTheme = {
  background: '#1a1b26',
  foreground: '#c0caf5',
  cursor: '#c0caf5',
  cursorAccent: '#c0caf5',
  selectionBackground: '#515c7e',
  black: '#15161e',
  red: '#f7768e',
  green: '#9ece6a',
  yellow: '#e0af68',
  blue: '#7aa2f7',
  magenta: '#bb9af7',
  cyan: '#7dcfff',
  white: '#a9b1d6',
  brightBlack: '#414868',
  brightRed: '#ff899d',
  brightGreen: '#b9f8c3',
  brightYellow: '#ffc767',
  brightBlue: '#8db4fe',
  brightMagenta: '#c7a0dc',
  brightCyan: '#a4e5ef',
  brightWhite: '#c0caf5',
};

const lightTheme = {
  background: '#ffffff',
  foreground: '#24292e',
  cursor: '#24292e',
  cursorAccent: '#24292e',
  selectionBackground: '#b6e3ff',
  black: '#24292e',
  red: '#d73a49',
  green: '#28a745',
  yellow: '#ffd33d',
  blue: '#0366d6',
  magenta: '#6f42c1',
  cyan: '#1b6fbd',
  white: '#586069',
  brightBlack: '#6a737d',
  brightRed: '#cb2431',
  brightGreen: '#22863a',
  brightYellow: '#b08800',
  brightBlue: '#005cc5',
  brightMagenta: '#5432b4',
  brightCyan: '#3192aa',
  brightWhite: '#959da5',
};

export function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const { ws, isConnected } = useConnectionStore();
  const { theme, fontSize } = usePreferencesStore();

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const xterm = new XTerminal({
      fontSize,
      theme: theme === 'dark' ? darkTheme : lightTheme,
      fontFamily: 'Monaco, Menlo, "Courier New", monospace',
      cursorBlink: true,
      cursorStyle: 'block',
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims && ws && isConnected) {
          ws.send(JSON.stringify({
            type: 'resize',
            data: { cols: Math.round(dims.cols), rows: Math.round(dims.rows) }
          }));
        }
      }
    };

    window.addEventListener('resize', handleResize);

    // Handle input
    xterm.onData((data) => {
      if (ws && isConnected) {
        ws.send(JSON.stringify({ type: 'input', data: { input: data } }));
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update theme
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = theme === 'dark' ? darkTheme : lightTheme;
    }
  }, [theme]);

  // Update font size
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.fontSize = fontSize;
      fitAddonRef.current?.fit();
    }
  }, [fontSize]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!ws) return;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output' && xtermRef.current) {
          xtermRef.current.write((msg.data as { output: string }).output);
        }
      } catch {
        // Ignore parse errors
      }
    };
  }, [ws]);

  return (
    <div
      ref={terminalRef}
      className="h-full w-full"
      style={{ backgroundColor: theme === 'dark' ? '#1a1b26' : '#ffffff' }}
    />
  );
}
