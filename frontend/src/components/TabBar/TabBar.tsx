import { useState, useRef, useEffect } from 'react';
import { useConnectionStore } from '../../store/connectionStore';
import './TabBar.css';

interface TabBarProps {
  onNewConnection: () => void;
}

export function TabBar({ onNewConnection }: TabBarProps) {
  const { sessions, activeConfigId, focusSession, disconnect, renameTab, configs, duplicateSession } = useConnectionStore();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleTabClick = (configId: string) => {
    if (editingId !== configId) {
      focusSession(configId);
    }
  };

  const handleTabClose = (e: React.MouseEvent, configId: string) => {
    e.stopPropagation();
    disconnect(configId);
  };

  const handleMenuClick = (e: React.MouseEvent, configId: string) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === configId ? null : configId);
  };

  const handleRename = (configId: string) => {
    const session = sessions.get(configId);
    if (session) {
      setEditingId(configId);
      setEditName(session.tabName);
      setMenuOpenId(null);
    }
  };

  const handleRenameSubmit = (configId: string) => {
    if (editName.trim()) {
      renameTab(configId, editName.trim());
    }
    setEditingId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, configId: string) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(configId);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const handleDuplicate = async (configId: string) => {
    setMenuOpenId(null);
    await duplicateSession(configId);
  };

  const handleCopyConnectionInfo = (configId: string) => {
    const config = configs.find(c => c.id === configId);
    if (config) {
      const info = `${config.username}@${config.host}:${config.port}`;
      navigator.clipboard.writeText(info);
    }
    setMenuOpenId(null);
  };

  const handleReconnect = (configId: string) => {
    // Disconnect current and trigger reconnect
    disconnect(configId);
    setMenuOpenId(null);
    // The parent will handle reconnection through sidebar click
  };

  const sessionArray = Array.from(sessions.entries());

  return (
    <div className="tab-bar">
      <div className="tab-bar-scroll">
        {sessionArray.map(([configId, session]) => (
          <div
            key={configId}
            className={`tab ${activeConfigId === configId ? 'active' : ''} ${session.status}`}
            onClick={() => handleTabClick(configId)}
          >
            <span className="tab-status-dot" data-status={session.status}></span>
            {editingId === configId ? (
              <input
                ref={inputRef}
                type="text"
                className="tab-rename-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleRenameSubmit(configId)}
                onKeyDown={(e) => handleRenameKeyDown(e, configId)}
              />
            ) : (
              <span className="tab-title">{session.tabName}</span>
            )}
            <div className="tab-actions">
              <button
                className="tab-menu-btn"
                onClick={(e) => handleMenuClick(e, configId)}
                title="更多操作"
              >
                ⋮
              </button>
              <button
                className="tab-close-btn"
                onClick={(e) => handleTabClose(e, configId)}
                title="关闭"
              >
                ×
              </button>
            </div>

            {/* Dropdown menu */}
            {menuOpenId === configId && (
              <div className="tab-menu" ref={menuRef}>
                <button onClick={() => handleRename(configId)}>
                  ✏️ 重命名
                </button>
                <button onClick={() => handleDuplicate(configId)}>
                  📋 复制会话
                </button>
                <button onClick={() => handleCopyConnectionInfo(configId)}>
                  🔗 复制连接信息
                </button>
                <button onClick={() => handleReconnect(configId)}>
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
