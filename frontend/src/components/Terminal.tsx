import { useEffect, useRef } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useConnectionStore } from '../store/connectionStore';
import './Terminal.css';

// Dracula terminal theme
const draculaTheme = {
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

export function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const { ws, isConnected, currentConfig } = useConnectionStore();

  // Initialize terminal once
  useEffect(() => {
    if (!containerRef.current) return;

    if (!xtermRef.current) {
      const xterm = new XTerminal({
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        lineHeight: 1.5,
        theme: draculaTheme,
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

  // Handle WebSocket messages and input
  useEffect(() => {
    if (!ws || !xtermRef.current) return;

    const xterm = xtermRef.current;
    const fitAddon = fitAddonRef.current;

    // Clear terminal and show welcome
    xterm.clear();
    xterm.writeln('\x1b[1;35m═══════════════════════════════════════════════════════\x1b[0m');
    xterm.writeln('\x1b[1;35m  WebSSH Terminal - Dracula Theme\x1b[0m');
    xterm.writeln('\x1b[1;35m═══════════════════════════════════════════════════════\x1b[0m');
    xterm.writeln('');
    xterm.writeln('\x1b[90mConnecting to server...\x1b[0m');

    // Handle incoming messages
    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'output') {
          // Output from SSH session
          const output = msg.data?.output || '';
          xterm.write(output);
        } else if (msg.type === 'error') {
          // Error message
          xterm.writeln('');
          xterm.writeln(`\x1b[1;31mError: ${msg.data?.message || 'Unknown error'}\x1b[0m`);
        } else if (msg.type === 'connected') {
          // Connected successfully
          xterm.writeln('');
          xterm.writeln(`\x1b[1;32m✓ Connected to ${currentConfig?.host}\x1b[0m`);
          xterm.writeln('');

          // Send initial resize
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
      } catch {
        // Ignore parse errors
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
    setTimeout(() => {
      fitAddon?.fit();
    }, 100);

    return () => {
      ws.removeEventListener('message', handleMessage);
      onDataDisposable.dispose();
    };
  }, [ws, currentConfig]);

  // Fit terminal when connected
  useEffect(() => {
    if (isConnected && fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 100);
    }
  }, [isConnected]);

  return (
    <div className="terminal-wrapper">
      <div className="terminal-tabs">
        <div className="terminal-tab active">
          <span className="terminal-tab-title">
            {currentConfig?.name || 'Terminal'}
          </span>
          <button className="terminal-tab-close" title="关闭">×</button>
        </div>
        <button className="terminal-tab-add" title="新建标签页">+</button>
      </div>
      <div className="terminal-container" ref={containerRef}></div>
    </div>
  );
}
