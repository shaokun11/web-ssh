import { useEffect, useState } from 'react';
import { useConnectionStore } from '../store/connectionStore';
import { useHistoryStore } from '../store/historyStore';
import { usePreferencesStore } from '../store/preferencesStore';
import './CommandHistory.css';

export function CommandHistory() {
  const [searchQuery, setSearchQuery] = useState('');
  const { activeConfigId, sessions } = useConnectionStore();
  const { getCurrentHistory, loadHistory, clearHistory } = useHistoryStore();
  const { sidebarVisible, toggleSidebar } = usePreferencesStore();

  const history = getCurrentHistory(activeConfigId || '');

  // Load history when active config changes
  useEffect(() => {
    if (activeConfigId) {
      loadHistory(activeConfigId);
    }
  }, [activeConfigId, loadHistory]);

  // Get current session's WebSocket
  const currentSession = activeConfigId ? sessions.get(activeConfigId) : null;
  const ws = currentSession?.ws;

  const handleClick = (command: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input', data: { input: command + '\r' } }));
    }
  };

  const handleClear = async () => {
    if (activeConfigId) {
      await clearHistory(activeConfigId);
    }
  };

  // Filter history by search query
  const filteredHistory = searchQuery
    ? history.filter(item => item.command.toLowerCase().includes(searchQuery.toLowerCase()))
    : history;

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

      {/* Search box */}
      <div className="history-search">
        <input
          type="text"
          className="history-search-input"
          placeholder="搜索命令..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="history-content">
        {!activeConfigId ? (
          <div className="history-empty">
            <span className="history-empty-icon">🔌</span>
            <span className="history-empty-text">请先连接服务器</span>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="history-empty">
            <span className="history-empty-icon">
              {searchQuery ? '🔍' : '📋'}
            </span>
            <span className="history-empty-text">
              {searchQuery ? '无匹配命令' : '暂无历史记录'}
            </span>
          </div>
        ) : (
          <div className="history-list">
            {filteredHistory.map((item) => (
              <button
                key={item.id}
                className="history-item"
                onClick={() => handleClick(item.command)}
                title={item.command}
              >
                <span className="history-item-command">{item.command}</span>
                <span className="history-item-time">
                  {new Date(item.executedAt).toLocaleTimeString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
