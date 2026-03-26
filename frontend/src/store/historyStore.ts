import { create } from 'zustand';
import type { CommandHistoryItem } from '../db';
import { db } from '../db';

interface HistoryState {
  // histories stored per config
  histories: Map<string, CommandHistoryItem[]>;
  loadedConfigs: Set<string>;

  // Load history for a specific config
  loadHistory: (configId: string) => Promise<void>;

  // Add a command to history
  addCommand: (configId: string, command: string) => Promise<void>;

  // Search history for autocomplete
  searchHistory: (configId: string, prefix: string) => string[];

  // Get recent commands for a config
  getRecentCommands: (configId: string, limit?: number) => CommandHistoryItem[];

  // Clear history for a config
  clearHistory: (configId: string) => Promise<void>;

  // Get history for current config
  getCurrentHistory: (configId: string) => CommandHistoryItem[];
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  histories: new Map(),
  loadedConfigs: new Set(),

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

    // Check for duplicates within 60 seconds
    const { histories } = get();
    const history = histories.get(configId) || [];
    const now = new Date();
    const recentDuplicate = history.find(item => {
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

    // Update local state
    set((state) => {
      const newHistories = new Map(state.histories);
      const existingHistory = newHistories.get(configId) || [];
      newHistories.set(configId, [newItem, ...existingHistory]);
      return { histories: newHistories };
    });
  },

  searchHistory: (configId: string, prefix: string) => {
    const { histories } = get();
    const history = histories.get(configId) || [];

    if (!prefix.trim()) return [];

    const lowerPrefix = prefix.toLowerCase();
    const matches = history
      .filter(item => item.command.toLowerCase().startsWith(lowerPrefix))
      .slice(0, 5)
      .map(item => item.command);

    // Remove duplicates while preserving order
    return [...new Set(matches)];
  },

  getRecentCommands: (configId: string, limit: number = 50) => {
    const { histories } = get();
    const history = histories.get(configId) || [];
    return history.slice(0, limit);
  },

  clearHistory: async (configId: string) => {
    await db.history.where('configId').equals(configId).delete();

    set((state) => {
      const newHistories = new Map(state.histories);
      newHistories.delete(configId);
      return { histories: newHistories };
    });
  },

  getCurrentHistory: (configId: string) => {
    const { histories } = get();
    return histories.get(configId) || [];
  },
}));
