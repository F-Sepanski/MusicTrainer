/**
 * SettingsModal — on-the-fly configuration without re-running the full wizard.
 * Lets the user tweak instrument, level, input mode, manual type, and mic/note
 * parameters in place, then saves the updated config.
 *
 * @module components/SettingsModal
 */

import { useState } from 'react';
import { Modal, Slider, Button } from './ui';
import { Icon } from './Icon';
import { INSTRUMENTS, MANUAL_TYPES } from '@/shared/domain';
import type { WizardConfig } from '../types/wizard';

interface Props {
  open: boolean;
  onClose: () => void;
  config: WizardConfig;
  onSave: (config: WizardConfig) => void;
  /** Opens the full setup wizard (granular config). */
  onRunWizard?: () => void;
}

export function SettingsModal({ open, onClose, config, onSave, onRunWizard }: Props) {
  const [draft, setDraft] = useState<WizardConfig>(config);

  const set = (u: Partial<WizardConfig>) => setDraft((prev) => ({ ...prev, ...u }));

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Configurações">
      <div className="flex flex-col gap-5">
        {/* Sistema de Notação */}
        <div>
          <h4 className="text-sm font-semibold text-secondary mb-2 flex items-center gap-2">
            <Icon name="music" size={14} /> Sistema de Notação
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => set({ notationSystem: 'letters' })}
              className={`p-3 rounded-xl flex flex-col items-start gap-1 transition-all ${
                (draft.notationSystem ?? 'letters') === 'letters'
                  ? 'bg-accent-soft border border-accent-soft text-neon-cyan'
                  : 'bg-surface-700 border border-surface text-secondary hover:border-adaptive'
              }`}
            >
              <span className="text-xs font-bold">C D E F G A B</span>
              <span className="text-[10px] text-muted">Letras / Cifras</span>
            </button>
            <button
              onClick={() => set({ notationSystem: 'solfege' })}
              className={`p-3 rounded-xl flex flex-col items-start gap-1 transition-all ${
                draft.notationSystem === 'solfege'
                  ? 'bg-purple-soft border border-purple-soft text-neon-purple'
                  : 'bg-surface-700 border border-surface text-secondary hover:border-adaptive'
              }`}
            >
              <span className="text-xs font-bold">Dó Ré Mi Fá Sol Lá Si</span>
              <span className="text-[10px] text-muted">Solféjo Tradicional</span>
            </button>
          </div>
        </div>

        {/* Instrumento */}
        <div>
          <h4 className="text-sm font-semibold text-secondary mb-2 flex items-center gap-2">
            <Icon name="instrument" size={14} /> Instrumento
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {INSTRUMENTS.map((inst) => (
              <button
                key={inst.type}
                onClick={() => set({ instrument: inst.type })}
                className={`p-2.5 rounded-xl flex items-center gap-2 transition-all ${
                  draft.instrument === inst.type
                    ? 'bg-purple-soft border border-purple-soft text-primary'
                    : 'bg-surface-700 border border-surface text-secondary hover:border-adaptive'
                }`}
              >
                <Icon name={inst.icon} size={16} className="text-neon-purple" />
                <span className="text-xs font-medium truncate">{inst.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Entrada */}
        <div>
          <h4 className="text-sm font-semibold text-secondary mb-2 flex items-center gap-2">
            <Icon name="mic" size={14} /> Entrada de Notas
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => set({ inputMode: 'mic' })}
              className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                draft.inputMode === 'mic'
                  ? 'bg-accent-soft border border-accent-soft text-neon-cyan'
                  : 'bg-surface-700 border border-surface text-secondary hover:border-adaptive'
              }`}
            >
              🎤 Microfone
            </button>
            <button
              onClick={() => set({ inputMode: 'manual' })}
              className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                draft.inputMode === 'manual'
                  ? 'bg-purple-soft border border-purple-soft text-neon-purple'
                  : 'bg-surface-700 border border-surface text-secondary hover:border-adaptive'
              }`}
            >
              ⌨️ Manual
            </button>
          </div>
          {draft.inputMode === 'manual' && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {MANUAL_TYPES.map((m) => (
                <button
                  key={m.type}
                  onClick={() => set({ manualType: m.type })}
                  className={`py-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                    draft.manualType === m.type
                      ? 'bg-purple-soft border border-purple-soft text-neon-purple'
                      : 'bg-surface-700 border border-surface text-secondary hover:border-adaptive'
                  }`}
                >
                  <Icon name={m.icon} size={16} />
                  {m.label.split('/')[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Parâmetros de microfone */}
        {draft.inputMode === 'mic' && (
          <div className="flex flex-col gap-3">
            {/* Transposição / Ajuste de Oitava (Microfone) */}
            <div>
              <h4 className="text-sm font-semibold text-secondary mb-2 flex items-center gap-2">
                <Icon name="tuning" size={14} /> Transposição de Oitava (Microfone)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { value: -2, label: '-2 Oitavas', desc: '2 abaixo (-24)' },
                  { value: -1, label: '-1 Oitava (Violão)', desc: '1 abaixo (8vb)' },
                  { value: 0, label: 'Tom Real', desc: 'Sem transposição' },
                  { value: 1, label: '+1 Oitava', desc: '1 acima (8va)' },
                  { value: 2, label: '+2 Oitavas', desc: '2 acima (+24)' },
                ].map((opt) => {
                  const currentShift = draft.octaveShift ?? (draft.instrument === 'guitar' ? -1 : 0);
                  const isSelected = currentShift === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => set({ octaveShift: opt.value })}
                      className={`p-2.5 rounded-xl flex flex-col items-start gap-0.5 transition-all text-left ${
                        isSelected
                          ? 'bg-accent-soft border border-accent-soft text-neon-cyan'
                          : 'bg-surface-700 border border-surface text-secondary hover:border-adaptive'
                      }`}
                    >
                      <span className="text-xs font-bold">{opt.label}</span>
                      <span className="text-[10px] text-muted">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Slider
              label="A4 (Hz)"
              value={draft.a4Frequency}
              onChange={(v) => set({ a4Frequency: v })}
              min={430}
              max={450}
              accent="cyan"
              leftHint="432" rightHint="450"
              format={(v) => `${v} Hz`}
            />
            <Slider
              label="Threshold Volume"
              value={Math.round((draft.volumeThreshold ?? 0.06) * 1000)}
              onChange={(v) => set({ volumeThreshold: v / 1000 })}
              min={5}
              max={500}
              accent="emerald"
              leftHint="5 (sensível)" rightHint="500 (pouco sensível)"
            />
            <Slider
              label="Tolerância"
              value={draft.toleranceCents}
              onChange={(v) => set({ toleranceCents: v })}
              min={10}
              max={80}
              step={5}
              accent="purple"
              leftHint="10 (rigoroso)" rightHint="80 (flexível)"
              format={(v) => `${v} cents`}
            />
            <Slider
              label="Delay da Nota"
              value={draft.noteDelayMs}
              onChange={(v) => set({ noteDelayMs: v })}
              min={100}
              max={800}
              step={50}
              accent="cyan"
              leftHint="100ms" rightHint="800ms"
              format={(v) => `${v}ms`}
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button variant="primary" onClick={handleSave} className="flex-1">Salvar</Button>
        </div>

        {onRunWizard && (
          <button
            onClick={onRunWizard}
            className="text-xs text-muted hover:text-primary transition-colors flex items-center gap-1 justify-center"
          >
            <Icon name="wizard" size={12} /> Abrir assistente de configuração completo
          </button>
        )}
      </div>
    </Modal>
  );
}
