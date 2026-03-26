import { useState } from 'react';
import { useConnectionStore } from '../store/connectionStore';

interface KeyButton {
  label: string;
  value: string;
  combo?: 'ctrl' | 'alt';
}

const basicKeys: KeyButton[] = [
  { label: 'Esc', value: '\x1b' },
  { label: 'Tab', value: '\t' },
];

const arrowKeys: KeyButton[] = [
  { label: '↑', value: '\x1b[A' },
  { label: '↓', value: '\x1b[B' },
  { label: '←', value: '\x1b[D' },
  { label: '→', value: '\x1b[C' },
];

const comboKeys: KeyButton[] = [
  { label: 'Ctrl+C', value: '\x03' },
  { label: 'Ctrl+D', value: '\x04' },
  { label: 'Ctrl+Z', value: '\x1a' },
];

export function VirtualKeyboard() {
  const { ws, isConnected } = useConnectionStore();
  const [ctrlHeld, setCtrlHeld] = useState(false);
  const [altHeld, setAltHeld] = useState(false);

  const sendKey = (key: KeyButton) => {
    if (!ws || !isConnected) return;

    let value = key.value;

    if (key.combo === 'ctrl') {
      setCtrlHeld(!ctrlHeld);
      return;
    }
    if (key.combo === 'alt') {
      setAltHeld(!altHeld);
      return;
    }

    if (ctrlHeld && value.length === 1) {
      const code = value.toLowerCase().charCodeAt(0) - 96;
      value = String.fromCharCode(code);
      setCtrlHeld(false);
    }

    if (altHeld) {
      value = '\x1b' + value;
      setAltHeld(false);
    }

    ws.send(JSON.stringify({ type: 'input', data: { input: value } }));
  };

  return (
    <div className="bg-gray-800 dark:bg-gray-900 border-t border-gray-700 p-2 md:hidden">
      <div className="flex flex-wrap gap-1 justify-center">
        {basicKeys.map((key) => (
          <button
            key={key.label}
            onClick={() => sendKey(key)}
            className={`px-3 py-2 rounded text-white text-sm font-medium ${
              (key.combo === 'ctrl' && ctrlHeld) || (key.combo === 'alt' && altHeld)
                ? 'bg-blue-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {key.label}
          </button>
        ))}
        <button
          onClick={() => sendKey({ label: 'Ctrl', value: '', combo: 'ctrl' })}
          className={`px-3 py-2 rounded text-white text-sm font-medium ${
            ctrlHeld ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          Ctrl
        </button>
        <button
          onClick={() => sendKey({ label: 'Alt', value: '', combo: 'alt' })}
          className={`px-3 py-2 rounded text-white text-sm font-medium ${
            altHeld ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          Alt
        </button>
      </div>
      <div className="flex gap-1 justify-center mt-1">
        {arrowKeys.map((key) => (
          <button
            key={key.label}
            onClick={() => sendKey(key)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-lg"
          >
            {key.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1 justify-center mt-1">
        {comboKeys.map((key) => (
          <button
            key={key.label}
            onClick={() => sendKey(key)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm font-medium"
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  );
}
