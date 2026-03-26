import { useEffect } from 'react';
import { useConnectionStore } from '../store/connectionStore';
import { db, type SSHConfig } from '../db';
import './ConnectionSidebar.css';

interface Props {
  onConnect: (config: SSHConfig) => void;
}

export function ConnectionSidebar({ onConnect }: Props) {
  const { currentConfig, isConnected, configs, setConfigs, disconnect } = useConnectionStore();

  useEffect(() => {
    const loadConfigs = async () => {
      const savedConfigs = await db.configs.orderBy('lastUsedAt').reverse().toArray();
      setConfigs(savedConfigs);
    };
    loadConfigs();
  }, [setConfigs]);

  const handleSelectConnection = async (config: SSHConfig) => {
    // Update last used time
    await db.configs.update(config.id, { lastUsedAt: new Date() });

    // If this is already the current config and connected, do nothing
    if (currentConfig?.id === config.id && isConnected) {
      return;
    }

    // Trigger reconnection with this config
    onConnect(config);
  };

  const handleDisconnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    disconnect();
  };

  const handleDeleteConfig = async (e: React.MouseEvent, configId: string) => {
    e.stopPropagation();
    await db.configs.delete(configId);
    setConfigs(configs.filter(c => c.id !== configId));
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">SSH 连接</span>
      </div>

      {/* Disconnect button when connected */}
      {isConnected && currentConfig && (
        <div className="connected-info">
          <div className="connected-status">
            <span className="status-dot connected"></span>
            <span>已连接: {currentConfig.name}</span>
          </div>
          <button className="btn-disconnect" onClick={handleDisconnect}>
            断开连接
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
                className={`connection-item ${currentConfig?.id === config.id ? 'active' : ''}`}
                onClick={() => handleSelectConnection(config)}
              >
                <span className={`status-dot ${currentConfig?.id === config.id && isConnected ? 'connected' : 'disconnected'}`}></span>
                <div className="connection-item-info">
                  <div className="connection-item-name">{config.name}</div>
                  <div className="connection-item-detail">
                    {config.username}@{config.host}:{config.port}
                  </div>
                </div>
                <button
                  className="connection-item-delete"
                  onClick={(e) => handleDeleteConfig(e, config.id)}
                  title="删除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
