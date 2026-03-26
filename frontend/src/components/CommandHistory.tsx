import { useEffect, useState } from 'react';
import { db, type CommandHistoryItem } from '../db';
import { useConnectionStore } from '../store/connectionStore';
import { usePreferencesStore } from '../store/preferencesStore';
import './CommandHistory.css';

export function CommandHistory() {
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const { currentConfig, ws, isConnected } = useConnectionStore();
  const { sidebarVisible, toggleSidebar } = usePreferencesStore();

  useEffect(() => {
    if (currentConfig) {
      db.history
        .where('configId')
        .equals(currentConfig.id)
        .reverse()
        .limit(100)
        .toArray()
        .then(setHistory);
    }
  }, [currentConfig]);

  const handleClick = (command: string) => {
    if (ws && isConnected) {
      ws.send(JSON.stringify({ type: 'input', data: { input: command + '\r' } }));
    }
  };

  const handleClear = async () => {
    if (currentConfig) {
      await db.history.where('configId').equals(currentConfig.id).delete();
      setHistory([]);
    }
  };

  if (!sidebarVisible) {
    return (
      <button className="history-toggle" onClick={toggleSidebar} title="显示命令历史">
        ◀
      </button>
    );
  }

  return (
    <aside className="history-panel">
      <div className="history-header">
        <span className="history-title">命令历史</span>
        <div className="history-actions">
          {history.length > 0 && (
            <button className="history-action" onClick={handleClear} title="清空历史">
              🗑️
            </button>
          )}
          <button className="history-action" onClick={toggleSidebar} title="隐藏面板">
            ▶
          </button>
        </div>
      </div>

      <div className="history-content">
        {history.length === 0 ? (
          <div className="history-empty">
            <span className="history-empty-icon">📋</span>
            <span className="history-empty-text">暂无历史记录</span>
          </div>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <button
                key={item.id}
                className="history-item"
                onClick={() => handleClick(item.command)}
                title={item.command}
              >
                {item.command}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
