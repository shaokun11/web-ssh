import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
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
  const lang = i18n.language;

  // Reset form when initialConfig changes
  // This is a valid pattern for form initialization from props
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
        return lang === 'zh' ? `编辑 ${initialConfig?.name || '配置'}` : `Edit ${initialConfig?.name || 'Config'}`;
      case 'copy':
        return lang === 'zh' ? '复制并新建连接' : 'Copy & New Connection';
      default:
        return lang === 'zh' ? '新建 SSH 连接' : 'New SSH Connection';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'edit':
        return lang === 'zh' ? '修改连接配置' : 'Modify connection settings';
      case 'copy':
        return lang === 'zh' ? '基于现有配置创建新连接' : 'Create new from existing config';
      default:
        return lang === 'zh' ? '输入服务器信息以建立连接' : 'Enter server info to connect';
    }
  };

  const getButtonText = () => {
    if (loading) return lang === 'zh' ? '处理中...' : 'Processing...';
    switch (mode) {
      case 'edit':
        return lang === 'zh' ? '保存' : 'Save';
      case 'copy':
        return lang === 'zh' ? '创建并连接' : 'Create & Connect';
      default:
        return lang === 'zh' ? '连接' : 'Connect';
    }
  };

  const handleSave = async (shouldConnect: boolean = true) => {
    if (!host || !username) {
      setError(lang === 'zh' ? '请填写主机地址和用户名' : 'Host and username are required');
      return;
    }

    if (authMethod === 'key' && !privateKey) {
      setError(lang === 'zh' ? '请填写私钥' : 'Private key is required');
      return;
    }

    if (authMethod === 'password' && !password && shouldConnect) {
      setError(lang === 'zh' ? '请填写密码' : 'Password is required');
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
    } catch (error) {
      // Log the error for debugging
      setError(error instanceof Error ? error.message : (lang === 'zh' ? '操作失败' : 'Operation failed'));
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
              {t('connection.name')} <span className="form-optional">({lang === 'zh' ? '可选' : 'optional'})</span>
            </label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === 'zh' ? '我的服务器' : 'My Server'}
            />
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label className="form-label">
                {t('connection.host')} <span className="form-required">*</span>
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
              <label className="form-label">{t('connection.port')}</label>
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
              {t('connection.username')} <span className="form-required">*</span>
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
            <label className="form-label">{t('connection.authType')}</label>
            <div className="auth-tabs">
              <button
                className={`auth-tab ${authMethod === 'key' ? 'active' : ''}`}
                onClick={() => setAuthMethod('key')}
              >
                🔑 {lang === 'zh' ? '私钥' : 'Key'}
              </button>
              <button
                className={`auth-tab ${authMethod === 'password' ? 'active' : ''}`}
                onClick={() => setAuthMethod('password')}
              >
                🔒 {t('connection.password')}
              </button>
            </div>
          </div>

          {authMethod === 'key' ? (
            <div className="form-group">
              <label className="form-label">
                {t('connection.privateKey')} <span className="form-required">*</span>
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
                  📁 {lang === 'zh' ? '加载文件' : 'Load File'}
                </button>
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">
                {t('connection.password')} <span className="form-required">*</span>
              </label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={lang === 'zh' ? '输入密码' : 'Enter password'}
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
            {t('connection.cancel')}
          </button>
          {mode === 'edit' && (
            <button
              className="btn btn-ghost"
              onClick={() => handleSave(false)}
              disabled={loading}
            >
              {lang === 'zh' ? '仅保存' : 'Save Only'}
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
