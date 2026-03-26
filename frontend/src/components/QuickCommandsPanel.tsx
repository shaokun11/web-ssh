import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useConnectionStore } from '../store/connectionStore';
import { useHistoryStore } from '../store/historyStore';
import './QuickCommandsPanel.css';

const commandCategories = [
  {
    id: 'files',
    nameKey: 'terminal.fileOperations',
    icon: '📁',
    commands: [
      { cmd: 'ls -la', descKey: 'List all files' },
      { cmd: 'cd /path', descKey: 'Change directory' },
      { cmd: 'cp -r src dest', descKey: 'Copy directory' },
      { cmd: 'mv old new', descKey: 'Move/rename' },
      { cmd: 'rm -rf dir', descKey: 'Delete directory' },
      { cmd: 'find . -name "*.txt"', descKey: 'Find files' },
    ]
  },
  {
    id: 'system',
    nameKey: 'terminal.systemMonitor',
    icon: '📊',
    commands: [
      { cmd: 'top', descKey: 'Process monitor' },
      { cmd: 'htop', descKey: 'Enhanced monitor' },
      { cmd: 'df -h', descKey: 'Disk usage' },
      { cmd: 'du -sh *', descKey: 'Directory size' },
      { cmd: 'free -h', descKey: 'Memory usage' },
      { cmd: 'ps aux | grep xxx', descKey: 'Find process' },
    ]
  },
  {
    id: 'network',
    nameKey: 'terminal.network',
    icon: '🌐',
    commands: [
      { cmd: 'ping google.com', descKey: 'Test connectivity' },
      { cmd: 'curl -I url', descKey: 'Check response' },
      { cmd: 'netstat -tulpn', descKey: 'Port listening' },
      { cmd: 'ss -tulpn', descKey: 'Socket stats' },
      { cmd: 'wget url', descKey: 'Download file' },
      { cmd: 'scp file user@host:/path', descKey: 'Remote copy' },
    ]
  },
  {
    id: 'text',
    nameKey: 'terminal.textProcessing',
    icon: '📝',
    commands: [
      { cmd: 'grep -r "text" .', descKey: 'Search text' },
      { cmd: 'cat file | head -20', descKey: 'View beginning' },
      { cmd: 'tail -f logfile', descKey: 'Real-time log' },
      { cmd: 'sed -i "s/old/new/g" file', descKey: 'Replace text' },
      { cmd: "awk '{print $1}'", descKey: 'Extract field' },
      { cmd: 'sort file | uniq -c', descKey: 'Sort and count' },
    ]
  },
  {
    id: 'permission',
    nameKey: 'terminal.permissions',
    icon: '🔐',
    commands: [
      { cmd: 'chmod 755 file', descKey: 'Change permissions' },
      { cmd: 'chown user:group file', descKey: 'Change owner' },
      { cmd: 'sudo -u user cmd', descKey: 'Run as user' },
      { cmd: 'passwd', descKey: 'Change password' },
      { cmd: 'ssh-keygen -t rsa', descKey: 'Generate key' },
      { cmd: 'ssh-copy-id user@host', descKey: 'Copy public key' },
    ]
  },
  {
    id: 'compress',
    nameKey: 'terminal.compression',
    icon: '📦',
    commands: [
      { cmd: 'tar -czvf out.tar.gz dir', descKey: 'Compress directory' },
      { cmd: 'tar -xzvf file.tar.gz', descKey: 'Extract tar' },
      { cmd: 'zip -r out.zip dir', descKey: 'Create zip' },
      { cmd: 'unzip file.zip', descKey: 'Extract zip' },
      { cmd: 'gzip file', descKey: 'Gzip compress' },
      { cmd: 'gunzip file.gz', descKey: 'Gzip decompress' },
    ]
  },
];

export function QuickCommandsPanel() {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { sessions, configs, activeSessionId } = useConnectionStore();
  const { globalHistory, loadAllHistory, filterConfigId, setFilter, histories } = useHistoryStore();

  // Load history on mount
  useEffect(() => {
    loadAllHistory();
  }, [loadAllHistory]);

  // Get filtered commands based on filterConfigId
  const getFilteredCommands = () => {
    if (filterConfigId === 'all' || filterConfigId === null) {
      return globalHistory.slice(0, 20);
    }
    const filtered = histories.get(filterConfigId) || [];
    return filtered.slice(0, 20);
  };

  const recentCommands = getFilteredCommands();

  const handleCommandClick = (cmd: string) => {
    // Copy to clipboard
    navigator.clipboard.writeText(cmd);

    // Send to currently active session (the selected tab)
    if (activeSessionId) {
      const session = sessions.get(activeSessionId);
      if (session?.status === 'connected' && session?.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'input',
          data: { input: cmd + '\r' }
        }));
      }
    }
  };

  return (
    <aside className={`quick-commands-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="quick-commands-header">
        {!isCollapsed && <span className="quick-commands-title">{t('terminal.quickCommands')}</span>}
        <button
          className="quick-commands-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '◀' : '▶'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="quick-commands-content">
          {/* CLI History Section */}
          <div className="history-section">
            <div className="history-section-header">
              <span className="history-section-icon">📜</span>
              <span className="history-section-title">{t('terminal.commandHistory')}</span>
              {/* Filter Dropdown */}
              <select
                className="history-filter-select"
                value={filterConfigId || 'all'}
                onChange={(e) => setFilter(e.target.value === 'all' ? null : e.target.value)}
                title="Filter history"
              >
                <option value="all">{t('terminal.allServers')}</option>
                {configs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>
            {recentCommands.length === 0 ? (
              <div className="history-empty">{t('terminal.noHistory')}</div>
            ) : (
              <div className="history-list">
                {recentCommands.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="history-item"
                    onClick={() => handleCommandClick(item.command)}
                    title={item.command}
                  >
                    <code className="history-command">{item.command}</code>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Command Categories */}
          <div className="command-categories">
            {commandCategories.map((category) => (
              <div key={category.id} className="command-category">
                <div
                  className={`category-header ${activeCategory === category.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(
                    activeCategory === category.id ? null : category.id
                  )}
                >
                  <span className="category-icon">{category.icon}</span>
                  <span className="category-name">{t(category.nameKey)}</span>
                  <span className="category-toggle">
                    {activeCategory === category.id ? '▼' : '▶'}
                  </span>
                </div>

                {activeCategory === category.id && (
                  <div className="category-commands">
                    {category.commands.map((item, idx) => (
                      <div
                        key={idx}
                        className="command-item"
                        onClick={() => handleCommandClick(item.cmd)}
                        title={item.descKey}
                      >
                        <code className="command-code">{item.cmd}</code>
                        <span className="command-desc">{item.descKey}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
