/**
 * Theme context — manages light/dark mode, accent color, and theme presets.
 * Applies the resolved theme to CSS variables on :root.
 *
 * @module theme/ThemeContext
 */

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { loadThemeConfig, saveThemeConfig } from '../storage/storage';
import type { ThemeConfig, BaseMode, ThemePreset, CustomTheme } from './types';
import { applyTheme, resolveTheme, defaultThemeConfig } from './apply';

interface ThemeContextValue {
  /** Current theme config (preset, mode, accent) */
  config: ThemeConfig;
  /** Resolved concrete theme */
  resolved: CustomTheme;
  /** Toggle light/dark base mode */
  toggleTheme: () => void;
  /** Set the base mode */
  setMode: (mode: BaseMode) => void;
  /** Set the accent color */
  setAccent: (accent: string) => void;
  /** Toggle whether text-secondary follows the accent color */
  setUseAccentText: (useAccentText: boolean) => void;
  /** Apply a named preset */
  applyPreset: (preset: ThemePreset) => void;
  /** Reset to defaults */
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ThemeConfig>(() => loadThemeConfig());

  const resolved = useMemo(() => resolveTheme(config), [config]);

  useEffect(() => {
    applyTheme(resolved, config.useAccentText);
    saveThemeConfig(config);
  }, [resolved, config]);

  const toggleTheme = useCallback(() => {
    setConfig((prev) => ({ ...prev, mode: prev.mode === 'dark' ? 'light' : 'dark' }));
  }, []);

  const setMode = useCallback((mode: BaseMode) => {
    setConfig((prev) => ({ ...prev, mode }));
  }, []);

  const setAccent = useCallback((accent: string) => {
    setConfig((prev) => ({ ...prev, accent }));
  }, []);

  const setUseAccentText = useCallback((useAccentText: boolean) => {
    setConfig((prev) => ({ ...prev, useAccentText }));
  }, []);

  const applyPreset = useCallback((preset: ThemePreset) => {
    setConfig((prev) => ({ ...prev, preset }));
  }, []);

  const resetTheme = useCallback(() => {
    setConfig(defaultThemeConfig());
  }, []);

  return (
    <ThemeContext.Provider value={{ config, resolved, toggleTheme, setMode, setAccent, setUseAccentText, applyPreset, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
