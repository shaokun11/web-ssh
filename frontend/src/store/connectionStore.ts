import { create } from 'zustand';
import type { SSHConfig } from '../db';
import { db } from '../db';

// Generate unique session ID
const generateSessionId = () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Active session state
export interface ActiveSession {
  id: string;              // Unique session ID
  configId: string;        // Reference to SSHConfig.id
  ws: WebSocket | null;
  tabName: string;
  connectedAt: Date;
  status: 'connecting' | 'connected' | 'disconnected';
}

interface ConnectionState {
  // Saved configurations
  configs: SSHConfig[];

  // Active sessions (sessionId -> session)
  sessions: Map<string, ActiveSession>;

  // Track sessions per config (configId -> sessionIds[])
  sessionsByConfig: Map<string, string[]>;

  // Currently active session
  activeSessionId: string | null;

  // Session actions
  createSession: (config: SSHConfig) => { sessionId: string; ws: WebSocket };
  disconnectSession: (sessionId?: string) => void;
  disconnectAllSessions: () => void;
  focusSession: (sessionId: string) => void;
  updateSessionStatus: (sessionId: string, status: ActiveSession['status']) => void;
  updateSessionWs: (sessionId: string, ws: WebSocket | null) => void;
  renameSession: (sessionId: string, name: string) => void;

  // Config actions
  loadConfigs: () => Promise<void>;
  addConfig: (config: SSHConfig) => void;
  setConfigs: (configs: SSHConfig[]) => void;
  removeConfig: (id: string) => void;

  // Getters
  getActiveSession: () => ActiveSession | null;
  getSession: (sessionId: string) => ActiveSession | undefined;
  getSessionsForConfig: (configId: string) => ActiveSession[];
  getAllSessions: () => ActiveSession[];

  // Get config by ID
  getConfig: (configId: string) => SSHConfig | undefined;

  // Export/Import
  exportConfigs: () => Promise<string>;
  importConfigs: (jsonData: string) => Promise<{ added: number; skipped: number }>;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  configs: [],
  sessions: new Map(),
  sessionsByConfig: new Map(),
  activeSessionId: null,

  // Create new session (allows multiple sessions per config)
  createSession: (config: SSHConfig) => {
    const sessionId = generateSessionId();
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';

    // Create session
    const session: ActiveSession = {
      id: sessionId,
      configId: config.id,
      ws,
      tabName: config.name,
      connectedAt: new Date(),
      status: 'connecting',
    };

    set((state) => {
      const newSessions = new Map(state.sessions);
      newSessions.set(sessionId, session);

      // Update sessionsByConfig
      const newSessionsByConfig = new Map(state.sessionsByConfig);
      const existing = newSessionsByConfig.get(config.id) || [];
      newSessionsByConfig.set(config.id, [...existing, sessionId]);

      return {
        sessions: newSessions,
        sessionsByConfig: newSessionsByConfig,
        activeSessionId: sessionId
      };
    });

    return { sessionId, ws };
  },

  // Disconnect a specific session
  disconnectSession: (sessionId?: string) => {
    const targetId = sessionId || get().activeSessionId;
    if (!targetId) return;

    const session = get().sessions.get(targetId);
    if (session?.ws) {
      session.ws.close();
    }

    set((state) => {
      const newSessions = new Map(state.sessions);
      const oldSession = newSessions.get(targetId);
      newSessions.delete(targetId);

      // Update sessionsByConfig
      const newSessionsByConfig = new Map(state.sessionsByConfig);
      if (oldSession) {
        const existing = newSessionsByConfig.get(oldSession.configId) || [];
        newSessionsByConfig.set(
          oldSession.configId,
          existing.filter(id => id !== targetId)
        );
      }

      // Update activeSessionId if needed
      const newActiveId = state.activeSessionId === targetId
        ? (newSessions.size > 0 ? [...newSessions.keys()][0] : null)
        : state.activeSessionId;

      return {
        sessions: newSessions,
        sessionsByConfig: newSessionsByConfig,
        activeSessionId: newActiveId
      };
    });
  },

  // Disconnect all sessions
  disconnectAllSessions: () => {
    const { sessions } = get();
    sessions.forEach((session) => {
      if (session.ws) {
        session.ws.close();
      }
    });
    set({
      sessions: new Map(),
      sessionsByConfig: new Map(),
      activeSessionId: null
    });
  },

  // Focus a specific session
  focusSession: (sessionId: string) => {
    const { sessions } = get();
    if (sessions.has(sessionId)) {
      set({ activeSessionId: sessionId });
    }
  },

  // Update session status
  updateSessionStatus: (sessionId: string, status: ActiveSession['status']) => {
    set((state) => {
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      const newSessions = new Map(state.sessions);
      newSessions.set(sessionId, { ...session, status });
      return { sessions: newSessions };
    });
  },

  // Update session WebSocket
  updateSessionWs: (sessionId: string, ws: WebSocket | null) => {
    set((state) => {
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      const newSessions = new Map(state.sessions);
      newSessions.set(sessionId, { ...session, ws });
      return { sessions: newSessions };
    });
  },

  // Rename session tab
  renameSession: (sessionId: string, name: string) => {
    set((state) => {
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      const newSessions = new Map(state.sessions);
      newSessions.set(sessionId, { ...session, tabName: name });
      return { sessions: newSessions };
    });
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

  // Get active session
  getActiveSession: () => {
    const { sessions, activeSessionId } = get();
    if (!activeSessionId) return null;
    return sessions.get(activeSessionId) || null;
  },

  // Get specific session
  getSession: (sessionId: string) => {
    return get().sessions.get(sessionId);
  },

  // Get all sessions for a config
  getSessionsForConfig: (configId: string) => {
    const { sessions, sessionsByConfig } = get();
    const sessionIds = sessionsByConfig.get(configId) || [];
    return sessionIds
      .map(id => sessions.get(id))
      .filter((s): s is ActiveSession => s !== undefined);
  },

  // Get all sessions
  getAllSessions: () => {
    return Array.from(get().sessions.values());
  },

  // Get config by ID
  getConfig: (configId: string) => {
    return get().configs.find(c => c.id === configId);
  },

  // Export all configs to JSON
  exportConfigs: async () => {
    const allConfigs = await db.configs.toArray();
    // Remove sensitive data for export (optional - can keep if user wants)
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      configs: allConfigs.map(c => ({
        id: c.id,
        name: c.name,
        host: c.host,
        port: c.port,
        username: c.username,
        privateKey: c.privateKey,
        // Don't export password by default for security
        createdAt: c.createdAt,
        lastUsedAt: c.lastUsedAt,
      }))
    };
    return JSON.stringify(exportData, null, 2);
  },

  // Import configs from JSON
  importConfigs: async (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);

      // Validate format
      if (!data.configs || !Array.isArray(data.configs)) {
        throw new Error('Invalid format: missing configs array');
      }

      let added = 0;
      let skipped = 0;

      for (const config of data.configs) {
        // Check if config already exists (by host+username)
        const exists = await db.configs
          .where('host')
          .equals(config.host)
          .filter(c => c.username === config.username)
          .first();

        if (exists) {
          skipped++;
          continue;
        }

        // Generate new ID to avoid conflicts
        const newConfig = {
          ...config,
          id: crypto.randomUUID ? crypto.randomUUID() : `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          lastUsedAt: undefined,
        };

        await db.configs.add(newConfig);
        added++;
      }

      // Reload configs
      await get().loadConfigs();

      return { added, skipped };
    } catch (error) {
      throw new Error(`导入失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
}));
