/**
 * Theme application — resolves a CustomTheme into CSS variables on :root.
 *
 * @module theme/apply
 */

import type { CustomTheme, ThemeConfig } from './types';
import { ACCENT_AUTO } from './types';
import { PRESET_THEMES, DEFAULT_THEME_CONFIG } from './presets';

/** Resolve a ThemeConfig into a concrete CustomTheme. */
export function resolveTheme(config: ThemeConfig): CustomTheme {
  if (config.preset !== 'custom') {
    const preset = PRESET_THEMES[config.preset];
    if (preset) {
      return {
        ...preset,
        // Override accent only if the user picked a specific color;
        // 'auto' (or empty) keeps the preset's own accent.
        accent: config.accent && config.accent !== ACCENT_AUTO ? config.accent : preset.accent,
      };
    }
  }
  // Custom theme: build from current config (default to everforest dark base)
  const base = config.preset === 'custom' ? buildCustomTheme(config) : PRESET_THEMES['everforest-dark'];
  return base;
}

/** Build a custom theme from user's accent and mode. */
function buildCustomTheme(config: ThemeConfig): CustomTheme {
  const base = PRESET_THEMES[config.mode === 'dark' ? 'material-dark' : 'material-light'];
  return {
    ...base,
    mode: config.mode,
    accent: config.accent && config.accent !== ACCENT_AUTO ? config.accent : base.accent,
  };
}

/** Apply a CustomTheme to the document's CSS variables. */
export function applyTheme(theme: CustomTheme, useAccentText = false): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme.mode === 'dark');

  const s = root.style;

  // Accent (primary + with-opacity variants handled by color-mix in CSS)
  s.setProperty('--accent', theme.accent);
  s.setProperty('--accent-secondary', theme.accentSecondary ?? theme.accent);

  // Backgrounds
  s.setProperty('--bg-surface-900', theme.bg.base);
  s.setProperty('--bg-surface-800', theme.bg.elevated);
  s.setProperty('--bg-surface-700', theme.bg.subtle);
  s.setProperty('--bg-surface-600', theme.bg.muted);

  // Text
  s.setProperty('--text-primary', theme.text.primary);
  // When useAccentText is on, secondary text follows the accent color.
  const textSecondary = useAccentText ? deriveSecondaryText(theme) : theme.text.secondary;
  s.setProperty('--text-secondary', textSecondary);
  s.setProperty('--text-muted', theme.text.muted);

  // Border
  s.setProperty('--border-surface', theme.border);
  // Hover border (lightened toward white/black for adaptive hover state)
  s.setProperty('--border-hover', theme.mode === 'dark' ? mixHex(theme.border, '#ffffff', 0.35) : mixHex(theme.border, '#000000', 0.12));

  // Status
  s.setProperty('--success', theme.success ?? '#10b981');
  s.setProperty('--error', theme.error ?? '#f43f5e');
  s.setProperty('--warning', theme.warning ?? '#fbbf24');

  // Derived: staff line & note colors (contrast with bg)
  const staffLine = theme.mode === 'dark' ? mixHex(theme.text.primary, '#ffffff', 0.35) : '#4b5563';
  const noteDefault = theme.mode === 'dark' ? '#cbd5e1' : '#374151';
  const pianoWhite = theme.mode === 'dark' ? '#f4f5f7' : '#ffffff';
  const pianoBlack = theme.mode === 'dark' ? '#0a0a0f' : '#1a1a26';
  s.setProperty('--staff-line', staffLine);
  s.setProperty('--note-default', noteDefault);
  s.setProperty('--fret-line', theme.mode === 'dark' ? mixHex(theme.bg.muted, '#ffffff', 0.4) : '#c3c9d4');
  s.setProperty('--fret-nut', theme.mode === 'dark' ? mixHex(theme.bg.muted, '#ffffff', 0.6) : '#9aa0aa');
  s.setProperty('--fret-dot', theme.mode === 'dark' ? mixHex(theme.bg.muted, '#ffffff', 0.5) : '#a5abb6');
  s.setProperty('--piano-white', pianoWhite);
  s.setProperty('--piano-black', pianoBlack);
  s.setProperty('--piano-key-text', '#4b5563');
}

/** Lighten/darken a hex color toward white/black. */
function mixHex(color: string, target: string, amount: number): string {
  const c = hexToRgb(color);
  const t = hexToRgb(target);
  const r = Math.round(c.r + (t.r - c.r) * amount);
  const g = Math.round(c.g + (t.g - c.g) * amount);
  const b = Math.round(c.b + (t.b - c.b) * amount);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Derive a readable --text-secondary from the accent color.
 * On dark themes we lighten the accent toward white for contrast;
 * on light themes we darken it toward black.
 */
function deriveSecondaryText(theme: CustomTheme): string {
  if (theme.mode === 'dark') {
    return mixHex(theme.accent, '#ffffff', 0.45);
  }
  return mixHex(theme.accent, '#000000', 0.45);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/** Default ThemeConfig used before any customization. */
export function defaultThemeConfig(): ThemeConfig {
  return { ...DEFAULT_THEME_CONFIG };
}
