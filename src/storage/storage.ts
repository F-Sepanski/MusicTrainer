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
const PROGRESS_KEY = 'music-trainer:progress';
const LAST_EXERCISE_KEY = 'music-trainer:last-exercise';

/** Version of the curriculum data model. Bump to reset stale progress. */
const CURRICULUM_VERSION = 4;
const PROGRESS_VERSION_KEY = 'music-trainer:progress-version';

/** Persisted progress: maps exercise id -> highest difficulty passed. */
export type ChapterProgress = Record<string, 'easy' | 'medium' | 'hard'>;

/** Difficulty ordering (index = rank). */
export const DIFFICULTY_RANK = ['easy', 'medium', 'hard'] as const;
export type DifficultyRank = (typeof DIFFICULTY_RANK)[number];

/** Remembers the last exercise the user was training. */
export interface LastExercise {
  chapterId: string;
  exerciseId: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

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

/** Load chapter progress (exercise id -> highest difficulty passed). */
export function loadProgress(): ChapterProgress {
  try {
    const version = localStorage.getItem(PROGRESS_VERSION_KEY);
    if (version !== String(CURRICULUM_VERSION)) {
      // Curriculum model changed — discard stale progress and mark version.
      localStorage.removeItem(PROGRESS_KEY);
      localStorage.removeItem(LAST_EXERCISE_KEY);
      localStorage.setItem(PROGRESS_VERSION_KEY, String(CURRICULUM_VERSION));
      return {};
    }
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as ChapterProgress) : {};
  } catch {
    return {};
  }
}

/** Save chapter progress. */
export function saveProgress(progress: ChapterProgress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

/** Mark an exercise as passed at a given difficulty, keeping the max. */
export function markExercisePassed(exerciseId: string, difficulty: 'easy' | 'medium' | 'hard'): void {
  const progress = loadProgress();
  const current = progress[exerciseId];
  // Only upgrade when the new difficulty rank is greater than the stored one.
  if (!current || DIFFICULTY_RANK.indexOf(difficulty) > DIFFICULTY_RANK.indexOf(current)) {
    progress[exerciseId] = difficulty;
    saveProgress(progress);
  }
}

/** Highest difficulty passed for an exercise, or null if none. */
export function getExerciseDifficulty(progress: ChapterProgress, exerciseId: string): 'easy' | 'medium' | 'hard' | null {
  return progress[exerciseId] ?? null;
}

/** Whether an exercise has been completed at any difficulty. */
export function isExerciseComplete(progress: ChapterProgress, exerciseId: string): boolean {
  return !!progress[exerciseId];
}

/** Load the last trained exercise, or null. */
export function loadLastExercise(): LastExercise | null {
  try {
    const raw = localStorage.getItem(LAST_EXERCISE_KEY);
    return raw ? (JSON.parse(raw) as LastExercise) : null;
  } catch {
    return null;
  }
}

/** Persist the last trained exercise. */
export function saveLastExercise(last: LastExercise): void {
  try {
    localStorage.setItem(LAST_EXERCISE_KEY, JSON.stringify(last));
  } catch {
    // ignore
  }
}
