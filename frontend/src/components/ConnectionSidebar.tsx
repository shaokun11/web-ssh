import { useEffect, useState } from 'react';
import { useConnectionStore } from '../store/connectionStore';
import { db, type SSHConfig } from '../db';
import { ConnectionForm } from './ConnectionForm';
import './ConnectionSidebar.css';

interface Props {
  onConnect: (config: SSHConfig) => void;
}

export function ConnectionSidebar({ onConnect }: Props) {
  const { currentConfig, isConnected, configs, setConfigs, disconnect, ws } = useConnectionStore();
  const [editingConfig, setEditingConfig] = useState<SSHConfig | null>(null);
  const [copyingConfig, setCopyingConfig] = useState<SSHConfig | null>(null);

  useEffect(() => {
    const loadConfigs = async () => {
      const savedConfigs = await db.configs.orderBy('lastUsedAt').reverse().toArray();
      setConfigs(savedConfigs);
    };
    loadConfigs();
  }, [setConfigs]);

  const handleSelectConnection = async (config: SSHConfig) => {
    // If connected and clicking the same config, do nothing
    if (currentConfig?.id === config.id && isConnected) {
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
      setConfigs(configs.filter(c => c.id !== configId));
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

  const handleDisconnect = () => {
    if (ws) {
      ws.close();
    }
    disconnect();
  };

  const handleFormClose = () => {
    setEditingConfig(null);
    setCopyingConfig(null);
    // Reload configs
    db.configs.orderBy('lastUsedAt').reverse().toArray().then(setConfigs);
  };

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-title">SSH 连接</span>
        </div>

        {isConnected && currentConfig && (
          <div className="connected-info">
            <div>
              <span className="connected-label">已连接:</span>
              <span className="connected-name">{currentConfig.name}</span>
            </div>
            <button className="btn-disconnect" onClick={handleDisconnect}>
              断开
            </button>
          </div>
        )}

        <div className="sidebar-content">
          {configs.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📡</span>
              <span className="empty-text">暂无保存的连接</span>
              <span className="empty-hint">点击"新建连接"添加服务器</span>
            </div>
          ) : (
            <div className="connection-list">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className={`connection-item ${currentConfig?.id === config.id && isConnected ? 'active connected' : ''} ${currentConfig?.id === config.id ? 'active' : ''}`}
                  onClick={() => handleSelectConnection(config)}
                >
                  <span className={`status-dot ${currentConfig?.id === config.id && isConnected ? 'connected' : 'disconnected'}`}></span>
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
