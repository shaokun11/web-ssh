import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  theme: 'light' | 'dark';
  fontSize: number;
  sidebarVisible: boolean;
  language: 'zh' | 'en';

  toggleTheme: () => void;
  setFontSize: (size: number) => void;
  toggleSidebar: () => void;
  setLanguage: (lang: 'zh' | 'en') => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'dark',
      fontSize: 14,
      sidebarVisible: true,
      language: 'zh',

      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setFontSize: (size) => set({ fontSize: size }),
      toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
      setLanguage: (lang) => set({ language: lang }),
    }),
    { name: 'web-ssh-preferences' }
  )
);
