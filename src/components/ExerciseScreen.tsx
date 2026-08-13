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
import { Icon } from './Icon';
import { Button, Card, AnimatedSection, StatCard, Slider } from './ui';
import { useTheme } from '../theme/ThemeContext';
import { appendHistory } from '../storage/storage';
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
  onExit?: () => void;
}

export function ExerciseScreen({ wizardConfig, onExit }: Props) {
  const { theme } = useTheme();
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
    const cfg = configRef.current;
    const wcfg = wizardConfigRef.current;
    const correctNotes = currentNotes.filter((n) => n.status === 'correct').length;
    const avgTime = reactionTimesRef.current.length > 0
      ? reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length
      : 0;
    const avgCents = centsOffsetsRef.current.length > 0
      ? centsOffsetsRef.current.reduce((a, b) => a + b, 0) / centsOffsetsRef.current.length
      : 0;

    const result: SessionResult = {
      totalNotes: currentNotes.length,
      correctNotes,
      averageResponseTimeMs: Math.round(avgTime),
      averageCentsOffset: Math.round(avgCents * 10) / 10,
      accuracy: Math.round((correctNotes / currentNotes.length) * 100),
    };

    // Persist to history
    appendHistory({
      totalNotes: result.totalNotes,
      correctNotes: result.correctNotes,
      averageResponseTimeMs: result.averageResponseTimeMs,
      averageCentsOffset: result.averageCentsOffset,
      accuracy: result.accuracy,
      levelName: `Treino de ${wcfg?.clef === 'bass' ? 'Fá' : 'Sol'}`,
      clef: cfg.clef,
      instrument: wcfg?.instrument ?? 'other',
    });

    setResult(result);
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
  const correctCount = notes.filter((n) => n.status === 'correct').length;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <header className="w-full max-w-4xl mb-8 flex items-center justify-between">
        {onExit ? (
          <button
            onClick={onExit}
            className="p-2 rounded-lg bg-surface-700 border border-surface hover:border-gray-400 transition-all"
            aria-label="Sair"
          >
            <Icon name="back" size={18} />
          </button>
        ) : <div />}
        <div className="flex items-center gap-2">
          <Icon name="music" size={24} className="text-neon-cyan" />
          <h1 className="text-2xl font-bold gradient-text">MusicTrainer</h1>
        </div>
        <div className="w-10" />
      </header>

      {/* Setup Phase */}
      {phase === 'setup' && (
        <AnimatedSection type="scale-in" className="w-full max-w-md">
          <Card className="p-8">
            <h2 className="text-xl font-semibold mb-4 text-center flex items-center justify-center gap-2">
              <Icon name="settings" size={20} className="text-neon-cyan" />
              Configurar Exercício
            </h2>

            <div className="mb-4">
              <label className="text-sm text-secondary block mb-2">Número de Notas</label>
              <Slider label="Número de Notas" value={config.noteCount}
                onChange={(v) => setConfig({ ...config, noteCount: v })}
                min={4} max={32} accent="cyan" />
            </div>

            <div className="flex gap-3">
              <Button variant="primary" size="lg" icon="play" onClick={startExercise} className="flex-1">
                Iniciar Treino
              </Button>
            </div>
          </Card>
        </AnimatedSection>
      )}

      {/* Countdown */}
      {phase === 'countdown' && (
        <div className="flex flex-col items-center justify-center animate-fade-in">
          <div className="text-9xl font-bold text-neon-cyan animate-pulse-glow">
            {countdown}
          </div>
          <p className="text-secondary mt-4">Preparar...</p>
        </div>
      )}

      {/* Playing Phase */}
      {(phase === 'playing' || phase === 'results') && (
        <div className="w-full max-w-4xl flex flex-col items-center gap-6 animate-fade-in">
          {/* Progress bar */}
          <div className="w-full max-w-2xl">
            <div className="flex justify-between text-xs text-secondary mb-1">
              <span>Nota {Math.min(currentNoteIndex + 1, notes.length)} de {notes.length}</span>
              <span className="text-neon-emerald">{correctCount} acertos</span>
            </div>
            <div className="w-full h-2 bg-surface-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-neon-cyan to-neon-emerald rounded-full transition-all duration-300"
                style={{ width: `${(correctCount / notes.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Sheet Music */}
          <Card className="p-6 w-full">
            <SheetMusicDisplay notes={notes} clef={config.clef} width={850} height={220} theme={theme} />
          </Card>

          {/* Tuner */}
          <Card className="p-4 w-full max-w-md">
            <TunerDisplay
              pitch={pitch}
              targetMidi={targetMidi}
              toleranceCents={config.toleranceCents}
              volumeThreshold={wizardConfig?.volumeThreshold}
            />
          </Card>

          {/* Results overlay */}
          {phase === 'results' && result && (
            <AnimatedSection type="slide-up" className="w-full max-w-md">
              <Card className="p-8 text-center">
                <div className="flex justify-center mb-3 text-neon-emerald animate-scale-in">
                  <Icon name="check" size={40} />
                </div>
                <h2 className="text-2xl font-bold text-center mb-5 text-neon-emerald">
                  Exercício Concluído!
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-surface-700 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-neon-cyan">{result.accuracy}%</div>
                    <div className="text-xs text-secondary mt-1">Precisão</div>
                  </div>
                  <div className="bg-surface-700 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-neon-purple">{result.averageResponseTimeMs}ms</div>
                    <div className="text-xs text-secondary mt-1">Tempo Médio</div>
                  </div>
                  <div className="bg-surface-700 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-neon-emerald">
                      {result.correctNotes}/{result.totalNotes}
                    </div>
                    <div className="text-xs text-secondary mt-1">Notas Acertadas</div>
                  </div>
                  <div className="bg-surface-700 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold" style={{
                      color: Math.abs(result.averageCentsOffset) <= config.toleranceCents ? '#10B981' : '#F43F5E'
                    }}>
                      {result.averageCentsOffset > 0 ? '+' : ''}{result.averageCentsOffset}
                    </div>
                    <div className="text-xs text-secondary mt-1">Cents Médio</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="primary" icon="play" onClick={startExercise} className="flex-1">
                    Tentar Novamente
                  </Button>
                  {onExit && (
                    <Button variant="secondary" icon="home" onClick={onExit}>
                      Início
                    </Button>
                  )}
                </div>
              </Card>
            </AnimatedSection>
          )}
        </div>
      )}
    </div>
  );
}
