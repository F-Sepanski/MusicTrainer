/**
 * Storage layer for MusicTrainer.
 * Uses localStorage to persist wizard config and session history.
 *
 * @module storage/storage
 */

import type { WizardConfig } from '../types/wizard';
import type { SessionResult } from '../types';

const CONFIG_KEY = 'music-trainer:config';
const HISTORY_KEY = 'music-trainer:history';
const THEME_KEY = 'music-trainer:theme';

export interface HistoryEntry extends SessionResult {
  id: number;
  timestamp: number;
  levelName: string;
  clef: 'treble' | 'bass';
  instrument: string;
}

/** Load persisted wizard config, or null if none exists. */
export function loadConfig(): WizardConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as WizardConfig) : null;
  } catch {
    return null;
  }
}

/** Persist wizard config. */
export function saveConfig(config: WizardConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Storage full or unavailable — ignore
  }
}

/** Clear persisted config. */
export function clearConfig(): void {
  try {
    localStorage.removeItem(CONFIG_KEY);
  } catch {
    // ignore
  }
}

/** Load session history (newest first). */
export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

/** Append a session to history, capping at 50 entries. */
export function appendHistory(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): HistoryEntry {
  const history = loadHistory();
  const full: HistoryEntry = { ...entry, id: Date.now(), timestamp: Date.now() };
  const updated = [full, ...history].slice(0, 50);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return full;
}

/** Clear session history. */
export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

import type { ThemeConfig } from '../theme/types';
import { defaultThemeConfig } from '../theme/apply';

/** Load saved theme config. */
export function loadThemeConfig(): ThemeConfig {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ThemeConfig>;
      // Merge with defaults so older saved configs (missing new fields) work.
      return { ...defaultThemeConfig(), ...parsed } as ThemeConfig;
    }
    return defaultThemeConfig();
  } catch {
    return defaultThemeConfig();
  }
}

/** Save theme config. */
export function saveThemeConfig(config: ThemeConfig): void {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}
