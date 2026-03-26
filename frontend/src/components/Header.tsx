import { usePreferencesStore } from '../store/preferencesStore';
import { useConnectionStore } from '../store/connectionStore';

interface Props {
  onNewConnection: () => void;
}

export function Header({ onNewConnection }: Props) {
  const { theme, toggleTheme } = usePreferencesStore();
  const { isConnected, currentConfig, disconnect } = useConnectionStore();

  return (
    <header className="bg-gray-900 dark:bg-gray-950 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold">Web SSH</h1>
        {isConnected && currentConfig && (
          <span className="text-sm text-green-400 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            {currentConfig.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-gray-800 rounded transition-colors"
          title={theme === 'dark' ? '切换到亮色' : '切换到暗色'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {isConnected ? (
          <button
            onClick={disconnect}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-sm transition-colors"
          >
            断开
          </button>
        ) : (
          <button
            onClick={onNewConnection}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors"
          >
            新建连接
          </button>
        )}
      </div>
    </header>
  );
}
