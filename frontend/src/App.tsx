import { useState, useEffect } from 'react';
import {
  Terminal,
  VirtualKeyboard,
  ConnectionForm,
  CommandHistory,
  Header,
} from './components';
import { usePreferencesStore } from './store/preferencesStore';
import { useConnectionStore } from './store/connectionStore';
import { db } from './db/index';

function App() {
  const [showForm, setShowForm] = useState(false);
  const { theme } = usePreferencesStore();
  const { isConnected, setCurrentConfig } = useConnectionStore();

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Load last used config on mount
  useEffect(() => {
    db.configs
      .orderBy('lastUsedAt')
      .reverse()
      .first()
      .then((config) => {
        if (config) {
          setCurrentConfig(config);
        }
      });
  }, [setCurrentConfig]);

  // Show connection form if not connected
  useEffect(() => {
    if (!isConnected) {
      setShowForm(true);
    }
  }, [isConnected]);

  return (
    <div className={`h-screen flex flex-col ${theme}`}>
      <Header onNewConnection={() => setShowForm(true)} />

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-hidden">
            {isConnected ? (
              <Terminal />
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-900 text-gray-400">
                <div className="text-center">
                  <div className="text-6xl mb-4">🖥️</div>
                  <p className="text-xl mb-2">欢迎使用 Web SSH</p>
                  <p className="text-sm text-gray-500">点击"新建连接"开始</p>
                </div>
              </div>
            )}
          </div>
          <VirtualKeyboard />
        </div>
        <CommandHistory />
      </main>

      {showForm && <ConnectionForm onClose={() => setShowForm(false)} />}
    </div>
  );
}

export default App;
