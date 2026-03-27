import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '../store/preferencesStore';
import { useConnectionStore } from '../store/connectionStore';
import './Header.css';

interface Props {
  onNewConnection: () => void;
}

export function Header({ onNewConnection }: Props) {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme, language, setLanguage } = usePreferencesStore();
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

  const handleLanguageChange = () => {
    const newLang = language === 'zh' ? 'en' : 'zh';
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
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
      setImportStatus({ type: 'success', message: t('connection.testSuccess') });
      setTimeout(() => setImportStatus(null), 3000);
    } catch (error) {
      setImportStatus({ type: 'error', message: `${t('connection.connectFailed')}: ${error}` });
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
        message: `Import complete! Added ${result.added} configs${result.skipped > 0 ? `, skipped ${result.skipped} duplicates` : ''}`
      });
      await loadConfigs();
    } catch (error) {
      setImportStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Import failed'
      });
    }

    e.target.value = '';
    setTimeout(() => setImportStatus(null), 5000);
  };

  return (
    <>
      <header className="header">
        <div className="header-left">
          {hasActiveSessions && activeConfig && (
            <div className="connection-status">
              <span className="status-dot connected"></span>
              <span className="connection-info">
                {sessions.length > 1 ? `${sessions.length} ${t('header.sshConnection')}` : activeConfig.name}
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
          {/* Language Switch */}
          <button
            className="btn btn-ghost btn-icon language-switch"
            onClick={handleLanguageChange}
            title={language === 'zh' ? 'Switch to English' : '切换到中文'}
          >
            {language === 'zh' ? '🇨🇳' : '🇺🇸'}
          </button>

          <button
            className="btn btn-ghost btn-icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? '☀️' : '🌙'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setShowSettings(true)}
            title={t('header.settings')}
          >
            ⚙️
          </button>

          {hasActiveSessions ? (
            <button className="btn btn-danger" onClick={handleDisconnect}>
              {t('terminal.disconnectAll')}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onNewConnection}>
              {t('app.newConnection')}
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
              <h3 className="modal-title">{t('preferences.settings')}</h3>
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
                  <h4>{language === 'zh' ? '数据本地存储' : 'Local Data Storage'}</h4>
                  <p>{t('app.privacyNotice')}</p>
                </div>
              </div>

              <div className="settings-group">
                {/* Theme */}
                <div className="settings-item">
                  <div className="settings-item-info">
                    <span className="settings-item-label">{t('preferences.theme')}</span>
                    <span className="settings-item-value">
                      {theme === 'dark' ? t('preferences.dark') : t('preferences.light')}
                    </span>
                  </div>
                  <button className="btn btn-ghost" onClick={toggleTheme}>
                    {theme === 'dark' ? '☀️' : '🌙'}
                  </button>
                </div>

                {/* Language */}
                <div className="settings-item">
                  <div className="settings-item-info">
                    <span className="settings-item-label">{t('preferences.language')}</span>
                    <span className="settings-item-value">
                      {language === 'zh' ? '中文' : 'English'}
                    </span>
                  </div>
                  <button className="btn btn-ghost" onClick={handleLanguageChange}>
                    {language === 'zh' ? '🇺🇸 English' : '🇨🇳 中文'}
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <h4 className="settings-section-title">{language === 'zh' ? '配置管理' : 'Configuration'}</h4>
                <div className="settings-actions">
                  <button className="btn btn-secondary" onClick={handleExport}>
                    📤 {language === 'zh' ? '导出配置' : 'Export'}
                  </button>
                  <button className="btn btn-secondary" onClick={handleImport}>
                    📥 {language === 'zh' ? '导入配置' : 'Import'}
                  </button>
                </div>
                <p className="settings-hint">
                  {language === 'zh'
                    ? '导出的配置文件为 JSON 格式，可在其他浏览器或设备导入'
                    : 'Export configs as JSON, import on other devices'}
                </p>
              </div>

              <div className="settings-section">
                <h4 className="settings-section-title">{language === 'zh' ? '关于' : 'About'}</h4>
                <div className="settings-about">
                  <p>WebSSH v1.0.0</p>
                  <p className="settings-about-text">
                    {language === 'zh'
                      ? '基于 xterm.js 的浏览器端 SSH 客户端'
                      : 'Browser-based SSH client powered by xterm.js'}
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
