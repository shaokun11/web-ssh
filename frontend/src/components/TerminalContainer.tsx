import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useConnectionStore } from '../store/connectionStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { useHistoryStore } from '../store/historyStore';
import { TabBar } from './TabBar';
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
  background: '#faf9f7',
  foreground: '#2d2a26',
  cursor: '#5c5852',
  cursorAccent: '#faf9f7',
  selectionBackground: '#e0ddd7',
  selectionForeground: '#2d2a26',
  black: '#2d2a26',
  red: '#b85c5c',
  green: '#3d8c6e',
  yellow: '#9a7b3a',
  blue: '#4a6a8f',
  magenta: '#8a5a7f',
  cyan: '#3a7cbd',
  white: '#5c5852',
  brightBlack: '#5c5852',
  brightRed: '#c45c5c',
  brightGreen: '#4da87a',
  brightYellow: '#b89a4a',
  brightBlue: '#5a7a9f',
  brightMagenta: '#9a6a8f',
  brightCyan: '#4a8ccd',
  brightWhite: '#8a857d',
};

interface TerminalContainerProps {
  onNewConnection: () => void;
}

// Terminal instances per session
interface TerminalInstance {
  xterm: XTerminal;
  fitAddon: FitAddon;
  onDataDisposable?: { dispose: () => void };
  currentLine: string;
}

export function TerminalContainer({ onNewConnection }: TerminalContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalInstances = useRef<Map<string, TerminalInstance>>(new Map());
  const cleanupFns = useRef<Map<string, () => void>>(new Map());

  const {
    sessions,
    activeSessionId,
    getAllSessions,
    updateSessionStatus
  } = useConnectionStore();

  const { theme, fontSize } = usePreferencesStore();
  const { addCommand } = useHistoryStore();

  const currentTheme = theme === 'dark' ? darkTheme : lightTheme;
  const allSessions = getAllSessions();
  const activeSession = activeSessionId ? sessions.get(activeSessionId) : null;

  // Initialize terminal for container
  useEffect(() => {
    if (!containerRef.current) return;

    // Fit on resize
    const handleResize = () => {
      terminalInstances.current.forEach((instance) => {
        instance.fitAddon.fit();
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Create or destroy terminals based on sessions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Track which sessions we've created terminals for
    const currentSessionIds = new Set(terminalInstances.current.keys());

    // Create terminals for new sessions
    allSessions.forEach((session) => {
      if (!terminalInstances.current.has(session.id)) {
        // Create terminal element
        const terminalEl = document.createElement('div');
        terminalEl.className = 'terminal-instance';
        terminalEl.id = `terminal-${session.id}`;
        terminalEl.style.display = session.id === activeSessionId ? 'block' : 'none';
        container.appendChild(terminalEl);

        // Create xterm instance
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
        xterm.open(terminalEl);
        fitAddon.fit();

        const instance: TerminalInstance = {
          xterm,
          fitAddon,
          currentLine: '',
        };

        terminalInstances.current.set(session.id, instance);

        // Setup WebSocket handlers
        if (session.ws) {
          setupTerminalHandlers(session.id, session.ws!, xterm, fitAddon);
        }
      } else {
        // Update visibility
        const terminalEl = document.getElementById(`terminal-${session.id}`);
        if (terminalEl) {
          terminalEl.style.display = session.id === activeSessionId ? 'block' : 'none';
        }
      }
    });

    // Destroy terminals for removed sessions
    currentSessionIds.forEach((sessionId) => {
      if (!sessions.has(sessionId)) {
        const instance = terminalInstances.current.get(sessionId);
        if (instance) {
          instance.onDataDisposable?.dispose();
          instance.xterm.dispose();
          terminalInstances.current.delete(sessionId);
        }
        const terminalEl = document.getElementById(`terminal-${sessionId}`);
        if (terminalEl) {
          terminalEl.remove();
        }
        // Run cleanup
        const cleanup = cleanupFns.current.get(sessionId);
        if (cleanup) {
          cleanup();
          cleanupFns.current.delete(sessionId);
        }
      }
    });

    // Fit active terminal
    if (activeSessionId) {
      const instance = terminalInstances.current.get(activeSessionId);
      if (instance) {
        setTimeout(() => instance.fitAddon.fit(), 50);
      }
    }
  }, [allSessions, activeSessionId, sessions, fontSize, currentTheme]);

  // Setup terminal handlers for a session
  const setupTerminalHandlers = useCallback((
    sessionId: string,
    ws: WebSocket,
    xterm: XTerminal,
    fitAddon: FitAddon
  ) => {
    let currentLine = '';

    // Handle incoming messages - pass through directly to xterm
    // This allows ANSI escape sequences to work properly (top, vim, etc.)
    const handleMessage = (event: MessageEvent) => {
      // Binary message (terminal output) - pass directly to xterm
      // xterm.js handles ANSI escape sequences correctly
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
            updateSessionStatus(sessionId, 'disconnected');
          } else if (msg.type === 'connected') {
            updateSessionStatus(sessionId, 'connected');
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
          // Raw text - pass to xterm
          xterm.write(event.data);
        }
      }
    };

    // Handle terminal input - send directly to server
    // Don't intercept Tab - let server handle it
    const onDataDisposable = xterm.onData((data) => {
      if (ws.readyState !== WebSocket.OPEN) return;

      // Track current line for history (simple tracking)
      // Note: This is a best-effort tracking; real terminal input tracking
      // would require parsing PTY output to echo
      if (data === '\r') {
        // Enter pressed - try to save command
        if (currentLine.trim()) {
          const session = sessions.get(sessionId);
          if (session?.configId) {
            addCommand(session.configId, currentLine.trim());
          }
        }
        currentLine = '';
      } else if (data.charCodeAt(0) === 127 || data === '\b') {
        // Backspace
        currentLine = currentLine.slice(0, -1);
      } else if (data.charCodeAt(0) >= 32) {
        // Regular character
        currentLine += data;
      }

      // Send ALL input directly to server - don't intercept Tab
      // This allows server-side autocomplete and programs like top to work
      ws.send(JSON.stringify({
        type: 'input',
        data: { input: data }
      }));
    });

    // Handle connection events
    const handleClose = () => {
      updateSessionStatus(sessionId, 'disconnected');
      xterm.writeln('');
      xterm.writeln('\x1b[1;33mConnection closed\x1b[0m');
    };

    const handleError = () => {
      updateSessionStatus(sessionId, 'disconnected');
      xterm.writeln('');
      xterm.writeln('\x1b[1;31mConnection error\x1b[0m');
    };

    ws.addEventListener('message', handleMessage);
    ws.addEventListener('close', handleClose);
    ws.addEventListener('error', handleError);

    // Store cleanup function
    cleanupFns.current.set(sessionId, () => {
      ws.removeEventListener('message', handleMessage);
      ws.removeEventListener('close', handleClose);
      ws.removeEventListener('error', handleError);
      onDataDisposable.dispose();
    });
  }, [updateSessionStatus, addCommand, sessions]);

  // Update themes for all terminals
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

  return (
    <div className="terminal-wrapper">
      <TabBar onNewConnection={onNewConnection} />

      <div className="terminal-viewport">
        <div
          ref={containerRef}
          className="terminal-container"
          style={{ minHeight: '100%' }}
        />

        {!activeSession && (
          <div className="welcome-screen">
            <div className="welcome-icon">🖥️</div>
            <h2 className="welcome-title">欢迎使用 Web SSH</h2>
            <div className="welcome-privacy-notice">
              <span className="privacy-icon">🔒</span>
              <span className="privacy-text">所有数据均保存在本地浏览器，不会上传到任何服务器</span>
            </div>
            <button className="btn btn-primary btn-lg" onClick={onNewConnection}>
              + 新建连接
            </button>

            <div className="quick-commands">
              <h3 className="quick-commands-title">常用命令</h3>
              <div className="quick-commands-grid">
                <div className="quick-command-card">
                  <span className="cmd-icon">📁</span>
                  <span className="cmd-name">文件操作</span>
                  <div className="cmd-list">
                    <code>ls -la</code>
                    <code>cd /path</code>
                    <code>cp -r src dest</code>
                    <code>mv old new</code>
                    <code>rm -rf dir</code>
                    <code>find . -name "*.txt"</code>
                  </div>
                </div>
                <div className="quick-command-card">
                  <span className="cmd-icon">📊</span>
                  <span className="cmd-name">系统监控</span>
                  <div className="cmd-list">
                    <code>top</code>
                    <code>htop</code>
                    <code>df -h</code>
                    <code>du -sh *</code>
                    <code>free -h</code>
                    <code>ps aux | grep xxx</code>
                  </div>
                </div>
                <div className="quick-command-card">
                  <span className="cmd-icon">🌐</span>
                  <span className="cmd-name">网络相关</span>
                  <div className="cmd-list">
                    <code>ping google.com</code>
                    <code>curl -I url</code>
                    <code>netstat -tulpn</code>
                    <code>ss -tulpn</code>
                    <code>wget url</code>
                    <code>scp file user@host:/path</code>
                  </div>
                </div>
                <div className="quick-command-card">
                  <span className="cmd-icon">📝</span>
                  <span className="cmd-name">文本处理</span>
                  <div className="cmd-list">
                    <code>grep -r "text" .</code>
                    <code>cat file | head -20</code>
                    <code>tail -f logfile</code>
                    <code>sed -i 's/old/new/g' file</code>
                    <code>{"awk '{print $1}' file"}</code>
                    <code>sort file | uniq -c</code>
                  </div>
                </div>
                <div className="quick-command-card">
                  <span className="cmd-icon">🔐</span>
                  <span className="cmd-name">权限管理</span>
                  <div className="cmd-list">
                    <code>chmod 755 file</code>
                    <code>chown user:group file</code>
                    <code>sudo -u user cmd</code>
                    <code>passwd</code>
                    <code>ssh-keygen -t rsa</code>
                    <code>ssh-copy-id user@host</code>
                  </div>
                </div>
                <div className="quick-command-card">
                  <span className="cmd-icon">📦</span>
                  <span className="cmd-name">压缩解压</span>
                  <div className="cmd-list">
                    <code>tar -czvf out.tar.gz dir</code>
                    <code>tar -xzvf file.tar.gz</code>
                    <code>zip -r out.zip dir</code>
                    <code>unzip file.zip</code>
                    <code>gzip file</code>
                    <code>gunzip file.gz</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
