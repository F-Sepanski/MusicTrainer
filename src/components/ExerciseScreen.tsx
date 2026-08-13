/**
 * ExerciseScreen — main practice screen that ties together
 * audio engine, VexFlow display, and tuner feedback.
 *
 * @module components/ExerciseScreen
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine, type PitchCallback } from '../audio/AudioEngine';
import { SheetMusicDisplay } from './SheetMusicDisplay';
import { TunerDisplay } from './TunerDisplay';
import { generateExercise, resetNoteIdCounter } from '../exercise/generator';
import type { ExerciseNote, ExerciseConfig, PitchData, SessionResult, AppPhase } from '../types';
import type { WizardConfig } from '../types/wizard';

const INSTRUMENTS = [
  { type: 'piano' as const, range: { min: 21, max: 108 } },
  { type: 'guitar' as const, range: { min: 40, max: 76 } },
  { type: 'violin' as const, range: { min: 55, max: 88 } },
  { type: 'flute' as const, range: { min: 60, max: 96 } },
  { type: 'saxophone' as const, range: { min: 37, max: 81 } },
  { type: 'trumpet' as const, range: { min: 55, max: 82 } },
  { type: 'voice' as const, range: { min: 48, max: 84 } },
  { type: 'other' as const, range: { min: 40, max: 84 } },
];

interface Props {
  wizardConfig?: WizardConfig | null;
}

export function ExerciseScreen({ wizardConfig }: Props) {
  const [phase, setPhase] = useState<AppPhase>('setup');

  // Build initial config from wizard settings
  const getInitialConfig = useCallback((): ExerciseConfig => {
    if (wizardConfig) {
      const inst = INSTRUMENTS.find((i) => i.type === wizardConfig.instrument);
      return {
        clef: wizardConfig.clef,
        noteCount: 12,
        minMidi: inst?.range.min ?? 60,
        maxMidi: inst?.range.max ?? 77,
        toleranceCents: wizardConfig.toleranceCents ?? 25,
        noteDelayMs: wizardConfig.noteDelayMs ?? 250,
      };
    }
    return { clef: 'treble', noteCount: 12, minMidi: 60, maxMidi: 77, toleranceCents: 25, noteDelayMs: 250 };
  }, [wizardConfig]);

  const [config, setConfig] = useState<ExerciseConfig>(getInitialConfig);
  const [notes, setNotes] = useState<ExerciseNote[]>([]);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [pitch, setPitch] = useState<PitchData | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [result, setResult] = useState<SessionResult | null>(null);

  const reactionTimesRef = useRef<number[]>([]);
  const centsOffsetsRef = useRef<number[]>([]);
  const noteShownAtRef = useRef<number>(Date.now());
  const lastPitchRef = useRef<PitchData | null>(null);
  const matchHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incorrectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Finish exercise (defined early so refs can reference it) ──────
  const finishExercise = useCallback(() => {
    const currentNotes = notesRef.current;
    const correctNotes = currentNotes.filter((n) => n.status === 'correct').length;
    const avgTime = reactionTimesRef.current.length > 0
      ? reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length
      : 0;
    const avgCents = centsOffsetsRef.current.length > 0
      ? centsOffsetsRef.current.reduce((a, b) => a + b, 0) / centsOffsetsRef.current.length
      : 0;

    setResult({
      totalNotes: currentNotes.length,
      correctNotes,
      averageResponseTimeMs: Math.round(avgTime),
      averageCentsOffset: Math.round(avgCents * 10) / 10,
      accuracy: Math.round((correctNotes / currentNotes.length) * 100),
    });
    setPhase('results');
  }, []);

  // Use refs for mutable state accessed in the audio callback to avoid stale closures
  const phaseRef = useRef(phase);
  const notesRef = useRef(notes);
  const currentNoteIndexRef = useRef(currentNoteIndex);
  const configRef = useRef(config);
  const finishExerciseRef = useRef(finishExercise);
  const wizardConfigRef = useRef(wizardConfig);

  // Keep refs in sync with state
  useEffect(() => { wizardConfigRef.current = wizardConfig; }, [wizardConfig]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { currentNoteIndexRef.current = currentNoteIndex; }, [currentNoteIndex]);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { finishExerciseRef.current = finishExercise; }, [finishExercise]);

  // Stable pitch callback — reads from refs, never stale
  const handlePitch: PitchCallback = useCallback((data) => {
    lastPitchRef.current = data;
    setPitch(data);

    const currentPhase = phaseRef.current;
    if (currentPhase !== 'playing') return;

    const currentNotes = notesRef.current;
    const idx = currentNoteIndexRef.current;
    const cfg = configRef.current;
    const currentNote = currentNotes[idx];
    if (!currentNote || currentNote.status === 'correct') return;

    const isCorrectNote = data.midiNote === currentNote.midiNote;
    const isInTolerance = Math.abs(data.cents) <= cfg.toleranceCents;
    const isConfident = data.confidence > 0.4;
    const volThreshold = wizardConfigRef.current?.volumeThreshold ?? 0.06;
    const hasVolume = data.volume > volThreshold;

    if (isCorrectNote && isInTolerance && isConfident && hasVolume) {
      // Cancel any pending incorrect timer
      if (incorrectTimerRef.current) {
        clearTimeout(incorrectTimerRef.current);
        incorrectTimerRef.current = null;
      }

      // Start hold timer — note must be held for delay to count
      if (!matchHoldTimerRef.current) {
        const delay = cfg.noteDelayMs;
        matchHoldTimerRef.current = setTimeout(() => {
          const reactionTime = Date.now() - noteShownAtRef.current;
          reactionTimesRef.current.push(reactionTime);
          centsOffsetsRef.current.push(data.cents);

          setNotes((prev) => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], status: 'correct' };
            return updated;
          });

          // Move to next note after a brief delay
          setTimeout(() => {
            setCurrentNoteIndex((prev) => {
              const next = prev + 1;
              if (next >= currentNotes.length) {
                finishExerciseRef.current();
                return prev;
              }
              noteShownAtRef.current = Date.now();
              return next;
            });
          }, delay);

          matchHoldTimerRef.current = null;
        }, delay);
      }
    } else if (hasVolume && !isCorrectNote) {
      // User played a wrong note — show incorrect then auto-advance
      if (!matchHoldTimerRef.current && !incorrectTimerRef.current) {
        incorrectTimerRef.current = setTimeout(() => {
          setNotes((prev) => {
            const updated = [...prev];
            if (updated[idx].status !== 'correct') {
              updated[idx] = { ...updated[idx], status: 'incorrect' };
            }
            return updated;
          });
          incorrectTimerRef.current = null;
          // Auto-advance to next note after marking incorrect
          setTimeout(() => {
            const currentIdx = currentNoteIndexRef.current;
            const currentNotes = notesRef.current;
            if (currentNotes[currentIdx]?.status === 'incorrect') {
              setCurrentNoteIndex((prev) => {
                const next = prev + 1;
                if (next >= currentNotes.length) {
                  finishExerciseRef.current();
                  return prev;
                }
                noteShownAtRef.current = Date.now();
                return next;
              });
            }
          }, 800);
        }, 400);
      }
    } else {
      // Cancel hold timer if note is lost (silence, wrong note, low confidence)
      if (matchHoldTimerRef.current) {
        clearTimeout(matchHoldTimerRef.current);
        matchHoldTimerRef.current = null;
      }
    }
  }, []); // Empty deps — all state read from refs

  // ─── Start audio engine (register once) ──────────────────
  useEffect(() => {
    const unsubscribe = audioEngine.onPitch(handlePitch);
    return () => {
      unsubscribe();
      if (matchHoldTimerRef.current) clearTimeout(matchHoldTimerRef.current);
      if (incorrectTimerRef.current) clearTimeout(incorrectTimerRef.current);
    };
  }, [handlePitch]);

  // ─── Update active note marker ───────────────────────────
  useEffect(() => {
    setNotes((prev) =>
      prev.map((n, i) => {
        // Don't overwrite correct/incorrect status for past notes
        if (i < currentNoteIndex && (n.status === 'correct' || n.status === 'incorrect')) return n;
        if (i < currentNoteIndex) return { ...n, status: 'correct' as const };
        if (i === currentNoteIndex) return { ...n, status: 'active' as const };
        return { ...n, status: 'pending' as const };
      })
    );
  }, [currentNoteIndex]);

  // ─── Start exercise ──────────────────────────────────────
  const startExercise = useCallback(async () => {
    resetNoteIdCounter();
    const newNotes = generateExercise(config);
    setNotes(newNotes);
    setCurrentNoteIndex(0);
    setResult(null);
    reactionTimesRef.current = [];
    centsOffsetsRef.current = [];
    noteShownAtRef.current = Date.now();

    // Start audio
    if (!audioEngine.isRunning) {
      await audioEngine.start(wizardConfigRef.current?.a4Frequency);
    }

    // Countdown
    setPhase('countdown');
    setCountdown(3);

    let count = 3;
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        setPhase('playing');
        noteShownAtRef.current = Date.now();
      }
    }, 1000);
  }, [config]);

  // ─── Keyboard: Space to skip note ────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || phaseRef.current !== 'playing') return;
      e.preventDefault();

      // Cancel any pending timers
      if (matchHoldTimerRef.current) {
        clearTimeout(matchHoldTimerRef.current);
        matchHoldTimerRef.current = null;
      }
      if (incorrectTimerRef.current) {
        clearTimeout(incorrectTimerRef.current);
        incorrectTimerRef.current = null;
      }

      const idx = currentNoteIndexRef.current;
      const currentNotes = notesRef.current;
      if (!currentNotes[idx]) return;

      // Mark current note as incorrect (skipped)
      setNotes((prev) => {
        const updated = [...prev];
        if (updated[idx].status !== 'correct') {
          updated[idx] = { ...updated[idx], status: 'incorrect' };
        }
        return updated;
      });

      // Advance to next note
      setTimeout(() => {
        setCurrentNoteIndex((prev) => {
          const next = prev + 1;
          if (next >= currentNotes.length) {
            finishExerciseRef.current();
            return prev;
          }
          noteShownAtRef.current = Date.now();
          return next;
        });
      }, 300);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Stop audio on unmount ───────────────────────────────
  useEffect(() => {
    return () => {
      audioEngine.stop();
    };
  }, []);

  // ─── Render ──────────────────────────────────────────────
  const currentNote = notes[currentNoteIndex];
  const targetMidi = currentNote?.midiNote ?? 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <header className="w-full max-w-4xl mb-8 text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
          ♪ MusicTrainer
        </h1>
        <p className="text-gray-500 text-sm mt-1">Sight Reading — Sprint 1 PoC</p>
      </header>

      {/* Setup Phase */}
      {phase === 'setup' && (
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <div className="bg-surface-800 rounded-2xl p-8 w-full max-w-md border border-surface-600">
            <h2 className="text-xl font-semibold mb-4 text-center">Configurar Exercício</h2>

            {/* Clef selector */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 block mb-2">Clave</label>
              <div className="flex gap-2">
                {(['treble', 'bass'] as const).map((clef) => (
                  <button
                    key={clef}
                    onClick={() => setConfig({ ...config, clef })}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                      config.clef === clef
                        ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50'
                        : 'bg-surface-700 text-gray-400 border border-surface-600 hover:border-gray-500'
                    }`}
                  >
                    {clef === 'treble' ? '𝄞 Clave de Sol' : '𝄢 Clave de Fá'}
                  </button>
                ))}
              </div>
            </div>

            {/* Note count */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 block mb-2">
                Número de Notas: <span className="text-white font-mono">{config.noteCount}</span>
              </label>
              <input
                type="range"
                min="4"
                max="32"
                value={config.noteCount}
                onChange={(e) => setConfig({ ...config, noteCount: parseInt(e.target.value) })}
                className="w-full accent-neon-cyan"
              />
            </div>

            {/* Tolerance */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 block mb-2">
                Tolerância: <span className="text-white font-mono">{config.toleranceCents} cents</span>
              </label>
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={config.toleranceCents}
                onChange={(e) => setConfig({ ...config, toleranceCents: parseInt(e.target.value) })}
                className="w-full accent-neon-emerald"
              />
            </div>

            {/* Start button */}
            <button
              onClick={startExercise}
              className="w-full py-3 rounded-xl font-bold text-lg bg-gradient-to-r from-neon-cyan to-neon-purple text-surface-900 hover:opacity-90 transition-opacity"
            >
              ▶ Iniciar Treino
            </button>
          </div>
        </div>
      )}

      {/* Countdown */}
      {phase === 'countdown' && (
        <div className="flex flex-col items-center justify-center animate-fade-in">
          <div className="text-9xl font-bold text-neon-cyan animate-pulse-glow">
            {countdown}
          </div>
          <p className="text-gray-400 mt-4">Preparar...</p>
        </div>
      )}

      {/* Playing Phase */}
      {(phase === 'playing' || phase === 'results') && (
        <div className="w-full max-w-4xl flex flex-col items-center gap-6 animate-fade-in">
          {/* Progress bar */}
          <div className="w-full max-w-2xl">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Nota {Math.min(currentNoteIndex + 1, notes.length)} de {notes.length}</span>
              <span>
                {notes.filter((n) => n.status === 'correct').length} acertos
              </span>
            </div>
            <div className="w-full h-2 bg-surface-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-neon-cyan to-neon-emerald rounded-full transition-all duration-300"
                style={{
                  width: `${(notes.filter((n) => n.status === 'correct').length / notes.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Sheet Music */}
          <div className="bg-surface-800 rounded-2xl p-6 w-full border border-surface-600 shadow-lg shadow-black/30">
            <SheetMusicDisplay
              notes={notes}
              clef={config.clef}
              width={850}
              height={220}
            />
          </div>

          {/* Tuner */}
          <div className="bg-surface-800 rounded-2xl p-4 w-full max-w-md border border-surface-600">
            <TunerDisplay
              pitch={pitch}
              targetMidi={targetMidi}
              toleranceCents={config.toleranceCents}
              volumeThreshold={wizardConfig?.volumeThreshold}
            />
          </div>

          {/* Results overlay */}
          {phase === 'results' && result && (
            <div className="bg-surface-800/95 backdrop-blur rounded-2xl p-8 w-full max-w-md border border-surface-600 animate-slide-up">
              <h2 className="text-2xl font-bold text-center mb-4 text-neon-emerald">
                🎉 Exercício Concluído!
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-surface-700 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-neon-cyan">{result.accuracy}%</div>
                  <div className="text-xs text-gray-400 mt-1">Precisão</div>
                </div>
                <div className="bg-surface-700 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-neon-purple">{result.averageResponseTimeMs}ms</div>
                  <div className="text-xs text-gray-400 mt-1">Tempo Médio</div>
                </div>
                <div className="bg-surface-700 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-neon-emerald">
                    {result.correctNotes}/{result.totalNotes}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Notas Acertadas</div>
                </div>
                <div className="bg-surface-700 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold" style={{
                    color: Math.abs(result.averageCentsOffset) <= config.toleranceCents ? '#10B981' : '#F43F5E'
                  }}>
                    {result.averageCentsOffset > 0 ? '+' : ''}{result.averageCentsOffset}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Cents Médio</div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={startExercise}
                  className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-neon-cyan to-neon-purple text-surface-900 hover:opacity-90 transition-opacity"
                >
                  🔄 Tentar Novamente
                </button>
                <button
                  onClick={() => { setPhase('setup'); audioEngine.stop(); }}
                  className="flex-1 py-3 rounded-xl font-bold bg-surface-700 border border-surface-600 hover:border-gray-500 transition-colors"
                >
                  ⚙ Configurar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
