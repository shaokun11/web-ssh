import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  theme: 'light' | 'dark';
  fontSize: number;
  sidebarVisible: boolean;

  toggleTheme: () => void;
  setFontSize: (size: number) => void;
  toggleSidebar: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'dark',
      fontSize: 14,
      sidebarVisible: true,

      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setFontSize: (size) => set({ fontSize: size }),
      toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
    }),
    { name: 'web-ssh-preferences' }
  )
);
