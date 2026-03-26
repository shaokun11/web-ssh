import { useEffect, useState } from 'react';
import { useConnectionStore } from '../store/connectionStore';
import { db, type SSHConfig } from '../db';
import { ConnectionForm } from './ConnectionForm';
import './ConnectionSidebar.css';

interface Props {
  onConnect: (config: SSHConfig) => void;
}

export function ConnectionSidebar({ onConnect }: Props) {
  const { configs, sessions, activeConfigId, loadConfigs, focusSession } = useConnectionStore();
  const [editingConfig, setEditingConfig] = useState<SSHConfig | null>(null);
  const [copyingConfig, setCopyingConfig] = useState<SSHConfig | null>(null);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // Get active session configs
  const activeConfigs = configs.filter(c => sessions.has(c.id));
  const savedConfigs = configs.filter(c => !sessions.has(c.id));

  const handleSelectConnection = async (config: SSHConfig) => {
    // If already connected, just focus the session
    if (sessions.has(config.id)) {
      focusSession(config.id);
      return;
    }

    // Update last used time
    await db.configs.update(config.id, { lastUsedAt: new Date() });

    // Trigger connection with this config
    onConnect(config);
  };

  const handleDeleteConfig = async (e: React.MouseEvent, configId: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这个连接配置吗？')) {
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

  const handleFormClose = () => {
    setEditingConfig(null);
    setCopyingConfig(null);
    loadConfigs();
  };

  const getSessionStatus = (configId: string) => {
    const session = sessions.get(configId);
    return session?.status || 'disconnected';
  };

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-title">SSH 连接</span>
        </div>

        {/* Active Connections Section */}
        {activeConfigs.length > 0 && (
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="sidebar-section-icon">🔗</span>
              <span className="sidebar-section-title">活动连接</span>
              <span className="sidebar-section-count">{activeConfigs.length}</span>
            </div>
            <div className="connection-list">
              {activeConfigs.map((config) => (
                <div
                  key={config.id}
                  className={`connection-item ${activeConfigId === config.id ? 'active connected' : ''}`}
                  onClick={() => handleSelectConnection(config)}
                >
                  <span className={`status-dot ${getSessionStatus(config.id)}`}></span>
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
          </div>
        )}

        {/* Saved Connections Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span className="sidebar-section-icon">📋</span>
            <span className="sidebar-section-title">已保存</span>
            <span className="sidebar-section-count">{savedConfigs.length}</span>
          </div>

          {savedConfigs.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📡</span>
              <span className="empty-text">暂无保存的连接</span>
              <span className="empty-hint">点击"新建连接"添加服务器</span>
            </div>
          ) : (
            <div className="connection-list">
              {savedConfigs.map((config) => (
                <div
                  key={config.id}
                  className={`connection-item ${activeConfigId === config.id ? 'active' : ''}`}
                  onClick={() => handleSelectConnection(config)}
                >
                  <span className="status-dot disconnected"></span>
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
