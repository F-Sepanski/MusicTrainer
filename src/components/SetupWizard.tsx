/**
 * SetupWizard — dynamic multi-step calibration.
 * Flow: Welcome → Instrument → Level → Input Mode → (Mic: A4 + Calibrate | Manual: type) → Ready
 * Uses reusable UI components, SVG icons, and premium animations.
 *
 * @module components/SetupWizard
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { Icon, type IconName } from './Icon';
import { Button, Card, Slider, AnimatedSection, StatCard } from './ui';
import { ThemeSettings } from './ThemeSettings';
import type { WizardConfig, InstrumentType, PitchData, Level, InputMode, ManualType } from '../types/wizard';

interface Props {
  onComplete: (config: WizardConfig) => void;
  onCancel?: () => void;
  initialConfig?: WizardConfig | null;
}

const INSTRUMENTS: { type: InstrumentType; label: string; icon: IconName }[] = [
  { type: 'piano', label: 'Piano', icon: 'piano' },
  { type: 'guitar', label: 'Violão', icon: 'guitar' },
  { type: 'violin', label: 'Violino', icon: 'violin' },
  { type: 'flute', label: 'Flauta', icon: 'flute' },
  { type: 'saxophone', label: 'Saxofone', icon: 'sax' },
  { type: 'trumpet', label: 'Trompete', icon: 'trumpet' },
  { type: 'voice', label: 'Voz', icon: 'voice' },
  { type: 'other', label: 'Outro', icon: 'other' },
];

const LEVELS: { level: Level; label: string; desc: string; icon: IconName; unlock: number }[] = [
  { level: 'beginner', label: 'Iniciante', desc: 'Nunca li partitura', icon: 'target', unlock: 3 },
  { level: 'learner', label: 'Aprendiz', desc: 'Pouca experiência', icon: 'clock', unlock: 5 },
  { level: 'intermediate', label: 'Intermediário', desc: 'Lê com alguma fluência', icon: 'music', unlock: 7 },
  { level: 'experienced', label: 'Experiente', desc: 'Leitura fluente', icon: 'sparkles', unlock: 8 },
  { level: 'professional', label: 'Profissional', desc: 'Avançado', icon: 'chart', unlock: 8 },
];

const MANUAL_TYPES: { type: ManualType; label: string; icon: IconName; desc: string }[] = [
  { type: 'piano', label: 'Teclado/Piano', icon: 'piano', desc: 'Clique nas teclas' },
  { type: 'guitar', label: 'Braço de Violão', icon: 'guitar', desc: 'Clique nas casas' },
  { type: 'circle', label: 'Círculo de Quintas', icon: 'music', desc: 'Selecione a nota no círculo' },
];

interface StepProps {
  config: Partial<WizardConfig>;
  updateConfig: (u: Partial<WizardConfig>) => void;
  pitch: PitchData | null;
  onNext?: () => void;
}

export function SetupWizard({ onComplete, onCancel, initialConfig }: Props) {
  // Build the ordered steps based on input mode
  const buildSteps = useCallback((mode: InputMode): string[] => {
    const base = ['Bem-vindo', 'Tema', 'Instrumento', 'Nível', 'Entrada'];
    if (mode === 'mic') {
      return [...base, 'Afinação', 'Calibrar', 'Pronto!'];
    }
    return [...base, 'Entrada Manual', 'Pronto!'];
  }, []);

  const [config, setConfig] = useState<Partial<WizardConfig>>({
    toleranceCents: initialConfig?.toleranceCents ?? 30,
    instrument: initialConfig?.instrument ?? 'piano',
    a4Frequency: initialConfig?.a4Frequency ?? 440,
    volumeThreshold: initialConfig?.volumeThreshold ?? 0.06,
    noteDelayMs: initialConfig?.noteDelayMs ?? 250,
    deviceId: initialConfig?.deviceId,
    level: initialConfig?.level ?? 'beginner',
    inputMode: initialConfig?.inputMode ?? 'mic',
    manualType: initialConfig?.manualType ?? 'piano',
    noteCount: initialConfig?.noteCount ?? 12,
    notationSystem: initialConfig?.notationSystem ?? 'letters',
  });
  const [step, setStep] = useState(0);
  const [pitch, setPitch] = useState<PitchData | null>(null);
  const stepTitles = buildSteps(config.inputMode ?? 'mic');

  useEffect(() => {
    const unsub = audioEngine.onPitch((data) => setPitch(data));
    return unsub;
  }, []);

  const updateConfig = useCallback((u: Partial<WizardConfig>) => {
    setConfig((prev) => ({ ...prev, ...u }));
  }, []);

  const goNext = useCallback(() => {
    setStep((s) => {
      const titles = buildSteps(config.inputMode ?? 'mic');
      const next = Math.min(s + 1, titles.length - 1);
      // Start audio when leaving mic-based steps (Afinação is at index 5 in mic flow)
      const isMicFlow = (config.inputMode ?? 'mic') === 'mic';
      const atA4Entry = isMicFlow && s === 5 && next === 6;
      if (atA4Entry && config.deviceId) {
        audioEngine.start(config.a4Frequency ?? 440).catch(console.error);
      }
      return next;
    });
  }, [config.inputMode, config.deviceId, config.a4Frequency, buildSteps]);

  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const handleComplete = useCallback(() => {
    audioEngine.stop();
    onComplete(config as WizardConfig);
  }, [config, onComplete]);

  const renderStep = () => {
    const p: StepProps = { config, updateConfig, pitch, onNext: goNext };
    const mode = config.inputMode ?? 'mic';
    if (mode === 'mic') {
      switch (step) {
        case 0: return <WelcomeStep onNext={goNext} />;
        case 1: return <ThemeStep />;
        case 2: return <InstrumentStep {...p} />;
        case 3: return <LevelStep {...p} />;
        case 4: return <InputModeStep {...p} />;
        case 5: return <A4Step {...p} />;
        case 6: return <CalibrateStep {...p} />;
        case 7: return <ReadyStep config={config} />;
      }
    }
    // Manual flow
    switch (step) {
      case 0: return <WelcomeStep onNext={goNext} />;
      case 1: return <ThemeStep />;
      case 2: return <InstrumentStep {...p} />;
      case 3: return <LevelStep {...p} />;
      case 4: return <InputModeStep {...p} />;
      case 5: return <ManualTypeStep {...p} />;
      case 6: return <ReadyStep config={config} />;
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <AnimatedSection type="slide-up">
          <div className="mb-6">
            <div className="flex justify-between text-xs text-secondary mb-3">
              <span>Passo {step + 1} de {stepTitles.length}</span>
              <span>{stepTitles[step]}</span>
            </div>
            {/* Track with overlay dots — fill aligns with dots */}
            <div className="relative h-2 bg-surface-700 rounded-full">
              <div
                className="absolute h-full bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full transition-all duration-500"
                style={{ width: `${(step / (stepTitles.length - 1)) * 100}%` }}
              />
              {stepTitles.map((_, i) => (
                <div
                  key={i}
                  className={`absolute -top-[3px] w-[14px] h-[14px] rounded-full transition-all duration-300 -translate-x-1/2 ${
                    i <= step
                      ? i === step
                        ? 'bg-neon-purple ring-4 ring-purple-soft'
                        : 'bg-neon-cyan'
                      : 'bg-surface-600'
                  }`}
                  style={{ left: `${(i / (stepTitles.length - 1)) * 100}%` }}
                />
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* Content */}
        <AnimatedSection type="fade" key={`${step}-${config.inputMode}`}>
          <div className="bg-surface-800 rounded-2xl p-8 border border-surface min-h-[420px] flex flex-col">
            {renderStep()}
          </div>
        </AnimatedSection>

        {/* Nav */}
        <div className="flex justify-between mt-4">
          <Button variant="secondary" onClick={step === 0 && onCancel ? onCancel : goBack} disabled={step === 0 && !onCancel}>
            <Icon name="back" size={16} />
            {step === 0 && onCancel ? 'Cancelar' : 'Voltar'}
          </Button>
          {step < stepTitles.length - 1 ? (
            <Button variant="primary" onClick={goNext} iconRight="forward">
              Próximo
            </Button>
          ) : (
            <Button variant="success" onClick={handleComplete} icon="play">
              Concluir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* STEPS                                                          */
/* ═══════════════════════════════════════════════════════════════ */

function StepHeader({ icon, title, subtitle }: { icon: IconName; title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-5">
      <div className="text-4xl mb-3 flex justify-center text-neon-cyan animate-pulse-glow">
        <Icon name={icon} size={40} />
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      {subtitle && <p className="text-sm text-secondary mt-1">{subtitle}</p>}
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 flex-1 justify-center relative">
      <div className="text-6xl flex justify-center text-neon-cyan animate-float">
        <Icon name="music" size={64} />
      </div>
      <h2 className="text-2xl font-bold gradient-text">MusicTrainer</h2>
      <p className="text-secondary max-w-sm">
        Vamos configurar seu perfil e instrumento.
        Leva menos de <span className="text-primary font-medium">1 minuto</span>.
      </p>
      <div className="grid grid-cols-3 gap-6 text-sm text-secondary">
        <div className="flex flex-col items-center gap-2">
          <span className="text-neon-cyan"><Icon name="instrument" size={24} /></span>
          <span>Instrumento</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-neon-purple"><Icon name="target" size={24} /></span>
          <span>Nível</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-neon-emerald"><Icon name="mic" size={24} /></span>
          <span>Entrada</span>
        </div>
      </div>
    </div>
  );
}

function ThemeStep() {
  return (
    <div className="flex flex-col gap-5 flex-1">
      <StepHeader icon="palette" title="Personalize o Tema" subtitle="Escolha seu estilo visual" />
      <div className="overflow-y-auto pr-1 -mr-1">
        <ThemeSettings />
      </div>
    </div>
  );
}

function InstrumentStep({ config, updateConfig }: StepProps) {
  return (
    <div className="flex flex-col gap-5 flex-1">
      <StepHeader icon="instrument" title="Instrumento Principal" subtitle="Qual é o seu instrumento?" />
      <div className="grid grid-cols-2 gap-3 flex-1">
        {INSTRUMENTS.map((inst) => (
          <button key={inst.type} onClick={() => updateConfig({ instrument: inst.type })}
            className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${
              config.instrument === inst.type
                ? 'bg-purple-soft border border-purple-soft text-primary'
                : 'bg-surface-700 border border-surface text-secondary hover:border-adaptive card-hover'
            }`}>
            <span className="text-neon-purple"><Icon name={inst.icon} size={28} /></span>
            <span className="font-medium text-sm">{inst.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LevelStep({ config, updateConfig }: StepProps) {
  return (
    <div className="flex flex-col gap-5 flex-1">
      <StepHeader icon="target" title="Seu Nível" subtitle="Define os capítulos disponíveis" />
      <div className="flex flex-col gap-3 flex-1">
        {LEVELS.map((lvl) => (
          <button key={lvl.level} onClick={() => updateConfig({ level: lvl.level })}
            className={`p-4 rounded-xl flex items-center gap-3 transition-all ${
              config.level === lvl.level
                ? 'bg-accent-soft border border-accent-soft text-primary'
                : 'bg-surface-700 border border-surface text-secondary hover:border-adaptive'
            }`}>
            <span className={`${config.level === lvl.level ? 'text-neon-cyan' : 'text-muted'}`}>
              <Icon name={lvl.icon} size={22} />
            </span>
            <div className="text-left">
              <div className="font-medium">{lvl.label}</div>
              <div className="text-xs text-muted">{lvl.desc}</div>
            </div>
            <div className="ml-auto text-[10px] text-muted font-mono">
              {lvl.unlock === 8 ? 'todos' : `até cap ${lvl.unlock}`}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function InputModeStep({ config, updateConfig }: StepProps) {
  // Suggest a default manual type based on instrument when switching to manual
  const suggestManualType = (): ManualType => {
    switch (config.instrument) {
      case 'guitar': return 'guitar';
      case 'piano': return 'piano';
      default: return 'circle';
    }
  };

  return (
    <div className="flex flex-col gap-5 flex-1">
      <StepHeader icon="mic" title="Como tocará as notas?" subtitle="Microfone ou manual" />
      <div className="flex flex-col gap-3 flex-1 justify-center">
        <button onClick={() => updateConfig({ inputMode: 'mic' })}
          className={`p-6 rounded-xl flex items-center gap-4 transition-all ${
            config.inputMode === 'mic'
              ? 'bg-accent-soft border-2 border-accent-soft text-primary'
              : 'bg-surface-700 border border-surface text-secondary hover:border-adaptive'
          }`}>
          <span className="text-neon-cyan"><Icon name="mic" size={32} /></span>
          <div className="text-left">
            <div className="font-semibold">Microfone</div>
            <div className="text-xs text-muted">Detecta suas notas em tempo real. Requer calibração.</div>
          </div>
        </button>
        <button onClick={() => updateConfig({ inputMode: 'manual', manualType: suggestManualType() })}
          className={`p-6 rounded-xl flex items-center gap-4 transition-all ${
            config.inputMode === 'manual'
              ? 'bg-purple-soft border-2 border-purple-soft text-primary'
              : 'bg-surface-700 border border-surface text-secondary hover:border-adaptive'
          }`}>
          <span className="text-neon-purple"><Icon name="keyboard" size={32} /></span>
          <div className="text-left">
            <div className="font-semibold">Manual (clique/teclado)</div>
            <div className="text-xs text-muted">Toque as notas clicando ou usando o teclado. Sem microfone.</div>
          </div>
        </button>
      </div>
    </div>
  );
}

function ManualTypeStep({ config, updateConfig }: StepProps) {
  return (
    <div className="flex flex-col gap-5 flex-1">
      <StepHeader icon="keyboard" title="Tipo de Entrada Manual" subtitle="Como deseja inserir as notas?" />
      <div className="flex flex-col gap-3 flex-1">
        {MANUAL_TYPES.map((m) => (
          <button key={m.type} onClick={() => updateConfig({ manualType: m.type })}
            className={`p-5 rounded-xl flex items-center gap-4 transition-all ${
              config.manualType === m.type
                ? 'bg-purple-soft border border-purple-soft text-primary'
                : 'bg-surface-700 border border-surface text-secondary hover:border-adaptive'
            }`}>
            <span className="text-neon-purple"><Icon name={m.icon} size={28} /></span>
            <div className="text-left">
              <div className="font-semibold">{m.label}</div>
              <div className="text-xs text-muted">{m.desc}</div>
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted text-center">
        Você também pode usar as teclas do teclado: A,W,S,E,D,F,T,G,Y,H,U,J,K,O,L,P
      </p>
    </div>
  );
}

function A4Step({ config, updateConfig, pitch }: StepProps) {
  const a4 = config.a4Frequency ?? 440;
  const freq = pitch?.frequency ?? 0;
  const noteName = pitch?.noteName ?? '—';

  const midiAt = freq > 0 ? 69 + 12 * Math.log2(freq / a4) : 0;
  const centsOff = 1200 * Math.log2(freq / (a4 * Math.pow(2, (Math.round(midiAt) - 69) / 12)));

  return (
    <div className="flex flex-col gap-5 flex-1">
      <StepHeader icon="tuning" title="Frequência de Referência" subtitle="Qual A4 o seu instrumento usa?" />

      <div className="bg-surface-700 rounded-xl p-4 text-center">
        <div className="text-sm text-secondary mb-1">Detectado com A4 = {a4} Hz</div>
        <div className="text-2xl font-bold">{freq > 0 ? noteName : '—'}</div>
        <div className="text-sm font-mono text-secondary">
          {freq > 0 ? `${freq.toFixed(1)} Hz | ${centsOff > 0 ? '+' : ''}${centsOff.toFixed(0)} cents` : 'Toque uma nota para detectar'}
        </div>
      </div>

      <Slider label="A4" value={a4} onChange={(v) => updateConfig({ a4Frequency: v })}
        min={430} max={450} accent="cyan"
        leftHint="430 (Barroco)" rightHint="450 (Europeu)"
        format={(v) => `${v} Hz`} />

      <div className="flex gap-2">
        {[432, 440, 442, 443].map((v) => (
          <button key={v} onClick={() => updateConfig({ a4Frequency: v })}
            className={`flex-1 py-2 rounded-lg text-center transition-all ${
              a4 === v
                ? 'bg-accent-soft border border-accent-soft text-neon-cyan'
                : 'bg-surface-700 border border-surface text-secondary hover:border-adaptive'
            }`}>
            <div className="text-xs font-bold">{v} Hz</div>
          </button>
        ))}
      </div>

      {/* Transposição / Ajuste de Oitava */}
      <div className="flex flex-col gap-1.5 pt-1">
        <label className="text-xs font-semibold text-secondary flex items-center gap-1.5">
          <Icon name="tuning" size={13} /> Transposição de Oitava (Microfone)
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { value: -2, label: '-2', sub: '2 baix.' },
            { value: -1, label: '-1', sub: 'Violão' },
            { value: 0, label: '0', sub: 'Real' },
            { value: 1, label: '+1', sub: '1 acim.' },
            { value: 2, label: '+2', sub: '2 acim.' },
          ].map((opt) => {
            const currentShift = config.octaveShift ?? (config.instrument === 'guitar' ? -1 : 0);
            const isSelected = currentShift === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateConfig({ octaveShift: opt.value })}
                className={`py-2 px-1 rounded-lg text-center transition-all ${
                  isSelected
                    ? 'bg-accent-soft border border-accent-soft text-neon-cyan font-bold'
                    : 'bg-surface-700 border border-surface text-secondary hover:border-adaptive'
                }`}
              >
                <div className="text-xs">{opt.label}</div>
                <div className="text-[9px] text-muted">{opt.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted text-center">Na dúvida, use 440 Hz e Tom Real (0) ou Violão (-1).</p>
    </div>
  );
}

function CalibrateStep({ config, updateConfig, pitch }: StepProps) {
  const [minVol, setMinVol] = useState(Infinity);
  const [maxVol, setMaxVol] = useState(0);
  const [centsHistory, setCentsHistory] = useState<number[]>([]);
  const [noteCount, setNoteCount] = useState(0);
  const [lastNoteName, setLastNoteName] = useState('');
  const lastNoteRef = useRef(0);
  const cooldownRef = useRef(false);

  useEffect(() => {
    if (!pitch || pitch.volume <= 0) return;
    const vol = pitch.volume * 1000;
    setMinVol((p) => Math.min(p, vol));
    setMaxVol((p) => Math.max(p, vol));

    if (pitch.midiNote > 0 && pitch.confidence > 0.2 && !cooldownRef.current) {
      setCentsHistory((p) => [...p.slice(-50), Math.abs(pitch.cents)]);
      setLastNoteName(pitch.noteName);
      if (pitch.midiNote !== lastNoteRef.current) {
        lastNoteRef.current = pitch.midiNote;
        setNoteCount((c) => c + 1);
        cooldownRef.current = true;
        setTimeout(() => { cooldownRef.current = false; }, 1000);
      }
    }
  }, [pitch]);

  const suggestThresholds = useCallback(() => {
    if (minVol < Infinity && maxVol > 0) {
      updateConfig({ volumeThreshold: Math.max((minVol + (maxVol - minVol) * 0.4) / 1000, 0.01) });
    }
    if (centsHistory.length > 5) {
      const avg = centsHistory.reduce((a, b) => a + b, 0) / centsHistory.length;
      updateConfig({ toleranceCents: Math.min(Math.max(Math.ceil(avg * 1.2 / 5) * 5, 15), 80) });
    }
  }, [minVol, maxVol, centsHistory, updateConfig]);

  const volDisplay = pitch ? (pitch.volume * 1000).toFixed(0) : '0';
  const thNum = (config.volumeThreshold ?? 0.06) * 1000;
  const isMicActive = pitch !== null && pitch.volume > 0;

  return (
    <div className="flex flex-col gap-4 flex-1">
      <StepHeader icon="target" title="Calibrar" subtitle="Toque várias notas (graves e agudas)" />

      <div className={`flex items-center justify-center gap-2 text-sm ${isMicActive ? 'text-neon-emerald' : 'text-neon-rose'}`}>
        <span className={`w-2 h-2 rounded-full ${isMicActive ? 'bg-neon-emerald animate-pulse' : 'bg-neon-rose'}`} />
        {isMicActive ? 'Microfone ativo' : 'Aguardando microfone...'}
      </div>

      <div>
        <div className="flex justify-between text-xs text-secondary mb-1">
          <span>Atual: <span className="font-mono">{volDisplay}</span></span>
          <span className="font-mono">
            Min: <span className="text-neon-cyan">{minVol < Infinity ? minVol.toFixed(0) : '—'}</span>
            {' '}Max: <span className="text-neon-purple">{maxVol > 0 ? maxVol.toFixed(0) : '—'}</span>
          </span>
        </div>
        <div className="w-full h-4 bg-surface-700 rounded-full overflow-hidden relative">
          <div className="absolute top-0 h-full w-0.5 bg-neon-emerald z-10"
            style={{ left: `${Math.min((thNum / 500) * 100, 100)}%` }} />
          <div className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${Math.min((parseFloat(volDisplay) / 500) * 100, 100)}%`,
              backgroundColor: parseFloat(volDisplay) >= thNum ? 'var(--success)' : 'var(--error)',
            }} />
        </div>
      </div>

      <Slider label="Threshold Volume" value={Math.round(thNum)}
        onChange={(v) => updateConfig({ volumeThreshold: v / 1000 })}
        min={5} max={500} accent="emerald"
        leftHint="5 (sensível)" rightHint="500 (pouco sensível)" />

      <Slider label="Tolerância" value={config.toleranceCents ?? 30}
        onChange={(v) => updateConfig({ toleranceCents: v })}
        min={10} max={80} step={5} accent="purple"
        leftHint="10 (rigoroso)" rightHint="80 (flexível)"
        format={(v) => `${v} cents`} />

      <Slider label="Delay da Nota" value={config.noteDelayMs ?? 250}
        onChange={(v) => updateConfig({ noteDelayMs: v })}
        min={100} max={800} step={50} accent="cyan"
        leftHint="100ms (rápido)" rightHint="800ms (lento)"
        format={(v) => `${v}ms`} />

      <div className="flex gap-2">
        <StatCard label="Última Nota" value={lastNoteName || '—'} color="text-neon-cyan" />
        <StatCard label="Notas Tocadas" value={String(noteCount)} />
        <button onClick={suggestThresholds} disabled={noteCount < 2}
          className="flex-1 rounded-lg text-sm font-medium bg-purple-soft border border-purple-soft text-neon-purple hover:bg-accent-soft-2 transition-all disabled:opacity-30">
          ✨ Auto-sugerir
        </button>
      </div>
    </div>
  );
}

function ReadyStep({ config }: { config: Partial<WizardConfig> }) {
  const inst = INSTRUMENTS.find((i) => i.type === config.instrument);
  const lvl = LEVELS.find((l) => l.level === config.level);
  const manualType = MANUAL_TYPES.find((m) => m.type === config.manualType);
  const rows: [string, string, string?][] = [
    ['Instrumento', inst?.label ?? '—'],
    ['Nível', lvl?.label ?? '—'],
    ['Entrada', config.inputMode === 'mic' ? 'Microfone' : 'Manual'],
  ];
  if (config.inputMode === 'manual') {
    rows.push(['Manual', manualType?.label ?? '—']);
  } else {
    rows.push(['A4', `${config.a4Frequency} Hz`, 'text-neon-cyan']);
    rows.push(['Threshold', config.volumeThreshold ? (config.volumeThreshold * 1000).toFixed(0) : '—', 'text-neon-emerald']);
    rows.push(['Tolerância', `${config.toleranceCents} cents`, 'text-neon-purple']);
    rows.push(['Delay', `${config.noteDelayMs ?? 250}ms`, 'text-neon-cyan']);
  }
  return (
    <div className="flex flex-col gap-4 flex-1">
      <StepHeader icon="check" title="Tudo Pronto!" />
      {rows.map(([label, value, accent], i) => (
        <AnimatedSection key={label} type="slide-up" delay={i * 50}>
          <div className="bg-surface-700 rounded-xl p-3 flex justify-between items-center">
            <span className="text-secondary text-sm">{label}</span>
            <span className={`font-mono text-sm ${accent ?? 'text-primary'}`}>{value ?? '—'}</span>
          </div>
        </AnimatedSection>
      ))}
    </div>
  );
}
