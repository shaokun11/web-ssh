import { useEffect, useState } from 'react';
import { db, type CommandHistoryItem } from '../db';
import { useConnectionStore } from '../store/connectionStore';
import { usePreferencesStore } from '../store/preferencesStore';

export function CommandHistory() {
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const { currentConfig, ws, isConnected } = useConnectionStore();
  const { sidebarVisible, toggleSidebar } = usePreferencesStore();

  useEffect(() => {
    if (currentConfig) {
      db.history
        .where('configId')
        .equals(currentConfig.id)
        .reverse()
        .limit(100)
        .toArray()
        .then(setHistory);
    }
  }, [currentConfig]);

  // Track commands
  useEffect(() => {
    if (!ws || !currentConfig) return;

    let buffer = '';
    const originalSend = ws.send.bind(ws);

    ws.send = (data: string) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'input') {
          const input = (msg.data as { input: string }).input;
          buffer += input;

          // Detect Enter key
          if (input === '\r' || input === '\n') {
            const command = buffer.trim();
            if (command && command.length > 0) {
              const historyItem: CommandHistoryItem = {
                id: crypto.randomUUID(),
                configId: currentConfig.id,
                command,
                executedAt: new Date(),
              };
              db.history.add(historyItem);
              setHistory((prev) => [historyItem, ...prev.slice(0, 99)]);
            }
            buffer = '';
          }
        }
      } catch {
        // Ignore parse errors
      }
      originalSend(data);
    };

    return () => {
      ws.send = originalSend;
    };
  }, [ws, currentConfig]);

  const handleClick = (command: string) => {
    if (ws && isConnected) {
      ws.send(JSON.stringify({ type: 'input', data: { input: command + '\r' } }));
    }
  };

  if (!sidebarVisible) {
    return (
      <button
        onClick={toggleSidebar}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-gray-800 dark:bg-gray-700 text-white px-1 py-4 rounded-l text-xs z-10"
      >
        ◀
      </button>
    );
  }

  return (
    <div className="w-64 bg-gray-100 dark:bg-gray-800 border-l dark:border-gray-700 flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b dark:border-gray-700">
        <h3 className="font-medium dark:text-white text-sm">命令历史</h3>
        <button
          onClick={toggleSidebar}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          ▶
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item.command)}
            className="w-full text-left px-2 py-1.5 text-xs font-mono hover:bg-gray-200 dark:hover:bg-gray-700 rounded truncate dark:text-gray-300 block"
            title={item.command}
          >
            {item.command}
          </button>
        ))}
        {history.length === 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
            暂无历史记录
          </p>
        )}
      </div>
    </div>
  );
}
