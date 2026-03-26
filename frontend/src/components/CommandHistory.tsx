import { useEffect, useState } from 'react';
import { useConnectionStore } from '../store/connectionStore';
import { useHistoryStore } from '../store/historyStore';
import { usePreferencesStore } from '../store/preferencesStore';
import './CommandHistory.css';

export function CommandHistory() {
  const [searchQuery, setSearchQuery] = useState('');
  const { activeSessionId, sessions, configs } = useConnectionStore();
  const { getDisplayHistory, loadAllHistory, clearHistory, setFilter, filterConfigId, loadHistory } = useHistoryStore();
  const { sidebarVisible, toggleSidebar } = usePreferencesStore();

  // Get active session and its configId
  const activeSession = activeSessionId ? sessions.get(activeSessionId) : null;
  const activeConfigId = activeSession?.configId || null;

  // Load all history on mount
  useEffect(() => {
    loadAllHistory();
  }, [loadAllHistory]);

  // Load history for active config
  useEffect(() => {
    if (activeConfigId) {
      loadHistory(activeConfigId);
    }
  }, [activeConfigId, loadHistory]);

  const history = getDisplayHistory(activeConfigId);

  // Get current session's WebSocket
  const ws = activeSession?.ws || null;

  const handleClick = (command: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input', data: { input: command + '\r' } }));
    }
  };

  const handleClear = async () => {
    if (filterConfigId) {
      await clearHistory(filterConfigId);
    } else if (activeConfigId) {
      await clearHistory(activeConfigId);
    }
  };

  // Filter history by search query
  const filteredHistory = searchQuery
    ? history.filter(item => item.command.toLowerCase().includes(searchQuery.toLowerCase()))
    : history;

  // Get config name by id
  const getConfigName = (configId: string) => {
    const config = configs.find(c => c.id === configId);
    return config?.name || configId.slice(0, 8);
  };

  // Format time as subtle
  const formatTime = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
      return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
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

      {/* Filter tabs */}
      <div className="history-filters">
        <button
          className={`history-filter-btn ${!filterConfigId ? 'active' : ''}`}
          onClick={() => setFilter(null)}
        >
          全部
        </button>
        {activeConfigId && (
          <button
            className={`history-filter-btn ${filterConfigId === activeConfigId ? 'active' : ''}`}
            onClick={() => setFilter(activeConfigId)}
          >
            当前连接
          </button>
        )}
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
        {!activeConfigId && history.length === 0 ? (
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
                className={`history-item ${item.configId === activeConfigId ? 'current-session' : ''}`}
                onClick={() => handleClick(item.command)}
                title={item.command}
              >
                <span className="history-item-command">{item.command}</span>
                <span className="history-item-meta">
                  {!filterConfigId && item.configId !== activeConfigId && (
                    <span className="history-item-config">{getConfigName(item.configId)}</span>
                  )}
                  <span className="history-item-time">{formatTime(item.executedAt)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
