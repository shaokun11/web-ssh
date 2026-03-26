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
    disconnectSession
  } = useConnectionStore();

  const sessions = getAllSessions();

  const handleTabClick = (sessionId: string) => {
    focusSession(sessionId);
  };

  const handleTabClose = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    disconnectSession(sessionId);
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
            <span className="tab-title">{session.tabName}</span>
            <div className="tab-actions">
              <button
                className="tab-close-btn"
                onClick={(e) => handleTabClose(e, session.id)}
                title="关闭"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="tab-add-btn" onClick={onNewConnection} title="新建连接">
        +
      </button>
    </div>
  );
}
