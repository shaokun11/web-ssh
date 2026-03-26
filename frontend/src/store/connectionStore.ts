import { create } from 'zustand';
import type { SSHConfig } from '../db';
import { db } from '../db';

interface ConnectionState {
  isConnected: boolean;
  currentConfig: SSHConfig | null;
  ws: WebSocket | null;
  configs: SSHConfig[];

  setConnected: (connected: boolean) => void;
  setCurrentConfig: (config: SSHConfig | null) => void;
  setWs: (ws: WebSocket | null) => void;
  disconnect: () => void;
  addConfig: (config: SSHConfig) => void;
  loadConfigs: () => Promise<void>;
  setConfigs: (configs: SSHConfig[]) => void;
  removeConfig: (id: string) => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  isConnected: false,
  currentConfig: null,
  ws: null,
  configs: [],

  setConnected: (connected) => set({ isConnected: connected }),
  setCurrentConfig: (config) => set({ currentConfig: config }),
  setWs: (ws) => set({ ws }),

  disconnect: () => {
    const state = get();
    if (state.ws) {
      state.ws.close();
    }
    return set({ isConnected: false, currentConfig: null, ws: null });
  },

  addConfig: (config) => set((state) => {
    // Avoid duplicates
    const exists = state.configs.some(c => c.id === config.id);
    if (exists) return state;
    return { configs: [config, ...state.configs] };
  }),

  loadConfigs: async () => {
    const configs = await db.configs.orderBy('lastUsedAt').reverse().toArray();
    set({ configs });
  },

  setConfigs: (configs) => set({ configs }),

  removeConfig: async (id) => {
    await db.configs.delete(id);
    set((state) => ({
      configs: state.configs.filter(c => c.id !== id)
    }));
  },
}));
