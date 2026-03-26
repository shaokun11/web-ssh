import { useEffect, useState } from 'react';
import { useConnectionStore } from '../store/connectionStore';
import { db, type SSHConfig } from '../db';
import { ConnectionForm } from './ConnectionForm';
import './ConnectionSidebar.css';

interface Props {
  onConnect: (config: SSHConfig) => void;
}

export function ConnectionSidebar({ onConnect }: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    configs,
    loadConfigs,
  } = useConnectionStore();

  const [editingConfig, setEditingConfig] = useState<SSHConfig | null>(null);
  const [copyingConfig, setCopyingConfig] = useState<SSHConfig | null>(null);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // Handle clicking on a saved config - always creates new connection
  const handleConfigClick = async (config: SSHConfig) => {
    // Update last used time
    await db.configs.update(config.id, { lastUsedAt: new Date() });
    // Always create a new connection
    onConnect(config);
  };

  // Handle double-click - creates new connection
  const handleConfigDoubleClick = async (config: SSHConfig) => {
    await db.configs.update(config.id, { lastUsedAt: new Date() });
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

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <button className="sidebar-toggle" onClick={toggleSidebar} title={isCollapsed ? '展开侧边栏' : '收起侧边栏'}>
          {isCollapsed ? '▶' : '◀'}
        </button>
        {!isCollapsed && (
          <>
            <div className="sidebar-header">
              <span className="sidebar-title">SSH 连接</span>
            </div>

        {/* Saved Connections Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span className="sidebar-section-icon">📋</span>
            <span className="sidebar-section-title">已保存</span>
            <span className="sidebar-section-count">{configs.length}</span>
          </div>

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
                  className="connection-item"
                  onClick={() => handleConfigClick(config)}
                  onDoubleClick={() => handleConfigDoubleClick(config)}
                  title="单击或双击创建新连接"
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
          </>
        )}
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
