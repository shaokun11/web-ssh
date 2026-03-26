import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Terminal } from './components/Terminal';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { ConnectionForm } from './components/ConnectionForm';
import { CommandHistory } from './components/CommandHistory';
import { ConnectionSidebar } from './components/ConnectionSidebar';
import { usePreferencesStore } from './store/preferencesStore';
import { useConnectionStore } from './store/connectionStore';
import './App.css';

function App() {
  const [showForm, setShowForm] = useState(false);
  const { theme } = usePreferencesStore();
  const { isConnected, loadConfigs } = useConnectionStore();

  // Load configs on mount
  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Show connection form if not connected
  useEffect(() => {
    if (!isConnected) {
      setShowForm(true);
    }
  }, [isConnected]);

  return (
    <div className="app" data-theme={theme}>
      <Header onNewConnection={() => setShowForm(true)} />

      <main className="main">
        <ConnectionSidebar onNewConnection={() => setShowForm(true)} />

        <div className="main-content">
          {isConnected ? (
            <Terminal />
          ) : (
            <div className="welcome-screen">
              <div className="welcome-icon">🖥️</div>
              <h2 className="welcome-title">欢迎使用 Web SSH</h2>
              <p className="welcome-subtitle">点击"新建连接"开始您的 SSH 会话</p>
              <button className="btn btn-primary btn-lg" onClick={() => setShowForm(true)}>
                + 新建连接
              </button>
            </div>
          )}
          <VirtualKeyboard />
        </div>

        <CommandHistory />
      </main>

      {showForm && <ConnectionForm onClose={() => setShowForm(false)} />}
    </div>
  );
}

export default App;
