import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  loaded: boolean;
  loadTheme: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'light',
  loaded: false,

  loadTheme: async () => {
    const saved = await window.api.config.get('theme');
    const theme = (saved === 'dark' ? 'dark' : 'light') as Theme;
    set({ theme, loaded: true });
    applyTheme(theme);
  },

  setTheme: async (theme: Theme) => {
    set({ theme });
    applyTheme(theme);
    await window.api.config.set('theme', theme);
  },
}));

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};
