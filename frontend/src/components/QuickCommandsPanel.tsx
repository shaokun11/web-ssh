import { useState, useEffect } from 'react';
import { useConnectionStore } from '../store/connectionStore';
import { useHistoryStore } from '../store/historyStore';
import './QuickCommandsPanel.css';

interface QuickCommandsPanelProps {
  onNewConnection: () => void;
}

const commandCategories = [
  {
    id: 'files',
    name: '文件操作',
    icon: '📁',
    commands: [
      { cmd: 'ls -la', desc: '列出所有文件' },
      { cmd: 'cd /path', desc: '切换目录' },
      { cmd: 'cp -r src dest', desc: '复制目录' },
      { cmd: 'mv old new', desc: '移动/重命名' },
      { cmd: 'rm -rf dir', desc: '删除目录' },
      { cmd: 'find . -name "*.txt"', desc: '查找文件' },
    ]
  },
  {
    id: 'system',
    name: '系统监控',
    icon: '📊',
    commands: [
      { cmd: 'top', desc: '进程监控' },
      { cmd: 'htop', desc: '增强监控' },
      { cmd: 'df -h', desc: '磁盘使用' },
      { cmd: 'du -sh *', desc: '目录大小' },
      { cmd: 'free -h', desc: '内存使用' },
      { cmd: 'ps aux | grep xxx', desc: '查找进程' },
    ]
  },
  {
    id: 'network',
    name: '网络相关',
    icon: '🌐',
    commands: [
      { cmd: 'ping google.com', desc: '测试连通' },
      { cmd: 'curl -I url', desc: '检查响应' },
      { cmd: 'netstat -tulpn', desc: '端口监听' },
      { cmd: 'ss -tulpn', desc: 'Socket统计' },
      { cmd: 'wget url', desc: '下载文件' },
      { cmd: 'scp file user@host:/path', desc: '远程复制' },
    ]
  },
  {
    id: 'text',
    name: '文本处理',
    icon: '📝',
    commands: [
      { cmd: 'grep -r "text" .', desc: '搜索文本' },
      { cmd: 'cat file | head -20', desc: '查看开头' },
      { cmd: 'tail -f logfile', desc: '实时日志' },
      { cmd: 'sed -i "s/old/new/g" file', desc: '替换文本' },
      { cmd: "awk '{print $1}'", desc: '提取字段' },
      { cmd: 'sort file | uniq -c', desc: '排序统计' },
    ]
  },
  {
    id: 'permission',
    name: '权限管理',
    icon: '🔐',
    commands: [
      { cmd: 'chmod 755 file', desc: '修改权限' },
      { cmd: 'chown user:group file', desc: '修改所有者' },
      { cmd: 'sudo -u user cmd', desc: '以用户执行' },
      { cmd: 'passwd', desc: '修改密码' },
      { cmd: 'ssh-keygen -t rsa', desc: '生成密钥' },
      { cmd: 'ssh-copy-id user@host', desc: '复制公钥' },
    ]
  },
  {
    id: 'compress',
    name: '压缩解压',
    icon: '📦',
    commands: [
      { cmd: 'tar -czvf out.tar.gz dir', desc: '压缩目录' },
      { cmd: 'tar -xzvf file.tar.gz', desc: '解压tar' },
      { cmd: 'zip -r out.zip dir', desc: '创建zip' },
      { cmd: 'unzip file.zip', desc: '解压zip' },
      { cmd: 'gzip file', desc: 'gzip压缩' },
      { cmd: 'gunzip file.gz', desc: 'gzip解压' },
    ]
  },
];

export function QuickCommandsPanel({ onNewConnection }: QuickCommandsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { getAllSessions, sessions, configs } = useConnectionStore();
  const { globalHistory, loadAllHistory, filterConfigId, setFilter, histories } = useHistoryStore();

  const hasActiveSession = getAllSessions().length > 0;

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

    // If there's an active session, also send the command
    const activeSessionId = [...sessions.keys()].find(
      id => sessions.get(id)?.status === 'connected'
    );

    if (activeSessionId) {
      const session = sessions.get(activeSessionId);
      if (session?.ws && session.ws.readyState === WebSocket.OPEN) {
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
        {!isCollapsed && <span className="quick-commands-title">快捷命令</span>}
        <button
          className="quick-commands-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? '展开' : '收起'}
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
              <span className="history-section-title">命令历史</span>
              {/* Filter Dropdown */}
              <select
                className="history-filter-select"
                value={filterConfigId || 'all'}
                onChange={(e) => setFilter(e.target.value === 'all' ? null : e.target.value)}
                title="筛选历史记录"
              >
                <option value="all">全部服务器</option>
                {configs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>
            {recentCommands.length === 0 ? (
              <div className="history-empty">暂无历史记录</div>
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

          {!hasActiveSession && (
            <div className="no-session-hint">
              <span className="hint-icon">💡</span>
              <span className="hint-text">连接服务器后点击命令可直接执行</span>
              <button className="btn btn-sm btn-primary" onClick={onNewConnection}>
                新建连接
              </button>
            </div>
          )}

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
                  <span className="category-name">{category.name}</span>
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
                        title={item.desc}
                      >
                        <code className="command-code">{item.cmd}</code>
                        <span className="command-desc">{item.desc}</span>
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
