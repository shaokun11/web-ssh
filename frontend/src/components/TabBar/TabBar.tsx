import { useState, useRef, useEffect } from 'react';
import { useConnectionStore, type ActiveSession } from '../../store/connectionStore';
import './TabBar.css';

interface TabBarProps {
  onNewConnection: () => void;
}

export function TabBar({ onNewConnection }: TabBarProps) {
  const {
    getAllSessions,
    activeSessionId,
    focusSession,
    disconnectSession,
    renameSession,
    createSession,
    configs
  } = useConnectionStore();

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sessions = getAllSessions();

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when editing
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleTabClick = (sessionId: string) => {
    if (editingId !== sessionId) {
      focusSession(sessionId);
    }
  };

  const handleTabClose = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    disconnectSession(sessionId);
  };

  const handleMenuClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === sessionId ? null : sessionId);
  };

  const handleRename = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setEditingId(sessionId);
      setEditName(session.tabName);
      setMenuOpenId(null);
    }
  };

  const handleRenameSubmit = (sessionId: string) => {
    if (editName.trim()) {
      renameSession(sessionId, editName.trim());
    }
    setEditingId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, sessionId: string) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(sessionId);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const handleDuplicate = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      const config = configs.find(c => c.id === session.configId);
      if (config) {
        // Create new session with same config
        createSession(config);
      }
    }
    setMenuOpenId(null);
  };

  const handleCopyConnectionInfo = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      const config = configs.find(c => c.id === session.configId);
      if (config) {
        const info = `${config.username}@${config.host}:${config.port}`;
        navigator.clipboard.writeText(info);
      }
    }
    setMenuOpenId(null);
  };

  const handleReconnect = (sessionId: string) => {
    // Disconnect current and trigger reconnect
    disconnectSession(sessionId);
    setMenuOpenId(null);
    // The parent will handle reconnection through sidebar click
  };

  const getStatusDot = (status: ActiveSession['status']) => {
    switch (status) {
      case 'connected':
        return '●';
      case 'connecting':
        return '◐';
      case 'disconnected':
        return '○';
      default:
        return '○';
    }
  };

  const getStatusClass = (status: ActiveSession['status']) => {
    return `status-${status}`;
  };

  // Sort sessions by connection time (most recent first)
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime()
  );

  return (
    <div className="tab-bar">
      <div className="tab-bar-scroll">
        {sortedSessions.map((session) => (
          <div
            key={session.id}
            className={`tab ${activeSessionId === session.id ? 'active' : ''} ${getStatusClass(session.status)}`}
            onClick={() => handleTabClick(session.id)}
          >
            <span className={`tab-status-dot ${getStatusClass(session.status)}`}>
              {getStatusDot(session.status)}
            </span>
            {editingId === session.id ? (
              <input
                ref={inputRef}
                type="text"
                className="tab-rename-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleRenameSubmit(session.id)}
                onKeyDown={(e) => handleRenameKeyDown(e, session.id)}
              />
            ) : (
              <span className="tab-title">{session.tabName}</span>
            )}
            <div className="tab-actions">
              <button
                className="tab-menu-btn"
                onClick={(e) => handleMenuClick(e, session.id)}
                title="更多操作"
              >
                ⋮
              </button>
              <button
                className="tab-close-btn"
                onClick={(e) => handleTabClose(e, session.id)}
                title="关闭"
              >
                ×
              </button>
            </div>

            {/* Dropdown menu */}
            {menuOpenId === session.id && (
              <div className="tab-menu" ref={menuRef}>
                <button onClick={() => handleRename(session.id)}>
                  ✏️ 重命名
                </button>
                <button onClick={() => handleDuplicate(session.id)}>
                  📋 复制会话
                </button>
                <button onClick={() => handleCopyConnectionInfo(session.id)}>
                  🔗 复制连接信息
                </button>
                <button onClick={() => handleReconnect(session.id)}>
                  🔄 重新连接
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="tab-add-btn" onClick={onNewConnection} title="新建连接">
        +
      </button>
    </div>
  );
}
