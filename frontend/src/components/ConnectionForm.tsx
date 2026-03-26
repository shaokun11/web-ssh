import { useState } from 'react';
import { db, type SSHConfig } from '../db';
import { useConnectionStore } from '../store/connectionStore';
import { generateId } from '../utils/id';
import './ConnectionForm.css';

interface Props {
  onClose: () => void;
}

type AuthMethod = 'key' | 'password';

export function ConnectionForm({ onClose }: Props) {
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('key');
  const [privateKey, setPrivateKey] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setWs, setConnected, setCurrentConfig, addConfig } = useConnectionStore();

  const handleConnect = async () => {
    if (!host || !username || (authMethod === 'key' && !privateKey) || (authMethod === 'password' && !password)) {
      setError('请填写所有必填字段');
      return;
    }

    setLoading(true);
    setError('');

    const config: SSHConfig = {
      id: generateId(),
      name: name || `${username}@${host}`,
      host,
      port: parseInt(port) || 22,
      username,
      privateKey: authMethod === 'key' ? privateKey : '',
      password: authMethod === 'password' ? password : '',
      createdAt: new Date(),
    };

    try {
      // Save to database
      await db.configs.add(config);
      addConfig(config);

      // Connect via WebSocket
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'connect',
          data: {
            host: config.host,
            port: config.port,
            username: config.username,
            privateKey: config.privateKey,
          }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'connected') {
            if ((msg.data as { success: boolean }).success) {
              setWs(ws);
              setConnected(true);
              setCurrentConfig(config);
              setLoading(false);
              onClose();
            } else {
              setError('连接失败');
              setLoading(false);
              ws.close();
            }
          } else if (msg.type === 'error') {
            setError((msg.data as { message: string }).message);
            setLoading(false);
            ws.close();
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        setError('WebSocket 连接失败');
        setLoading(false);
      };
    } catch {
      setError('连接失败');
      setLoading(false);
    }
  };

  const handleLoadFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pem,.key,*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPrivateKey(e.target?.result as string);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">新建 SSH 连接</h3>
            <p className="modal-subtitle">输入服务器信息以建立连接</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              连接名称 <span className="form-optional">(可选)</span>
            </label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="我的服务器"
            />
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label className="form-label">
                主机地址 <span className="form-required">*</span>
              </label>
              <input
                type="text"
                className="input"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.1"
              />
            </div>
            <div className="form-group" style={{ width: '80px' }}>
              <label className="form-label">端口</label>
              <input
                type="text"
                className="input"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                style={{ textAlign: 'center' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              用户名 <span className="form-required">*</span>
            </label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="root"
            />
          </div>

          <div className="form-group">
            <label className="form-label">认证方式</label>
            <div className="auth-tabs">
              <button
                className={`auth-tab ${authMethod === 'key' ? 'active' : ''}`}
                onClick={() => setAuthMethod('key')}
              >
                🔑 私钥
              </button>
              <button
                className={`auth-tab ${authMethod === 'password' ? 'active' : ''}`}
                onClick={() => setAuthMethod('password')}
              >
                🔒 密码
              </button>
            </div>
          </div>

          {authMethod === 'key' ? (
            <div className="form-group">
              <label className="form-label">
                私钥 <span className="form-required">*</span>
              </label>
              <div className="textarea-wrapper">
                <textarea
                  className="textarea"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                  rows={6}
                />
                <button className="textarea-action" onClick={handleLoadFile}>
                  📁 加载文件
                </button>
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">
                密码 <span className="form-required">*</span>
              </label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码"
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
            取消
          </button>
          <button className="btn btn-success" onClick={handleConnect} disabled={loading}>
            {loading ? '连接中...' : '连接'}
          </button>
        </div>
      </div>
    </div>
  );
}
