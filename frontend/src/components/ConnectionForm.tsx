import { useState } from 'react';
import { db, type SSHConfig } from '../db';
import { useConnectionStore } from '../store/connectionStore';
import { generateId } from '../utils/id';

interface Props {
  onClose: () => void;
}

export function ConnectionForm({ onClose }: Props) {
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setWs, setConnected, setCurrentConfig } = useConnectionStore();

  const handleConnect = async () => {
    if (!host || !username || !privateKey) {
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
      privateKey,
      createdAt: new Date(),
    };

    try {
      // Save to database
      await db.configs.add(config);

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4 dark:text-white">新建连接</h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-3 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-1">
              配置名称（可选）
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="我的服务器"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                主机地址 *
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="192.168.1.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                端口
              </label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-1">
              用户名 *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="root"
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-1">
              私钥 *
            </label>
            <textarea
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-xs h-32 resize-none"
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border rounded dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? '连接中...' : '连接'}
          </button>
        </div>
      </div>
    </div>
  );
}
