import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Terminal } from './components/Terminal';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { ConnectionForm } from './components/ConnectionForm';
import { CommandHistory } from './components/CommandHistory';
import { ConnectionSidebar } from './components/ConnectionSidebar';
import { usePreferencesStore } from './store/preferencesStore';
import { useConnectionStore } from './store/connectionStore';
import { db, type SSHConfig } from './db';
import './App.css';

function App() {
  const [showForm, setShowForm] = useState(false);
  const [formConfig, setFormConfig] = useState<SSHConfig | null>(null);
  const { theme } = usePreferencesStore();
  const { isConnected, loadConfigs, setWs, setConnected, setCurrentConfig } = useConnectionStore();

  // Load configs on mount
  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.style.backgroundColor = theme === 'dark' ? '#282a36' : '#ffffff';
  }, [theme]);

  // Connect to SSH server
  const connectToServer = useCallback((config: SSHConfig) => {
    // Close existing connection if any
    const store = useConnectionStore.getState();
    if (store.ws) {
      store.ws.close();
    }

    // Create new WebSocket connection
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // Send connect message
      ws.send(JSON.stringify({
        type: 'connect',
        data: {
          host: config.host,
          port: config.port,
          username: config.username,
          privateKey: config.privateKey,
        }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'connected') {
          if ((msg.data as { success: boolean }).success) {
            setWs(ws);
            setConnected(true);
            setCurrentConfig(config);
            setShowForm(false);
            setFormConfig(null);

            // Update last used time
            db.configs.update(config.id, { lastUsedAt: new Date() });
          }
        } else if (msg.type === 'error') {
          console.error('SSH Error:', (msg.data as { message: string }).message);
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      setConnected(false);
      setWs(null);
    };
  }, [setWs, setConnected, setCurrentConfig]);

  // Handle new connection from form
  const handleNewConnection = useCallback((config: SSHConfig) => {
    connectToServer(config);
  }, [connectToServer]);

  // Handle reconnect from sidebar
  const handleReconnect = useCallback((config: SSHConfig) => {
    if (!config.privateKey) {
      // No private key saved, show form with config data
      setFormConfig(config);
      setShowForm(true);
    } else {
      // Connect directly
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

      <main className="main">
        <ConnectionSidebar onConnect={handleReconnect} />

        <div className="main-content">
          {isConnected ? (
            <Terminal />
          ) : (
            <div className="welcome-screen">
              <div className="welcome-icon">🖥️</div>
              <h2 className="welcome-title">欢迎使用 Web SSH</h2>
              <p className="welcome-subtitle">点击"新建连接"开始您的 SSH 会话</p>
              <button className="btn btn-primary btn-lg" onClick={handleCreateNewConnection}>
                + 新建连接
              </button>
            </div>
          )}
          <VirtualKeyboard />
        </div>

        <CommandHistory />
      </main>

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
