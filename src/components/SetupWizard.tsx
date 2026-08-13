/**
 * SetupWizard — 7-step calibration: Welcome → Mic → A4 → Calibrate → Instrument → Clef → Ready
 * Uses reusable UI components, SVG icons, and premium animations.
 *
 * @module components/SetupWizard
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { Icon, type IconName } from './Icon';
import { Button, Card, Slider, AnimatedSection, StatCard } from './ui';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../theme/ThemeContext';
import type { WizardConfig, InstrumentType, PitchData } from '../types/wizard';

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

const STEP_TITLES = ['Bem-vindo', 'Microfone', 'Afinação', 'Calibrar', 'Instrumento', 'Clave', 'Pronto!'];

interface StepProps {
  config: Partial<WizardConfig>;
  updateConfig: (u: Partial<WizardConfig>) => void;
  pitch: PitchData | null;
}

export function SetupWizard({ onComplete, onCancel, initialConfig }: Props) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<Partial<WizardConfig>>({
    toleranceCents: initialConfig?.toleranceCents ?? 30,
    clef: initialConfig?.clef ?? 'treble',
    instrument: initialConfig?.instrument ?? 'piano',
    a4Frequency: initialConfig?.a4Frequency ?? 440,
    volumeThreshold: initialConfig?.volumeThreshold ?? 0.06,
    noteDelayMs: initialConfig?.noteDelayMs ?? 250,
    deviceId: initialConfig?.deviceId,
  });
  const [pitch, setPitch] = useState<PitchData | null>(null);

  useEffect(() => {
    const unsub = audioEngine.onPitch((data) => setPitch(data));
    return unsub;
  }, []);

  const updateConfig = useCallback((u: Partial<WizardConfig>) => {
    setConfig((prev) => ({ ...prev, ...u }));
  }, []);

  const goNext = useCallback(() => {
    setStep((s) => {
      const next = Math.min(s + 1, 6);
      if (s === 1 && next === 2 && config.deviceId) {
        audioEngine.start(config.a4Frequency ?? 440).catch(console.error);
      }
      return next;
    });
  }, [config.deviceId, config.a4Frequency]);

  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);
  const canProceed = step !== 1 || !!config.deviceId;

  const handleComplete = useCallback(() => {
    audioEngine.stop();
    if (config.deviceId) onComplete(config as WizardConfig);
  }, [config, onComplete]);

  const renderStep = () => {
    const p: StepProps = { config, updateConfig, pitch };
    switch (step) {
      case 0: return <WelcomeStep onNext={goNext} />;
      case 1: return <MicStep {...p} />;
      case 2: return <A4Step {...p} />;
      case 3: return <CalibrateStep {...p} />;
      case 4: return <InstrumentStep {...p} />;
      case 5: return <ClefStep {...p} />;
      case 6: return <ReadyStep config={config} />;
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Theme toggle */}
        <div className="flex justify-end mb-2">
          <ThemeToggle />
        </div>

        {/* Progress */}
        <AnimatedSection type="slide-up">
          <div className="mb-6">
            <div className="flex justify-between text-xs text-secondary mb-3">
              <span>Passo {step + 1} de {STEP_TITLES.length}</span>
              <span>{STEP_TITLES[step]}</span>
            </div>
            {/* Track with overlay dots — fill aligns with dots */}
            <div className="relative h-2 bg-surface-700 rounded-full">
              <div
                className="absolute h-full bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full transition-all duration-500"
                style={{ width: `${(step / (STEP_TITLES.length - 1)) * 100}%` }}
              />
              {STEP_TITLES.map((_, i) => (
                <div
                  key={i}
                  className={`absolute -top-[3px] w-[14px] h-[14px] rounded-full transition-all duration-300 -translate-x-1/2 ${
                    i <= step
                      ? i === step
                        ? 'bg-neon-purple ring-4 ring-neon-purple/20'
                        : 'bg-neon-cyan'
                      : 'bg-surface-600'
                  }`}
                  style={{ left: `${(i / (STEP_TITLES.length - 1)) * 100}%` }}
                />
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* Content */}
        <AnimatedSection type="fade" key={step}>
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
          {step < 6 ? (
            <Button variant="primary" onClick={goNext} disabled={!canProceed} iconRight="forward">
              Próximo
            </Button>
          ) : (
            <Button variant="success" onClick={handleComplete} disabled={!config.deviceId} icon="play">
              Iniciar Treino
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
    <div className="flex flex-col items-center text-center gap-6 flex-1 justify-center">
      <div className="text-6xl flex justify-center text-neon-cyan animate-float">
        <Icon name="music" size={64} />
      </div>
      <h2 className="text-2xl font-bold gradient-text">MusicTrainer</h2>
      <p className="text-secondary max-w-sm">
        Vamos calibrar o app para o seu ambiente.
        Leva menos de <span className="text-primary font-medium">1 minuto</span>.
      </p>
      <div className="grid grid-cols-3 gap-6 text-sm text-secondary">
        <div className="flex flex-col items-center gap-2">
          <span className="text-neon-cyan"><Icon name="mic" size={24} /></span>
          <span>Microfone</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-neon-purple"><Icon name="tuning" size={24} /></span>
          <span>Afinação</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-neon-emerald"><Icon name="target" size={24} /></span>
          <span>Calibrar</span>
        </div>
      </div>
    </div>
  );
}

function MicStep({ config, updateConfig }: StepProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Request mic permission first so we get device labels
    // (enumerateDevices only returns labels after permission granted)
    const requestPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the temp stream — actual capture starts in the next step
        stream.getTracks().forEach((t) => t.stop());
        setPermissionError(null);

        const all = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        const mics = all.filter((d) => d.kind === 'audioinput');
        setDevices(mics);
        if (mics.length > 0 && !config.deviceId) updateConfig({ deviceId: mics[0].deviceId });
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        setPermissionError(
          name === 'NotAllowedError'
            ? 'Permissão do microfone negada. Habilite-a nas configurações do navegador e tente novamente.'
            : name === 'NotFoundError'
            ? 'Nenhum microfone encontrado. Conecte um dispositivo.'
            : 'Não foi possível acessar o microfone.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    requestPermission();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-5 flex-1">
      <StepHeader icon="mic" title="Microfone" subtitle="Selecione o dispositivo de entrada" />
      {loading ? (
        <div className="text-center text-secondary py-8 shimmer-bg rounded-xl">Carregando...</div>
      ) : permissionError ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="text-3xl text-neon-rose"><Icon name="mic" size={32} /></div>
          <p className="text-sm text-neon-rose max-w-xs">{permissionError}</p>
          <Button variant="secondary" icon="sparkles" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 flex-1">
          {devices.map((d) => (
            <button key={d.deviceId} onClick={() => updateConfig({ deviceId: d.deviceId })}
              className={`p-4 rounded-xl text-left transition-all flex items-center gap-3 ${
                config.deviceId === d.deviceId
                  ? 'bg-neon-cyan/10 border border-neon-cyan/50 text-primary'
                  : 'bg-surface-700 border border-surface text-secondary hover:border-gray-400'
              }`}>
              <Icon name="mic" size={20} className={config.deviceId === d.deviceId ? 'text-neon-cyan' : 'text-muted'} />
              <span className="font-medium">{d.label || `Microfone ${d.deviceId.slice(0, 8)}`}</span>
            </button>
          ))}
          {devices.length === 0 && <div className="text-center text-secondary py-4">Nenhum microfone encontrado</div>}
        </div>
      )}
      <p className="text-xs text-muted text-center">Use fones de ouvido para evitar eco</p>
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
                ? 'bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan'
                : 'bg-surface-700 border border-surface text-secondary hover:border-gray-400'
            }`}>
            <div className="text-xs font-bold">{v} Hz</div>
          </button>
        ))}
      </div>

      <p className="text-xs text-muted text-center">Na dúvida, use 440 Hz.</p>
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

      {/* Mic status */}
      <div className={`flex items-center justify-center gap-2 text-sm ${isMicActive ? 'text-neon-emerald' : 'text-neon-rose'}`}>
        <span className={`w-2 h-2 rounded-full ${isMicActive ? 'bg-neon-emerald animate-pulse' : 'bg-neon-rose'}`} />
        {isMicActive ? 'Microfone ativo' : 'Aguardando microfone...'}
      </div>

      {/* Live meter */}
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
              backgroundColor: parseFloat(volDisplay) >= thNum ? '#10b981' : '#f43f5e',
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
          className="flex-1 rounded-lg text-sm font-medium bg-neon-purple/10 border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/20 transition-all disabled:opacity-30">
          ✨ Auto-sugerir
        </button>
      </div>
    </div>
  );
}

function InstrumentStep({ config, updateConfig }: StepProps) {
  return (
    <div className="flex flex-col gap-5 flex-1">
      <StepHeader icon="instrument" title="Seu Instrumento" subtitle="Define a faixa de notas dos exercícios" />
      <div className="grid grid-cols-2 gap-3 flex-1">
        {INSTRUMENTS.map((inst) => (
          <button key={inst.type} onClick={() => updateConfig({ instrument: inst.type })}
            className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${
              config.instrument === inst.type
                ? 'bg-neon-purple/15 border border-neon-purple/50 text-primary'
                : 'bg-surface-700 border border-surface text-secondary hover:border-gray-400 card-hover'
            }`}>
            <span className="text-neon-purple"><Icon name={inst.icon} size={28} /></span>
            <span className="font-medium text-sm">{inst.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ClefStep({ config, updateConfig }: StepProps) {
  const options = [
    { clef: 'treble' as const, icon: 'clef' as IconName, label: 'Clave de Sol', desc: 'Violino, Flauta, Guitarra', color: 'text-neon-cyan', border: 'border-neon-cyan/50', bg: 'bg-neon-cyan/10' },
    { clef: 'bass' as const, icon: 'clef' as IconName, label: 'Clave de Fá', desc: 'Baixo, Piano (graves)', color: 'text-neon-purple', border: 'border-neon-purple/50', bg: 'bg-neon-purple/10' },
  ];
  return (
    <div className="flex flex-col gap-5 flex-1">
      <StepHeader icon="clef" title="Clave" subtitle="A clave que você lê normalmente" />
      <div className="flex gap-4 flex-1 items-center justify-center">
        {options.map(({ clef, icon, label, desc, color, border, bg }) => (
          <button key={clef} onClick={() => updateConfig({ clef })}
            className={`flex-1 p-8 rounded-2xl flex flex-col items-center gap-4 transition-all ${
              config.clef === clef
                ? `${bg} border-2 ${border} text-primary`
                : 'bg-surface-700 border border-surface text-secondary hover:border-gray-400 card-hover'
            }`}>
            <span className={`text-6xl ${color}`}><Icon name={icon} size={56} /></span>
            <div className="text-center">
              <div className="font-bold">{label}</div>
              <div className="text-xs text-muted mt-1">{desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ReadyStep({ config }: { config: Partial<WizardConfig> }) {
  const inst = INSTRUMENTS.find((i) => i.type === config.instrument);
  const rows: [string, string, string?][] = [
    ['Microfone', config.deviceId?.slice(0, 16) + '...'],
    ['A4', `${config.a4Frequency} Hz`, 'text-neon-cyan'],
    ['Threshold Volume', config.volumeThreshold ? (config.volumeThreshold * 1000).toFixed(0) : '—', 'text-neon-emerald'],
    ['Tolerância', `${config.toleranceCents} cents`, 'text-neon-purple'],
    ['Delay Nota', `${config.noteDelayMs ?? 250}ms`, 'text-neon-cyan'],
    ['Instrumento', inst?.label ?? '—'],
    ['Clave', config.clef === 'treble' ? 'Sol' : 'Fá'],
  ];
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
