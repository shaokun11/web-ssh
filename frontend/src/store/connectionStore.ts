import { create } from 'zustand';
import type { SSHConfig } from '../db';

interface ConnectionState {
  isConnected: boolean;
  currentConfig: SSHConfig | null;
  ws: WebSocket | null;

  setConnected: (connected: boolean) => void;
  setCurrentConfig: (config: SSHConfig | null) => void;
  setWs: (ws: WebSocket | null) => void;
  disconnect: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  isConnected: false,
  currentConfig: null,
  ws: null,

  setConnected: (connected) => set({ isConnected: connected }),
  setCurrentConfig: (config) => set({ currentConfig: config }),
  setWs: (ws) => set({ ws }),
  disconnect: () => set((state) => {
    state.ws?.close();
    return { isConnected: false, currentConfig: null, ws: null };
  }),
}));
