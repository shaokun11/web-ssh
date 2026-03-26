import { usePreferencesStore } from '../store/preferencesStore';
import { useConnectionStore } from '../store/connectionStore';
import './Header.css';

interface Props {
  onNewConnection: () => void;
}

export function Header({ onNewConnection }: Props) {
  const { theme, toggleTheme } = usePreferencesStore();
  const { isConnected, currentConfig, disconnect } = useConnectionStore();

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <span className="logo-icon">🖥️</span>
          <span className="logo-text">WebSSH</span>
        </div>

        {isConnected && currentConfig && (
          <div className="connection-status">
            <span className="status-dot connected"></span>
            <span className="connection-info">{currentConfig.name}</span>
            <span className="connection-detail">
              {currentConfig.username}@{currentConfig.host}
            </span>
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

        <button className="btn btn-ghost btn-icon" title="设置">
          ⚙️
        </button>

        {isConnected ? (
          <button className="btn btn-danger" onClick={disconnect}>
            断开连接
          </button>
        ) : (
          <button className="btn btn-primary" onClick={onNewConnection}>
            + 新建连接
          </button>
        )}
      </div>
    </header>
  );
}
