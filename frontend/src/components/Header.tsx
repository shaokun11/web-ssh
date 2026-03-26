import { useState } from 'react';
import { usePreferencesStore } from '../store/preferencesStore';
import { useConnectionStore } from '../store/connectionStore';
import './Header.css';

interface Props {
  onNewConnection: () => void;
}

export function Header({ onNewConnection }: Props) {
  const { theme, toggleTheme } = usePreferencesStore();
  const { getAllSessions, disconnectAllSessions, getConfig } = useConnectionStore();
  const [showSettings, setShowSettings] = useState(false);

  const sessions = getAllSessions();
  const hasActiveSessions = sessions.length > 0;
  const activeSession = sessions[0]; // Show first session info in header
  const activeConfig = activeSession ? getConfig(activeSession.configId) : null;

  const handleDisconnect = () => {
    disconnectAllSessions();
  };

  return (
    <>
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">🖥️</span>
            <span className="logo-text">WebSSH</span>
          </div>

          {hasActiveSessions && activeConfig && (
            <div className="connection-status">
              <span className="status-dot connected"></span>
              <span className="connection-info">
                {sessions.length > 1 ? `${sessions.length} 个会话` : activeConfig.name}
              </span>
              {sessions.length === 1 && (
                <span className="connection-detail">
                  {activeConfig.username}@{activeConfig.host}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="header-right">
          <button
            className="btn btn-ghost btn-icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? '切换到亮色' : '切换到暗色'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setShowSettings(true)}
            title="设置"
          >
            ⚙️
          </button>

          {hasActiveSessions ? (
            <button className="btn btn-danger" onClick={handleDisconnect}>
              断开全部
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onNewConnection}>
              + 新建连接
            </button>
          )}
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">设置</h3>
              <button className="modal-close" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="settings-group">
                <div className="settings-item">
                  <div className="settings-item-info">
                    <span className="settings-item-label">主题</span>
                    <span className="settings-item-value">
                      {theme === 'dark' ? '暗色' : '亮色'}
                    </span>
                  </div>
                  <button className="btn btn-ghost" onClick={toggleTheme}>
                    {theme === 'dark' ? '☀️ 切换' : '🌙 切换'}
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <h4 className="settings-section-title">关于</h4>
                <div className="settings-about">
                  <p>WebSSH v1.0.0</p>
                  <p className="settings-about-text">
                    基于 xterm.js 的浏览器端 SSH 客户端
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
