/**
 * ThemeSettings — theme picker categorized by light/dark, accent color,
 * and a toggle to make text-secondary follow the accent.
 * Reusable in the wizard and the home screen.
 *
 * @module components/ThemeSettings
 */

import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeContext';
import { PRESET_LIST, PRESET_NAMES, PRESET_THEMES } from '../theme/presets';
import { ACCENT_AUTO, UI_FONTS } from '../theme/types';
import type { ThemePreset } from '../theme/types';

const ACCENT_PRESETS = ['#00f2fe', '#10b981', '#8b5cf6', '#f43f5e', '#fbbf24', '#ef4444', '#22c55e', '#3b82f6', '#e879f9', '#f97316'];

export function ThemeSettings() {
  const { config, resolved, setAccent, setUseAccentText, applyPreset, setFont } = useTheme();

  const darkPresets = PRESET_LIST.filter((p) => PRESET_THEMES[p].mode === 'dark');
  const lightPresets = PRESET_LIST.filter((p) => PRESET_THEMES[p].mode === 'light');
  const isAuto = config.accent === ACCENT_AUTO || !config.accent;

  return (
    <div className="flex flex-col gap-5">
      {/* Use accent text */}
      <div>
        <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-700 border border-surface cursor-pointer">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-primary">Texto secundário segue o destaque</span>
            <span className="text-xs text-muted">A cor de destaque do tema escolhido também define o texto secundário.</span>
          </div>
          <button
            role="switch"
            aria-checked={config.useAccentText}
            onClick={() => setUseAccentText(!config.useAccentText)}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
              config.useAccentText ? 'bg-accent' : 'bg-surface-600'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                config.useAccentText ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </label>
      </div>

      {/* Accent color */}
      <div>
        <h4 className="text-sm font-semibold text-secondary mb-2 flex items-center gap-2">
          <Icon name="palette" size={14} /> Cor de destaque
        </h4>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Auto: follows the selected theme's accent */}
          <button
            onClick={() => setAccent(ACCENT_AUTO)}
            className={`w-8 h-8 rounded-full transition-all border-2 flex items-center justify-center ${
              isAuto ? 'border-white scale-110' : 'border-transparent hover:scale-105'
            }`}
            style={{ background: 'conic-gradient(#f43f5e, #fbbf24, #22c55e, #3b82f6, #8b5cf6, #f43f5e)' }}
            title="Auto (usar a cor do tema)"
            aria-label="Cor de destaque automática"
          >
            <Icon name="sparkles" size={14} className="text-white drop-shadow" />
          </button>
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => setAccent(c)}
              className={`w-8 h-8 rounded-full transition-all border-2 ${
                !isAuto && resolved.accent.toLowerCase() === c.toLowerCase()
                  ? 'border-white scale-110'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ background: c }}
              aria-label={`Accent ${c}`}
            />
          ))}
          <label className="relative w-8 h-8 rounded-full overflow-hidden cursor-pointer border border-surface hover:scale-105 transition-all flex items-center justify-center">
            <Icon name="palette" size={14} className="text-secondary" />
            <input
              type="color"
              value={resolved.accent}
              onChange={(e) => setAccent(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* UI Font */}
      <div>
        <h4 className="text-sm font-semibold text-secondary mb-2 flex items-center gap-2">
          <Icon name="keyboard" size={14} /> Fonte da interface
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {UI_FONTS.map((font) => {
            const isActive = (config.font ?? 'inter') === font.id;
            return (
              <button
                key={font.id}
                onClick={() => setFont(font.id)}
                className={`p-3 rounded-xl text-left transition-all border ${
                  isActive ? 'accent-soft-bg accent-border' : 'bg-surface-700 border-surface hover:border-adaptive'
                }`}
              >
                <span className="block text-xl font-semibold leading-none text-primary" style={{ fontFamily: font.family }}>
                  {font.preview}
                </span>
                <span className="block text-xs text-muted mt-1.5">{font.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset themes — dark */}
      <div>
        <h4 className="text-sm font-semibold text-secondary mb-2 flex items-center gap-2">
          <Icon name="moon" size={14} /> Temas escuros
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {darkPresets.map((preset) => renderPreset(preset, config.preset === preset, applyPreset))}
        </div>
      </div>

      {/* Preset themes — light */}
      <div>
        <h4 className="text-sm font-semibold text-secondary mb-2 flex items-center gap-2">
          <Icon name="sun" size={14} /> Temas claros
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {lightPresets.map((preset) => renderPreset(preset, config.preset === preset, applyPreset))}
        </div>
      </div>
    </div>
  );
}

function renderPreset(preset: ThemePreset, isActive: boolean, applyPreset: (p: ThemePreset) => void) {
  const p = PRESET_THEMES[preset];
  return (
    <button
      key={preset}
      onClick={() => applyPreset(preset)}
      className={`p-2 rounded-xl text-left transition-all flex items-center gap-2 ${
        isActive ? 'accent-soft-bg accent-border' : 'bg-surface-700 border border-surface hover:border-adaptive'
      }`}
    >
      <span className="w-6 h-6 rounded-md shrink-0 border border-black/10" style={{ background: `linear-gradient(135deg, ${p.accent}, ${p.bg.elevated})` }} />
      <span className="text-xs font-medium truncate">{PRESET_NAMES[preset]}</span>
    </button>
  );
}
