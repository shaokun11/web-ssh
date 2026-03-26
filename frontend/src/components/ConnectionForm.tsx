import { useState, useEffect } from 'react';
import { db, type SSHConfig } from '../db';
import { useConnectionStore } from '../store/connectionStore';
import { generateId } from '../utils/id';
import './ConnectionForm.css';

interface Props {
  onClose: () => void;
  initialConfig?: SSHConfig | null;
  onConnect: (config: SSHConfig) => void;
  mode?: 'new' | 'edit' | 'copy';
}

export function ConnectionForm({ onClose, initialConfig, onConnect, mode = 'new' }: Props) {
  const [name, setName] = useState(initialConfig?.name || '');
  const [host, setHost] = useState(initialConfig?.host || '');
  const [port, setPort] = useState(String(initialConfig?.port || 22));
  const [username, setUsername] = useState(initialConfig?.username || '');
  const [authMethod, setAuthMethod] = useState<'key' | 'password'>(
    initialConfig?.privateKey ? 'key' : initialConfig?.password ? 'password' : 'key'
  );
  const [privateKey, setPrivateKey] = useState(initialConfig?.privateKey || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { addConfig, loadConfigs } = useConnectionStore();

  // Reset form when initialConfig changes
  useEffect(() => {
    if (initialConfig) {
      setName(initialConfig.name);
      setHost(initialConfig.host);
      setPort(String(initialConfig.port));
      setUsername(initialConfig.username);
      setPrivateKey(initialConfig.privateKey || '');
      setAuthMethod(initialConfig.privateKey ? 'key' : initialConfig.password ? 'password' : 'key');
    }
  }, [initialConfig]);

  const getTitle = () => {
    switch (mode) {
      case 'edit':
        return `编辑 ${initialConfig?.name || '配置'}`;
      case 'copy':
        return '复制并新建连接';
      default:
        return '新建 SSH 连接';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'edit':
        return '修改连接配置';
      case 'copy':
        return '基于现有配置创建新连接';
      default:
        return '输入服务器信息以建立连接';
    }
  };

  const getButtonText = () => {
    if (loading) return '处理中...';
    switch (mode) {
      case 'edit':
        return '保存';
      case 'copy':
        return '创建并连接';
      default:
        return '连接';
    }
  };

  const handleSave = async (shouldConnect: boolean = true) => {
    if (!host || !username) {
      setError('请填写主机地址和用户名');
      return;
    }

    if (authMethod === 'key' && !privateKey) {
      setError('请填写私钥');
      return;
    }

    if (authMethod === 'password' && !password && shouldConnect) {
      setError('请填写密码');
      return;
    }

    setLoading(true);
    setError('');

    const configId = (mode === 'edit' && initialConfig?.id) || generateId();
    const config: SSHConfig = {
      id: configId,
      name: name || `${username}@${host}`,
      host,
      port: parseInt(port) || 22,
      username,
      privateKey: authMethod === 'key' ? privateKey : '',
      password: authMethod === 'password' ? password : '',
      createdAt: initialConfig?.createdAt || new Date(),
      lastUsedAt: new Date(),
    };

    try {
      // Save to database
      if (mode === 'edit' && initialConfig?.id) {
        await db.configs.update(initialConfig.id, config);
      } else {
        await db.configs.add(config);
        addConfig(config);
      }

      // Reload configs
      await loadConfigs();

      if (shouldConnect) {
        // Trigger connection via parent
        onConnect(config);
      }

      setLoading(false);
      onClose();
    } catch (err) {
      setError('操作失败');
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
            <h3 className="modal-title">{getTitle()}</h3>
            <p className="modal-subtitle">{getSubtitle()}</p>
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
          {mode === 'edit' && (
            <button
              className="btn btn-ghost"
              onClick={() => handleSave(false)}
              disabled={loading}
            >
              仅保存
            </button>
          )}
          <button
            className={`btn ${mode === 'edit' ? 'btn-primary' : 'btn-success'}`}
            onClick={() => handleSave(true)}
            disabled={loading}
          >
            {getButtonText()}
          </button>
        </div>
      </div>
    </div>
  );
}
