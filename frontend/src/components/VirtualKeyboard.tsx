// Virtual keyboard component - currently disabled for desktop use
// To re-enable, uncomment all code below

/*
import { useState } from 'react';
import { useConnectionStore } from '../store/connectionStore';
import './VirtualKeyboard.css';

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
  { label: 'Ctrl+L', value: '\x0c' },
];

export function VirtualKeyboard() {
  const { activeSessionId, sessions } = useConnectionStore();
  const [ctrlHeld, setCtrlHeld] = useState(false);
  const [altHeld, setAltHeld] = useState(false);

  // Get active session's WebSocket
  const activeSession = activeSessionId ? sessions.get(activeSessionId) : null;
  const ws = activeSession?.ws || null;
  const isConnected = activeSession?.status === 'connected';

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

  if (!isConnected) return <div className="keyboard keyboard-hidden" />;

  return (
    <div className="keyboard">
      <div className="keyboard-row">
        {basicKeys.map((key) => (
          <button
            key={key.label}
            className="keyboard-key"
            onClick={() => sendKey(key)}
          >
            {key.label}
          </button>
        ))}
        <button
          className={`keyboard-key ${ctrlHeld ? 'keyboard-key-active' : ''}`}
          onClick={() => sendKey({ label: 'Ctrl', value: '', combo: 'ctrl' })}
        >
          Ctrl
        </button>
        <button
          className={`keyboard-key ${altHeld ? 'keyboard-key-active' : ''}`}
          onClick={() => sendKey({ label: 'Alt', value: '', combo: 'alt' })}
        >
          Alt
        </button>
      </div>

      <div className="keyboard-row">
        {arrowKeys.map((key) => (
          <button
            key={key.label}
            className="keyboard-key keyboard-key-arrow"
            onClick={() => sendKey(key)}
          >
            {key.label}
          </button>
        ))}
      </div>

      <div className="keyboard-row">
        {comboKeys.map((key) => (
          <button
            key={key.label}
            className="keyboard-key keyboard-key-combo"
            onClick={() => sendKey(key)}
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  );
}
*/

// Stub component - keyboard hidden
export function VirtualKeyboard() {
  return null;
}
