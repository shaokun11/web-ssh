import { create } from 'zustand';
import type { SSHConfig } from '../db';
import { db } from '../db';

// Active session state
export interface ActiveSession {
  configId: string;
  ws: WebSocket | null;
  terminalBuffer: string;
  tabName: string;
  connectedAt: Date;
  status: 'connecting' | 'connected' | 'disconnected';
}

interface ConnectionState {
  // Saved configurations
  configs: SSHConfig[];

  // Active sessions (configId -> session)
  sessions: Map<string, ActiveSession>;
  activeConfigId: string | null;

  // Legacy compatibility
  get isConnected(): boolean;
  get currentConfig(): SSHConfig | null;
  get ws(): WebSocket | null;

  // Session actions
  connect: (config: SSHConfig) => WebSocket;
  disconnect: (configId?: string) => void;
  disconnectAll: () => void;
  focusSession: (configId: string) => void;
  updateSessionStatus: (configId: string, status: ActiveSession['status']) => void;
  updateSessionWs: (configId: string, ws: WebSocket | null) => void;
  renameTab: (configId: string, name: string) => void;
  duplicateSession: (configId: string) => Promise<WebSocket | null>;

  // Config actions
  loadConfigs: () => Promise<void>;
  addConfig: (config: SSHConfig) => void;
  setConfigs: (configs: SSHConfig[]) => void;
  removeConfig: (id: string) => void;

  // Getters
  getActiveSessions: () => ActiveSession[];
  getSession: (configId: string) => ActiveSession | undefined;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  configs: [],
  sessions: new Map(),
  activeConfigId: null,

  // Legacy compatibility getters
  get isConnected() {
    const { sessions, activeConfigId } = get();
    if (!activeConfigId) return false;
    const session = sessions.get(activeConfigId);
    return session?.status === 'connected';
  },

  get currentConfig() {
    const { configs, activeConfigId } = get();
    if (!activeConfigId) return null;
    return configs.find(c => c.id === activeConfigId) || null;
  },

  get ws() {
    const { sessions, activeConfigId } = get();
    if (!activeConfigId) return null;
    return sessions.get(activeConfigId)?.ws || null;
  },

  // Create new connection
  connect: (config: SSHConfig) => {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';

    // Create session
    const session: ActiveSession = {
      configId: config.id,
      ws,
      terminalBuffer: '',
      tabName: config.name,
      connectedAt: new Date(),
      status: 'connecting',
    };

    set((state) => {
      const newSessions = new Map(state.sessions);
      newSessions.set(config.id, session);
      return { sessions: newSessions, activeConfigId: config.id };
    });

    return ws;
  },

  // Disconnect a specific session or current session
  disconnect: (configId?: string) => {
    const targetId = configId || get().activeConfigId;
    if (!targetId) return;

    const session = get().sessions.get(targetId);
    if (session?.ws) {
      session.ws.close();
    }

    set((state) => {
      const newSessions = new Map(state.sessions);
      newSessions.delete(targetId);
      const newActiveId = state.activeConfigId === targetId
        ? (newSessions.size > 0 ? [...newSessions.keys()][0] : null)
        : state.activeConfigId;
      return { sessions: newSessions, activeConfigId: newActiveId };
    });
  },

  // Disconnect all sessions
  disconnectAll: () => {
    const { sessions } = get();
    sessions.forEach((session) => {
      if (session.ws) {
        session.ws.close();
      }
    });
    set({ sessions: new Map(), activeConfigId: null });
  },

  // Focus a specific session
  focusSession: (configId: string) => {
    const { sessions } = get();
    if (sessions.has(configId)) {
      set({ activeConfigId: configId });
    }
  },

  // Update session status
  updateSessionStatus: (configId: string, status: ActiveSession['status']) => {
    set((state) => {
      const session = state.sessions.get(configId);
      if (!session) return state;

      const newSessions = new Map(state.sessions);
      newSessions.set(configId, { ...session, status });
      return { sessions: newSessions };
    });
  },

  // Update session WebSocket
  updateSessionWs: (configId: string, ws: WebSocket | null) => {
    set((state) => {
      const session = state.sessions.get(configId);
      if (!session) return state;

      const newSessions = new Map(state.sessions);
      newSessions.set(configId, { ...session, ws });
      return { sessions: newSessions };
    });
  },

  // Rename tab
  renameTab: (configId: string, name: string) => {
    set((state) => {
      const session = state.sessions.get(configId);
      if (!session) return state;

      const newSessions = new Map(state.sessions);
      newSessions.set(configId, { ...session, tabName: name });
      return { sessions: newSessions };
    });
  },

  // Duplicate session (create new connection with same config)
  duplicateSession: async (configId: string) => {
    const { configs, sessions } = get();
    const config = configs.find(c => c.id === configId);
    if (!config) return null;

    // Check if already connected
    if (sessions.has(configId)) {
      // Create new config with timestamp
      const newConfig: SSHConfig = {
        ...config,
        id: `${config.id}-${Date.now()}`,
        name: `${config.name} (${new Date().toLocaleTimeString()})`,
        createdAt: new Date(),
      };

      // Add to saved configs temporarily
      set((state) => ({
        configs: [newConfig, ...state.configs]
      }));

      // Connect with new config
      const { connect } = get();
      return connect(newConfig);
    }

    return null;
  },

  // Load configs from IndexedDB
  loadConfigs: async () => {
    const configs = await db.configs.orderBy('lastUsedAt').reverse().toArray();
    set({ configs });
  },

  // Add new config
  addConfig: (config: SSHConfig) => set((state) => {
    const exists = state.configs.some(c => c.id === config.id);
    if (exists) return state;
    return { configs: [config, ...state.configs] };
  }),

  // Set configs
  setConfigs: (configs: SSHConfig[]) => set({ configs }),

  // Remove config
  removeConfig: async (id: string) => {
    await db.configs.delete(id);
    set((state) => ({
      configs: state.configs.filter(c => c.id !== id)
    }));
  },

  // Get all active sessions
  getActiveSessions: () => {
    return Array.from(get().sessions.values());
  },

  // Get specific session
  getSession: (configId: string) => {
    return get().sessions.get(configId);
  },
}));
