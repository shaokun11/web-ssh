import { useEffect, useState } from 'react';
import { useConnectionStore } from '../store/connectionStore';
import { db, type SSHConfig } from '../db';
import { ConnectionForm } from './ConnectionForm';
import './ConnectionSidebar.css';

interface Props {
  onConnect: (config: SSHConfig) => void;
}

export function ConnectionSidebar({ onConnect }: Props) {
  const {
    configs,
    getAllSessions,
    activeSessionId,
    loadConfigs,
    focusSession,
    disconnectSession
  } = useConnectionStore();

  const [editingConfig, setEditingConfig] = useState<SSHConfig | null>(null);
  const [copyingConfig, setCopyingConfig] = useState<SSHConfig | null>(null);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // Get all active sessions
  const allSessions = getAllSessions();

  // Group sessions by configId
  const sessionsByConfigId = new Map<string, typeof allSessions>();
  allSessions.forEach(session => {
    const existing = sessionsByConfigId.get(session.configId) || [];
    sessionsByConfigId.set(session.configId, [...existing, session]);
  });

  // Get configs with active sessions
  const configsWithSessions = configs.filter(c => sessionsByConfigId.has(c.id));
  // Get configs without active sessions
  const configsWithoutSessions = configs.filter(c => !sessionsByConfigId.has(c.id));

  // Handle clicking on an existing session
  const handleSessionClick = (sessionId: string) => {
    focusSession(sessionId);
  };

  // Handle clicking on a saved config - always creates new connection
  const handleConfigClick = async (config: SSHConfig) => {
    // Update last used time
    await db.configs.update(config.id, { lastUsedAt: new Date() });
    // Always create a new connection
    onConnect(config);
  };

  const handleDeleteConfig = async (e: React.MouseEvent, configId: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这个连接配置吗？已连接的会话不会被关闭。')) {
      await db.configs.delete(configId);
      await loadConfigs();
    }
  };

  const handleEditConfig = (e: React.MouseEvent, config: SSHConfig) => {
    e.stopPropagation();
    setEditingConfig(config);
  };

  const handleCopyConfig = (e: React.MouseEvent, config: SSHConfig) => {
    e.stopPropagation();
    setCopyingConfig(config);
  };

  const handleDisconnectSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    disconnectSession(sessionId);
  };

  const handleFormClose = () => {
    setEditingConfig(null);
    setCopyingConfig(null);
    loadConfigs();
  };

  const getSessionStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return '●';
      case 'connecting':
        return '◐';
      default:
        return '○';
    }
  };

  const getSessionStatusClass = (status: string) => {
    return `status-${status}`;
  };

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-title">SSH 连接</span>
        </div>

        {/* Active Connections Section */}
        {configsWithSessions.length > 0 && (
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="sidebar-section-icon">🔗</span>
              <span className="sidebar-section-title">活动连接</span>
              <span className="sidebar-section-count">{allSessions.length}</span>
            </div>
            <div className="connection-list">
              {configsWithSessions.map((config) => {
                const sessions = sessionsByConfigId.get(config.id) || [];
                return (
                  <div key={config.id} className="config-sessions-group">
                    {/* Sessions for this config */}
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}
                        onClick={() => handleSessionClick(session.id)}
                      >
                        <span className={`status-dot ${getSessionStatusClass(session.status)}`}>
                          {getSessionStatusIcon(session.status)}
                        </span>
                        <div className="session-info">
                          <div className="session-name">{session.tabName}</div>
                          <div className="session-detail">
                            {config.username}@{config.host}:{config.port}
                          </div>
                        </div>
                        <div className="session-actions">
                          <button
                            className="session-action disconnect"
                            onClick={(e) => handleDisconnectSession(e, session.id)}
                            title="断开"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Saved Connections Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span className="sidebar-section-icon">📋</span>
            <span className="sidebar-section-title">已保存</span>
            <span className="sidebar-section-count">{configsWithoutSessions.length}</span>
          </div>

          {configsWithoutSessions.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📡</span>
              <span className="empty-text">暂无保存的连接</span>
              <span className="empty-hint">点击"新建连接"添加服务器</span>
            </div>
          ) : (
            <div className="connection-list">
              {configsWithoutSessions.map((config) => (
                <div
                  key={config.id}
                  className="connection-item"
                  onClick={() => handleConfigClick(config)}
                >
                  <span className="status-dot disconnected">○</span>
                  <div className="connection-item-info">
                    <div className="connection-item-name">{config.name}</div>
                    <div className="connection-item-detail">
                      {config.username}@{config.host}:{config.port}
                    </div>
                  </div>
                  <div className="connection-item-actions">
                    <button
                      className="connection-item-action edit"
                      onClick={(e) => handleEditConfig(e, config)}
                      title="编辑"
                    >
                      ✏️
                    </button>
                    <button
                      className="connection-item-action copy"
                      onClick={(e) => handleCopyConfig(e, config)}
                      title="复制"
                    >
                      📋
                    </button>
                    <button
                      className="connection-item-action delete"
                      onClick={(e) => handleDeleteConfig(e, config.id)}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Edit Modal */}
      {editingConfig && (
        <ConnectionForm
          onClose={handleFormClose}
          initialConfig={editingConfig}
          onConnect={onConnect}
          mode="edit"
        />
      )}

      {/* Copy Modal */}
      {copyingConfig && (
        <ConnectionForm
          onClose={handleFormClose}
          initialConfig={{ ...copyingConfig, id: '', name: `${copyingConfig.name} (副本)` }}
          onConnect={onConnect}
          mode="copy"
        />
      )}
    </>
  );
}
