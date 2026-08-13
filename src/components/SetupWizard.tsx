/**
 * SetupWizard — 6-step calibration: Welcome → Mic → A4 → Calibrate → Instrument → Clef → Ready
 *
 * @module components/SetupWizard
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import type { WizardConfig, InstrumentType, PitchData } from '../types/wizard';

interface Props {
  onComplete: (config: WizardConfig) => void;
}

const INSTRUMENTS: { type: InstrumentType; label: string; icon: string }[] = [
  { type: 'piano', label: 'Piano', icon: '🎹' },
  { type: 'guitar', label: 'Violão', icon: '🎸' },
  { type: 'violin', label: 'Violino', icon: '🎻' },
  { type: 'flute', label: 'Flauta', icon: '🪈' },
  { type: 'saxophone', label: 'Saxofone', icon: '🎷' },
  { type: 'trumpet', label: 'Trompete', icon: '🎺' },
  { type: 'voice', label: 'Voz', icon: '🎤' },
  { type: 'other', label: 'Outro', icon: '🎵' },
];

const STEP_TITLES = ['Bem-vindo', 'Microfone', 'Afinação', 'Calibrar', 'Instrumento', 'Clave', 'Pronto!'];

interface StepProps {
  config: Partial<WizardConfig>;
  updateConfig: (u: Partial<WizardConfig>) => void;
  pitch: PitchData | null;
}

// ═══════════════════════════════════════════════════════════════
export function SetupWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<Partial<WizardConfig>>({
    toleranceCents: 30,
    clef: 'treble',
    instrument: 'piano',
    a4Frequency: 440,
    volumeThreshold: 0.06,
    noteDelayMs: 250,
  });
  const [pitch, setPitch] = useState<PitchData | null>(null);

  useEffect(() => {
    const unsub = audioEngine.onPitch((data) => setPitch(data));
    return unsub;
  }, []);

  const updateConfig = useCallback((u: Partial<WizardConfig>) => {
    setConfig((prev) => ({ ...prev, ...u }));
  }, []);

  // Start audio engine when moving past mic selection
  const goNext = useCallback(() => {
    setStep((s) => {
      const next = Math.min(s + 1, 6);
      // Start audio when leaving mic step (step 1 → 2)
      if (s === 1 && next === 2 && config.deviceId) {
        audioEngine.start(config.a4Frequency ?? 440).catch(console.error);
      }
      return next;
    });
  }, [config.deviceId, config.a4Frequency]);

  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);
  const canProceed = step !== 1 || !!config.deviceId;

  // Stop audio when wizard completes
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
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Passo {step + 1} de {STEP_TITLES.length}</span>
            <span>{STEP_TITLES[step]}</span>
          </div>
          <div className="w-full h-2 bg-surface-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-3">
            {STEP_TITLES.map((_, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${
                i < step ? 'bg-neon-cyan' : i === step ? 'bg-neon-purple ring-2 ring-neon-purple/30' : 'bg-surface-600'
              }`} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-surface-800 rounded-2xl p-8 border border-surface-600 min-h-[420px] flex flex-col">
          {renderStep()}
        </div>

        {/* Nav */}
        <div className="flex justify-between mt-4">
          <button onClick={goBack} disabled={step === 0}
            className="px-6 py-2 rounded-xl font-medium bg-surface-700 border border-surface-600 text-gray-400 hover:text-white hover:border-gray-500 transition-all disabled:opacity-30">
            ← Voltar
          </button>
          {step < 6 ? (
            <button onClick={goNext} disabled={!canProceed}
              className="px-6 py-2 rounded-xl font-bold bg-gradient-to-r from-neon-cyan to-neon-purple text-surface-900 hover:opacity-90 transition-opacity disabled:opacity-30">
              Próximo →
            </button>
          ) : (
            <button onClick={handleComplete} disabled={!config.deviceId}
              className="px-6 py-2 rounded-xl font-bold bg-gradient-to-r from-neon-emerald to-neon-cyan text-surface-900 hover:opacity-90 transition-opacity disabled:opacity-30">
              ▶ Iniciar Treino
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STEPS
// ═══════════════════════════════════════════════════════════════

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 flex-1 justify-center">
      <div className="text-6xl">♪</div>
      <h2 className="text-2xl font-bold bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
        MusicTrainer
      </h2>
      <p className="text-gray-400 max-w-sm">
        Vamos calibrar o app para o seu ambiente.
        Leva menos de <span className="text-white font-medium">1 minuto</span>.
      </p>
      <div className="grid grid-cols-3 gap-6 text-sm text-gray-500">
        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl">🎤</span><span>Microfone</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl">🎼</span><span>Afinação</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl">🎯</span><span>Calibrar</span>
        </div>
      </div>
    </div>
  );
}

function MicStep({ config, updateConfig }: StepProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((all) => {
      const mics = all.filter((d) => d.kind === 'audioinput');
      setDevices(mics);
      if (mics.length > 0 && !config.deviceId) updateConfig({ deviceId: mics[0].deviceId });
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col gap-5 flex-1">
      <div className="text-center">
        <div className="text-4xl mb-3">🎤</div>
        <h3 className="text-xl font-bold">Microfone</h3>
        <p className="text-sm text-gray-500 mt-1">Selecione o dispositivo de entrada</p>
      </div>
      {loading ? (
        <div className="text-center text-gray-500 py-8">Carregando...</div>
      ) : (
        <div className="flex flex-col gap-2 flex-1">
          {devices.map((d) => (
            <button key={d.deviceId} onClick={() => updateConfig({ deviceId: d.deviceId })}
              className={`p-4 rounded-xl text-left transition-all ${
                config.deviceId === d.deviceId
                  ? 'bg-neon-cyan/10 border border-neon-cyan/50 text-white'
                  : 'bg-surface-700 border border-surface-600 text-gray-400 hover:border-gray-500'
              }`}>
              <div className="font-medium">{d.label || `Mic ${d.deviceId.slice(0, 8)}`}</div>
            </button>
          ))}
          {devices.length === 0 && <div className="text-center text-gray-500 py-4">Nenhum microfone encontrado</div>}
        </div>
      )}
      <p className="text-xs text-gray-600 text-center">Use fones de ouvido para evitar eco</p>
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
      <div className="text-center">
        <div className="text-4xl mb-3">🎼</div>
        <h3 className="text-xl font-bold">Frequência de Referência</h3>
        <p className="text-sm text-gray-500 mt-1">Qual A4 o seu instrumento usa?</p>
      </div>

      {freq > 0 && (
        <div className="bg-surface-700 rounded-xl p-4 text-center">
          <div className="text-sm text-gray-500 mb-1">Detectado com A4 = {a4} Hz</div>
          <div className="text-2xl font-bold text-white">{noteName}</div>
          <div className="text-sm font-mono text-gray-400">
            {freq.toFixed(1)} Hz | {centsOff > 0 ? '+' : ''}{centsOff.toFixed(0)} cents
          </div>
        </div>
      )}

      <div className="bg-surface-700 rounded-xl p-5">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-gray-400">A4 =</span>
          <span className="text-2xl font-mono font-bold text-neon-cyan">{a4} Hz</span>
        </div>
        <input type="range" min="430" max="450" step="1" value={a4}
          onChange={(e) => updateConfig({ a4Frequency: parseInt(e.target.value) })}
          className="w-full accent-neon-cyan" />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>430 (Barroco)</span><span>440 (Padrão)</span><span>450 (Europeu)</span>
        </div>
      </div>

      <div className="flex gap-2">
        {[432, 440, 442, 443].map((v) => (
          <button key={v} onClick={() => updateConfig({ a4Frequency: v })}
            className={`flex-1 py-2 rounded-lg text-center transition-all ${
              a4 === v
                ? 'bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan'
                : 'bg-surface-700 border border-surface-600 text-gray-500 hover:border-gray-500'
            }`}>
            <div className="text-xs font-bold">{v} Hz</div>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-600 text-center">
        Toque uma nota e ajuste até ser identificada corretamente. Na dúvida, use 440 Hz.
      </p>
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

    // Count notes with cooldown (1 second between counts)
    if (pitch.midiNote > 0 && pitch.confidence > 0.2 && !cooldownRef.current) {
      setCentsHistory((p) => [...p.slice(-50), Math.abs(pitch.cents)]);
      setLastNoteName(pitch.noteName);

      // Only count if it's a different note than last time
      if (pitch.midiNote !== lastNoteRef.current) {
        lastNoteRef.current = pitch.midiNote;
        setNoteCount((c) => c + 1);

        // Start cooldown - don't count again for 1 second
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
  const thDisplay = config.volumeThreshold ? (config.volumeThreshold * 1000).toFixed(0) : '—';
  const thNum = parseFloat(thDisplay) || 0;
  const isMicActive = pitch !== null && pitch.volume > 0;

  return (
    <div className="flex flex-col gap-4 flex-1">
      <div className="text-center">
        <div className="text-4xl mb-3">🎯</div>
        <h3 className="text-xl font-bold">Calibrar Volume e Tolerância</h3>
        <p className="text-sm text-gray-500 mt-1">Toque varias notas (graves e agudas)</p>
      </div>

      {/* Mic status */}
      <div className={`flex items-center justify-center gap-2 text-sm ${isMicActive ? 'text-neon-emerald' : 'text-neon-rose'}`}>
        <span className={`w-2 h-2 rounded-full ${isMicActive ? 'bg-neon-emerald animate-pulse' : 'bg-neon-rose'}`} />
        {isMicActive ? 'Microfone ativo' : 'Aguardando microfone...'}
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Atual: <span className="text-white font-mono">{volDisplay}</span></span>
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
              backgroundColor: parseFloat(volDisplay) >= thNum ? '#10B981' : '#F43F5E',
            }} />
        </div>
      </div>

      <div className="bg-surface-700 rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Threshold Volume</span>
          <span className="font-mono text-lg font-bold text-neon-emerald">{thDisplay}</span>
        </div>
        <input type="range" min="5" max="500" value={thNum}
          onChange={(e) => updateConfig({ volumeThreshold: parseInt(e.target.value) / 1000 })}
          className="w-full accent-neon-emerald" />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>5 (sensivel)</span><span>500 (pouco sensivel)</span>
        </div>
      </div>

      <div className="bg-surface-700 rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Tolerância (cents)</span>
          <span className="font-mono text-lg font-bold text-neon-purple">{config.toleranceCents ?? 30}</span>
        </div>
        <input type="range" min="10" max="80" step="5" value={config.toleranceCents ?? 30}
          onChange={(e) => updateConfig({ toleranceCents: parseInt(e.target.value) })}
          className="w-full accent-neon-purple" />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>10 (rigoroso)</span><span>40 (flexivel)</span><span>80 (muito flexivel)</span>
        </div>
      </div>

      {/* Delay da nota */}
      <div className="bg-surface-700 rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Delay da Nota (ms)</span>
          <span className="font-mono text-lg font-bold text-neon-cyan">{config.noteDelayMs ?? 250}ms</span>
        </div>
        <input type="range" min="100" max="800" step="50" value={config.noteDelayMs ?? 250}
          onChange={(e) => updateConfig({ noteDelayMs: parseInt(e.target.value) })}
          className="w-full accent-neon-cyan" />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>100ms (rapido)</span><span>250ms (padrao)</span><span>800ms (lento)</span>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 bg-surface-700 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500">Última Nota</div>
          <div className="text-lg font-bold text-neon-cyan">{lastNoteName || '—'}</div>
        </div>
        <div className="flex-1 bg-surface-700 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500">Notas Tocadas</div>
          <div className="text-lg font-bold text-white">{noteCount}</div>
        </div>
        <button onClick={suggestThresholds} disabled={noteCount < 2}
          className="flex-1 py-2 rounded-lg text-sm font-medium bg-neon-purple/10 border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/20 transition-all disabled:opacity-30">
          ✨ Auto-sugerir
        </button>
      </div>

      <p className="text-xs text-gray-600 text-center">
        Toque notas de diferentes cordas. O auto-sugerir ajusta tudo automaticamente.
      </p>
    </div>
  );
}

function InstrumentStep({ config, updateConfig }: StepProps) {
  return (
    <div className="flex flex-col gap-5 flex-1">
      <div className="text-center">
        <div className="text-4xl mb-3">🎵</div>
        <h3 className="text-xl font-bold">Seu Instrumento</h3>
        <p className="text-sm text-gray-500 mt-1">Define a faixa de notas dos exercícios</p>
      </div>
      <div className="grid grid-cols-2 gap-3 flex-1">
        {INSTRUMENTS.map((inst) => (
          <button key={inst.type} onClick={() => updateConfig({ instrument: inst.type })}
            className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${
              config.instrument === inst.type
                ? 'bg-neon-purple/15 border border-neon-purple/50 text-white'
                : 'bg-surface-700 border border-surface-600 text-gray-400 hover:border-gray-500'
            }`}>
            <span className="text-3xl">{inst.icon}</span>
            <span className="font-medium text-sm">{inst.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ClefStep({ config, updateConfig }: StepProps) {
  return (
    <div className="flex flex-col gap-5 flex-1">
      <div className="text-center">
        <div className="text-4xl mb-3">🎼</div>
        <h3 className="text-xl font-bold">Clave</h3>
        <p className="text-sm text-gray-500 mt-1">A clave que você lê normalmente</p>
      </div>
      <div className="flex gap-4 flex-1 items-center justify-center">
        {[
          { clef: 'treble' as const, icon: '𝄞', label: 'Clave de Sol', desc: 'Violino, Flauta, Guitarra', border: 'border-neon-cyan', bg: 'bg-neon-cyan' },
          { clef: 'bass' as const, icon: '𝄢', label: 'Clave de Fá', desc: 'Baixo, Piano (graves)', border: 'border-neon-purple', bg: 'bg-neon-purple' },
        ].map(({ clef, icon, label, desc, border, bg }) => (
          <button key={clef} onClick={() => updateConfig({ clef })}
            className={`flex-1 p-8 rounded-2xl flex flex-col items-center gap-4 transition-all ${
              config.clef === clef
                ? `${bg}/10 border-2 ${border}/50 text-white`
                : 'bg-surface-700 border border-surface-600 text-gray-400 hover:border-gray-500'
            }`}>
            <span className="text-6xl">{icon}</span>
            <div className="text-center">
              <div className="font-bold">{label}</div>
              <div className="text-xs text-gray-500 mt-1">{desc}</div>
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
    ['Instrumento', `${inst?.icon} ${inst?.label}`],
    ['Clave', config.clef === 'treble' ? '𝄞 Sol' : '𝄢 Fá'],
  ];
  return (
    <div className="flex flex-col gap-4 flex-1">
      <div className="text-center">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="text-xl font-bold">Tudo Pronto!</h3>
      </div>
      {rows.map(([label, value, accent]) => (
        <div key={label} className="bg-surface-700 rounded-xl p-3 flex justify-between items-center">
          <span className="text-gray-500 text-sm">{label}</span>
          <span className={`font-mono text-sm ${accent ?? 'text-white'}`}>{value ?? '—'}</span>
        </div>
      ))}
    </div>
  );
}
