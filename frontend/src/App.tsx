import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { ConnectionForm } from './components/ConnectionForm';
import { ConnectionSidebar } from './components/ConnectionSidebar';
import { TerminalContainer } from './components/TerminalContainer';
import { QuickCommandsPanel } from './components/QuickCommandsPanel';
import { usePreferencesStore } from './store/preferencesStore';
import { useConnectionStore } from './store/connectionStore';
import { db, type SSHConfig } from './db';
import './App.css';

function App() {
  const [showForm, setShowForm] = useState(false);
  const [formConfig, setFormConfig] = useState<SSHConfig | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileQuickCommandsOpen, setMobileQuickCommandsOpen] = useState(false);
  const { theme, language } = usePreferencesStore();
  const {
    loadConfigs,
    createSession,
    updateSessionStatus,
    updateSessionWs
  } = useConnectionStore();

  // Load configs on mount
  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.style.backgroundColor = theme === 'dark' ? '#282a36' : '#ffffff';
  }, [theme]);

  // Close mobile sidebars when clicking overlay
  const handleOverlayClick = useCallback(() => {
    setMobileSidebarOpen(false);
    setMobileQuickCommandsOpen(false);
  }, []);

  // Connect to SSH server
  const connectToServer = useCallback((config: SSHConfig) => {
    // Create new session (allows multiple sessions per config)
    const { sessionId, ws } = createSession(config);

    ws.onopen = () => {
      // Send connect message
      ws.send(JSON.stringify({
        type: 'connect',
        data: {
          host: config.host,
          port: config.port,
          username: config.username,
          privateKey: config.privateKey,
          password: config.password,
        }
      }));
    };

    ws.onmessage = (event) => {
      // Only handle control messages here (binary is handled by TerminalContainer)
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'connected') {
            if (msg.data?.success) {
              updateSessionStatus(sessionId, 'connected');
              setShowForm(false);
              setFormConfig(null);

              // Update last used time
              db.configs.update(config.id, { lastUsedAt: new Date() });
            }
          } else if (msg.type === 'error') {
            console.error('SSH Error:', msg.data?.message);
            updateSessionStatus(sessionId, 'disconnected');
          }
        } catch {
          // Ignore parse errors
        }
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      updateSessionStatus(sessionId, 'disconnected');
    };

    ws.onclose = () => {
      updateSessionStatus(sessionId, 'disconnected');
      updateSessionWs(sessionId, null);
    };
  }, [createSession, updateSessionStatus, updateSessionWs]);

  // Handle new connection from form
  const handleNewConnection = useCallback((config: SSHConfig) => {
    connectToServer(config);
  }, [connectToServer]);

  // Handle reconnect from sidebar
  const handleReconnect = useCallback((config: SSHConfig) => {
    // Check if we have credentials saved (either privateKey or password)
    if (!config.privateKey && !config.password) {
      // No credentials saved, show form with config data
      setFormConfig(config);
      setShowForm(true);
    } else {
      // Connect directly with saved credentials
      connectToServer(config);
    }
  }, [connectToServer]);

  // Handle new connection button
  const handleCreateNewConnection = useCallback(() => {
    setFormConfig(null);
    setShowForm(true);
  }, []);

  return (
    <div className="app" data-theme={theme}>
      <Header onNewConnection={handleCreateNewConnection} />

      {/* Mobile overlay */}
      {(mobileSidebarOpen || mobileQuickCommandsOpen) && (
        <div
          className="mobile-overlay"
          onClick={handleOverlayClick}
          role="button"
          aria-label="Close mobile panels"
          data-testid="mobile-overlay"
        />
      )}

      <main className="main">
        <ConnectionSidebar
          onConnect={handleReconnect}
          className={mobileSidebarOpen ? 'mobile-open' : ''}
        />

        <div className="main-content">
          <TerminalContainer onNewConnection={handleCreateNewConnection} />
          <VirtualKeyboard />
        </div>

        <QuickCommandsPanel className={mobileQuickCommandsOpen ? 'mobile-open' : ''} />
      </main>

      {/* Mobile bottom navigation */}
      <nav className="mobile-nav">
        <button
          className={`mobile-nav-btn ${mobileSidebarOpen ? 'active' : ''}`}
          onClick={() => {
            setMobileSidebarOpen(!mobileSidebarOpen);
            setMobileQuickCommandsOpen(false);
          }}
          aria-label={language === 'zh' ? '连接' : 'Connections'}
          data-testid="mobile-nav-connections"
        >
          <span className="mobile-nav-btn-icon">📋</span>
          <span>{language === 'zh' ? '连接' : 'Connections'}</span>
        </button>
        <button className="mobile-nav-btn active">
          <span className="mobile-nav-btn-icon">💻</span>
          <span>{language === 'zh' ? '终端' : 'Terminal'}</span>
        </button>
        <button
          className={`mobile-nav-btn ${mobileQuickCommandsOpen ? 'active' : ''}`}
          onClick={() => {
            setMobileQuickCommandsOpen(!mobileQuickCommandsOpen);
            setMobileSidebarOpen(false);
          }}
          aria-label={language === 'zh' ? '命令' : 'Commands'}
          data-testid="mobile-nav-commands"
        >
          <span className="mobile-nav-btn-icon">⚡</span>
          <span>{language === 'zh' ? '命令' : 'Commands'}</span>
        </button>
      </nav>

      {showForm && (
        <ConnectionForm
          onClose={() => {
            setShowForm(false);
            setFormConfig(null);
          }}
          initialConfig={formConfig}
          onConnect={handleNewConnection}
        />
      )}
    </div>
  );
}

export default App;
