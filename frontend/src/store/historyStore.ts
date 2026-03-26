import { create } from 'zustand';
import type { CommandHistoryItem } from '../db';
import { db } from '../db';

interface HistoryState {
  // Global history (all commands from all connections)
  globalHistory: CommandHistoryItem[];
  // histories stored per config
  histories: Map<string, CommandHistoryItem[]>;
  loadedConfigs: Set<string>;
  // Filter setting: 'all' = show all, or specific configId
  filterConfigId: string | null;

  // Load all history
  loadAllHistory: () => Promise<void>;

  // Load history for a specific config
  loadHistory: (configId: string) => Promise<void>;

  // Add a command to history
  addCommand: (configId: string, command: string) => Promise<void>;

  // Search history for autocomplete (searches all history)
  searchHistory: (configId: string, prefix: string) => string[];

  // Get recent commands (filtered or all)
  getRecentCommands: (configId: string | null, limit?: number) => CommandHistoryItem[];

  // Clear history for a config
  clearHistory: (configId: string) => Promise<void>;

  // Get history for display (filtered by filterConfigId or all)
  getDisplayHistory: (activeConfigId: string | null) => CommandHistoryItem[];

  // Set filter
  setFilter: (configId: string | null) => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  globalHistory: [],
  histories: new Map(),
  loadedConfigs: new Set(),
  filterConfigId: null,

  loadAllHistory: async () => {
    const items = await db.history.orderBy('executedAt').reverse().toArray();
    set({ globalHistory: items });

    // Also populate per-config maps
    const configMap = new Map<string, CommandHistoryItem[]>();
    for (const item of items) {
      const existing = configMap.get(item.configId) || [];
      configMap.set(item.configId, [...existing, item]);
    }
    set({ histories: configMap, loadedConfigs: new Set(configMap.keys()) });
  },

  loadHistory: async (configId: string) => {
    const { loadedConfigs } = get();
    if (loadedConfigs.has(configId)) return;

    const items = await db.history
      .where('configId')
      .equals(configId)
      .reverse()
      .sortBy('executedAt');

    set((state) => {
      const newHistories = new Map(state.histories);
      newHistories.set(configId, items);
      const newLoaded = new Set(state.loadedConfigs);
      newLoaded.add(configId);
      return { histories: newHistories, loadedConfigs: newLoaded };
    });
  },

  addCommand: async (configId: string, command: string) => {
    // Skip empty commands
    const trimmed = command.trim();
    if (!trimmed) return;

    // Check for duplicates within 60 seconds (in global history)
    const { globalHistory } = get();
    const now = new Date();
    const recentDuplicate = globalHistory.find(item => {
      const age = now.getTime() - new Date(item.executedAt).getTime();
      return item.command === trimmed && age < 60000;
    });
    if (recentDuplicate) return;

    // Create new item
    const newItem: CommandHistoryItem = {
      id: `${configId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      configId,
      command: trimmed,
      executedAt: now,
    };

    // Save to IndexedDB
    await db.history.add(newItem);

    // Update both global and per-config state
    set((state) => {
      const newHistories = new Map(state.histories);
      const existingHistory = newHistories.get(configId) || [];
      newHistories.set(configId, [newItem, ...existingHistory]);
      return {
        globalHistory: [newItem, ...state.globalHistory],
        histories: newHistories
      };
    });
  },

  searchHistory: (_configId: string, prefix: string) => {
    // Search across ALL history for autocomplete
    const { globalHistory } = get();

    if (!prefix.trim()) return [];

    const lowerPrefix = prefix.toLowerCase();
    const matches = globalHistory
      .filter(item => item.command.toLowerCase().startsWith(lowerPrefix))
      .slice(0, 5)
      .map(item => item.command);

    // Remove duplicates while preserving order
    return [...new Set(matches)];
  },

  getRecentCommands: (configId: string | null, limit: number = 50) => {
    const { histories, globalHistory } = get();
    if (configId === null) {
      return globalHistory.slice(0, limit);
    }
    const history = histories.get(configId) || [];
    return history.slice(0, limit);
  },

  clearHistory: async (configId: string) => {
    await db.history.where('configId').equals(configId).delete();

    set((state) => {
      const newHistories = new Map(state.histories);
      newHistories.delete(configId);
      // Also remove from global history
      const newGlobalHistory = state.globalHistory.filter(item => item.configId !== configId);
      return { histories: newHistories, globalHistory: newGlobalHistory };
    });
  },

  getDisplayHistory: (activeConfigId: string | null) => {
    const { filterConfigId, globalHistory, histories } = get();

    // If filter is set to a specific config, show only that
    if (filterConfigId) {
      return histories.get(filterConfigId) || [];
    }

    // If filter is 'all' (null), show all history
    // Note: activeConfigId can be used in the future to highlight current session's commands
    void activeConfigId;
    // Sort by time, most recent first
    return globalHistory.slice(0, 100);
  },

  setFilter: (configId: string | null) => {
    set({ filterConfigId: configId });
  },
}));
