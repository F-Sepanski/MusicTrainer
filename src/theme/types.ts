/**
 * Theme types — dynamic theme configuration with presets.
 *
 * @module theme/types
 */

/** Base mode: light or dark. */
export type BaseMode = 'light' | 'dark';

/** Sentinel value meaning "use the selected theme's own accent". */
export const ACCENT_AUTO = 'auto';

/** Named theme presets. */
export type ThemePreset =
  | 'everforest-dark'
  | 'everforest-light'
  | 'gruvbox-dark'
  | 'gruvbox-light'
  | 'material-dark'
  | 'material-light'
  | 'solarized-dark'
  | 'solarized-light'
  | 'nord-dark'
  | 'tokyo-night'
  | 'dracula'
  | 'rose-pine'
  | 'catppuccin'
  | 'one-dark'
  | 'github-light'
  | 'paper'
  | 'ayu-light'
  | 'nord-light';

/** A complete custom theme definition. */
export interface CustomTheme {
  /** Base mode */
  mode: BaseMode;
  /** Accent color (hex) used for highlights/buttons */
  accent: string;
  /** Secondary accent color */
  accentSecondary?: string;
  /** Background tones */
  bg: { base: string; elevated: string; subtle: string; muted: string };
  /** Text colors */
  text: { primary: string; secondary: string; muted: string };
  /** Border color */
  border: string;
  /** Success / error / warning */
  success?: string;
  error?: string;
  warning?: string;
}

/** User's theme preference. */
export interface ThemeConfig {
  /** Preset id, or 'custom' */
  preset: ThemePreset | 'custom';
  /** Base light/dark mode (for custom or to override preset) */
  mode: BaseMode;
  /** Custom accent color */
  accent: string;
  /** Whether it's a fully custom theme */
  isCustom: boolean;
  /**
   * When true, --text-secondary is derived from the accent color
   * (changes together with accent / uses the accent of the chosen theme).
   */
  useAccentText: boolean;
}
