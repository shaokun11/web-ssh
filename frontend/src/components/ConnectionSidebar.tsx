import { useEffect } from 'react';
import { useConnectionStore } from '../store/connectionStore';
import { db } from '../db';
import './ConnectionSidebar.css';

interface Props {
  onNewConnection: () => void;
}

export function ConnectionSidebar({ onNewConnection }: Props) {
  const { currentConfig, setCurrentConfig, configs, setConfigs, isConnected } = useConnectionStore();

  useEffect(() => {
    const loadConfigs = async () => {
      const savedConfigs = await db.configs.orderBy('lastUsedAt').reverse().toArray();
      setConfigs(savedConfigs);
    };
    loadConfigs();
  }, [setConfigs]);

  const handleSelectConnection = async (configId: string) => {
    const config = configs.find(c => c.id === configId);
    if (config) {
      setCurrentConfig(config);
      await db.configs.update(configId, { lastUsedAt: new Date() });
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button className="btn btn-success w-full" onClick={onNewConnection}>
          + 新建连接
        </button>
      </div>

      <div className="sidebar-content">
        <div className="sidebar-section">
          <div className="sidebar-section-title">连接列表</div>
          {configs.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📡</span>
              <span className="empty-text">暂无保存的连接</span>
            </div>
          ) : (
            <div className="connection-list">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className={`connection-item ${currentConfig?.id === config.id ? 'active' : ''}`}
                  onClick={() => handleSelectConnection(config.id)}
                >
                  <span className={`status-dot ${currentConfig?.id === config.id && isConnected ? 'connected' : 'disconnected'}`}></span>
                  <div className="connection-item-info">
                    <div className="connection-item-name">{config.name}</div>
                    <div className="connection-item-detail">
                      {config.username}@{config.host}:{config.port}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
