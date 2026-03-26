import { useState, useRef } from 'react';
import { usePreferencesStore } from '../store/preferencesStore';
import { useConnectionStore } from '../store/connectionStore';
import './Header.css';

interface Props {
  onNewConnection: () => void;
}

export function Header({ onNewConnection }: Props) {
  const { theme, toggleTheme } = usePreferencesStore();
  const { getAllSessions, disconnectAllSessions, getConfig, exportConfigs, importConfigs, loadConfigs } = useConnectionStore();
  const [showSettings, setShowSettings] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sessions = getAllSessions();
  const hasActiveSessions = sessions.length > 0;
  const activeSession = sessions[0];
  const activeConfig = activeSession ? getConfig(activeSession.configId) : null;

  const handleDisconnect = () => {
    disconnectAllSessions();
  };

  const handleExport = async () => {
    try {
      const jsonData = await exportConfigs();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `webssh-configs-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setImportStatus({ type: 'success', message: '导出成功！' });
      setTimeout(() => setImportStatus(null), 3000);
    } catch (error) {
      setImportStatus({ type: 'error', message: `导出失败: ${error}` });
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await importConfigs(text);
      setImportStatus({
        type: 'success',
        message: `导入完成！新增 ${result.added} 个配置${result.skipped > 0 ? `，跳过 ${result.skipped} 个重复配置` : ''}`
      });
      await loadConfigs();
    } catch (error) {
      setImportStatus({
        type: 'error',
        message: error instanceof Error ? error.message : '导入失败'
      });
    }

    // Reset file input
    e.target.value = '';
    setTimeout(() => setImportStatus(null), 5000);
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

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">设置</h3>
              <button className="modal-close" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Status message */}
              {importStatus && (
                <div className={`import-status ${importStatus.type}`}>
                  {importStatus.message}
                </div>
              )}

              {/* Privacy notice */}
              <div className="settings-section privacy-notice">
                <div className="privacy-icon">🔒</div>
                <div className="privacy-content">
                  <h4>数据本地存储</h4>
                  <p>所有连接配置和命令历史均保存在您的浏览器本地（IndexedDB），不会上传到任何服务器。</p>
                </div>
              </div>

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
                <h4 className="settings-section-title">配置管理</h4>
                <div className="settings-actions">
                  <button className="btn btn-secondary" onClick={handleExport}>
                    📤 导出配置
                  </button>
                  <button className="btn btn-secondary" onClick={handleImport}>
                    📥 导入配置
                  </button>
                </div>
                <p className="settings-hint">
                  导出的配置文件为 JSON 格式，可在其他浏览器或设备导入
                </p>
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
