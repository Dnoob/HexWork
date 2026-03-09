import { useEffect } from 'react';
import { useThemeStore } from '../stores/themeStore';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const loadTheme = useThemeStore(s => s.loadTheme);
  const loaded = useThemeStore(s => s.loaded);

  useEffect(() => {
    if (!loaded) {
      loadTheme();
    }
  }, [loaded, loadTheme]);

  return <>{children}</>;
};
