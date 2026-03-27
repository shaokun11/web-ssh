import { useState, useEffect, useRef, useCallback } from 'react';
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
      { cmd: 'tail -n 100 file', descKey: 'Last 100 lines' },
      { cmd: 'sed -i "s/old/new/g" file', descKey: 'Replace text' },
      { cmd: "awk '{print $1}' file", descKey: 'Extract field' },
      { cmd: 'sort file | uniq -c', descKey: 'Sort and count' },
      { cmd: 'wc -l file', descKey: 'Count lines' },
      { cmd: 'diff file1 file2', descKey: 'Compare files' },
      { cmd: 'xargs -I {} cmd {}', descKey: 'Execute per line' },
      { cmd: 'tr "a-z" "A-Z" < file', descKey: 'Transform case' },
      { cmd: 'cut -d"," -f1 file', descKey: 'Cut by delimiter' },
      { cmd: 'paste file1 file2', descKey: 'Merge files' },
      { cmd: 'comm file1 file2', descKey: 'Compare sorted files' },
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
  {
    id: 'docker',
    nameKey: 'terminal.docker',
    icon: '🐳',
    commands: [
      { cmd: 'docker ps', descKey: 'List running containers' },
      { cmd: 'docker ps -a', descKey: 'List all containers' },
      { cmd: 'docker images', descKey: 'List images' },
      { cmd: 'docker pull image:tag', descKey: 'Pull image' },
      { cmd: 'docker build -t name .', descKey: 'Build image' },
      { cmd: 'docker run -d --name app image', descKey: 'Run container' },
      { cmd: 'docker exec -it container sh', descKey: 'Enter container' },
      { cmd: 'docker logs -f container', descKey: 'View logs' },
      { cmd: 'docker stop container', descKey: 'Stop container' },
      { cmd: 'docker rm container', descKey: 'Remove container' },
      { cmd: 'docker rmi image', descKey: 'Remove image' },
      { cmd: 'docker-compose up -d', descKey: 'Start compose' },
      { cmd: 'docker-compose down', descKey: 'Stop compose' },
      { cmd: 'docker-compose logs -f', descKey: 'Compose logs' },
      { cmd: 'docker system prune -f', descKey: 'Clean up' },
      { cmd: 'docker volume ls', descKey: 'List volumes' },
      { cmd: 'docker network ls', descKey: 'List networks' },
    ]
  },
];

interface QuickCommandsPanelProps {
  className?: string;
}

// Component for copyable command items with long press support
interface CopyableCommandItemProps {
  cmd: string;
  desc: string;
  onCopy: (cmd: string) => void;
  isCopied: boolean;
}

function CopyableCommandItem({ cmd, desc, onCopy, isCopied }: CopyableCommandItemProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startPosRef.current = { x: clientX, y: clientY };

    timerRef.current = setTimeout(() => {
      onCopy(cmd);
    }, 500);
  }, [cmd, onCopy]);

  const handleEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    clearTimer();

    const clientX = 'changedTouches' in e && e.changedTouches[0]
      ? e.changedTouches[0].clientX
      : (e as React.MouseEvent).clientX;
    const clientY = 'changedTouches' in e && e.changedTouches[0]
      ? e.changedTouches[0].clientY
      : (e as React.MouseEvent).clientY;

    if (startPosRef.current) {
      const deltaX = Math.abs(clientX - startPosRef.current.x);
      const deltaY = Math.abs(clientY - startPosRef.current.y);
      if (deltaX < 10 && deltaY < 10) {
        onCopy(cmd);
      }
    }
    startPosRef.current = null;
  }, [cmd, onCopy, clearTimer]);

  const handleMove = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`command-item ${isCopied ? 'copied' : ''}`}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleMove}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchMove={handleMove}
      title={desc}
    >
      <code className="command-code">{cmd}</code>
      <span className="command-desc">{desc}</span>
      {isCopied && <span className="copy-feedback">✓</span>}
    </div>
  );
}

export function QuickCommandsPanel({ className }: QuickCommandsPanelProps) {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const { filterConfigId, setFilter, histories, globalHistory, loadAllHistory } = useHistoryStore();
  const { configs, sessions, activeSessionId } = useConnectionStore();

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

  // Copy command to clipboard and show feedback (for tips)
  const copyCommand = useCallback((cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 1500);
  }, []);

  // Execute command in terminal (for history)
  const executeCommand = useCallback((cmd: string) => {
    if (activeSessionId) {
      const session = sessions.get(activeSessionId);
      if (session?.status === 'connected' && session?.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'input',
          data: { input: cmd + '\r' }
        }));
      }
    }
  }, [activeSessionId, sessions]);

  return (
    <aside className={`quick-commands-panel ${isCollapsed ? 'collapsed' : ''} ${className || ''}`}>
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
                    onClick={() => executeCommand(item.command)}
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
                      <CopyableCommandItem
                        key={idx}
                        cmd={item.cmd}
                        desc={item.descKey}
                        onCopy={copyCommand}
                        isCopied={copiedCmd === item.cmd}
                      />
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
