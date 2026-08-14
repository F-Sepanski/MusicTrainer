/**
 * ChapterTrainingScreen — progressive chapter training with difficulty modes.
 * Supports mic input OR manual input (click/keyboard via adapted instrument widgets).
 *
 * @module components/ChapterTrainingScreen
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine, type PitchCallback } from '../audio/AudioEngine';
import { SheetMusicDisplay } from './SheetMusicDisplay';
import { Icon } from './Icon';
import { Button, Card, AnimatedSection, StatCard } from './ui';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../theme/ThemeContext';
import { appendHistory } from '../storage/storage';
import { generateExercise, resetNoteIdCounter, configFromExercise } from '../exercise/generator';
import { buildCurriculum } from '../exercise/curriculum';
import { AdaptedInstrumentInput } from './inputs';
import type { ExerciseNote, PitchData, AppPhase, SessionResult } from '../types';
import type { WizardConfig } from '../types/wizard';
import type { InputMode, Chapter, ChapterExercise } from '../exercise/curriculum';

interface Props {
  wizardConfig: WizardConfig;
  onExit: () => void;
}

const curriculum = buildCurriculum();

/** Max chapter index unlocked per level. */
const LEVEL_UNLOCK: Record<string, number> = {
  beginner: 3,
  learner: 5,
  intermediate: 7,
  experienced: 8,
  professional: 8,
};

export function ChapterTrainingScreen({ wizardConfig, onExit }: Props) {
  const { theme } = useTheme();
  // Chapter list gated by the user's level
  const maxUnlock = LEVEL_UNLOCK[wizardConfig.level] ?? 8;
  const unlocked = curriculum.filter((c) => c.index <= maxUnlock);
  const [chapter, setChapter] = useState<Chapter>(unlocked[0]);
  const [selectedExercise, setSelectedExercise] = useState<ChapterExercise>(unlocked[0].exercises[0]);
  // Input mode comes from the wizard config
  const [inputMode, setInputMode] = useState<InputMode>(wizardConfig.inputMode);

  const [phase, setPhase] = useState<AppPhase>('setup');
  const [notes, setNotes] = useState<ExerciseNote[]>([]);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [pitch, setPitch] = useState<PitchData | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [result, setResult] = useState<SessionResult | null>(null);

  const reactionTimesRef = useRef<number[]>([]);
  const centsOffsetsRef = useRef<number[]>([]);
  const noteShownAtRef = useRef<number>(Date.now());
  const matchHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incorrectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs to avoid stale closures in callbacks
  const phaseRef = useRef(phase);
  const notesRef = useRef(notes);
  const currentNoteIndexRef = useRef(currentNoteIndex);
  const chapterRef = useRef(chapter);
  const exerciseRef = useRef(selectedExercise);
  const inputModeRef = useRef(inputMode);
  const wizardRef = useRef(wizardConfig);
  const finishRef = useRef(finishExercise);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { currentNoteIndexRef.current = currentNoteIndex; }, [currentNoteIndex]);
  useEffect(() => { chapterRef.current = chapter; }, [chapter]);
  useEffect(() => { exerciseRef.current = selectedExercise; }, [selectedExercise]);
  useEffect(() => { inputModeRef.current = inputMode; }, [inputMode]);
  useEffect(() => { wizardRef.current = wizardConfig; }, [wizardConfig]);
  useEffect(() => { finishRef.current = finishExercise; }, []);

  // ─── Finish exercise ──────────────────────────────────────
  function finishExercise() {
    const currentNotes = notesRef.current;
    const ch = chapterRef.current;
    const correctNotes = currentNotes.filter((n) => n.status === 'correct').length;
    const avgTime = reactionTimesRef.current.length > 0
      ? reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length
      : 0;
    const avgCents = centsOffsetsRef.current.length > 0
      ? centsOffsetsRef.current.reduce((a, b) => a + b, 0) / centsOffsetsRef.current.length
      : 0;

    const res: SessionResult = {
      totalNotes: currentNotes.length,
      correctNotes,
      averageResponseTimeMs: Math.round(avgTime),
      averageCentsOffset: Math.round(avgCents * 10) / 10,
      accuracy: Math.round((correctNotes / currentNotes.length) * 100),
    };

    appendHistory({
      ...res,
      levelName: `Capítulo ${ch.index}: ${ch.title}`,
      clef: ch.range.min < 55 ? 'bass' : 'treble',
      instrument: wizardRef.current.instrument,
    });

    setResult(res);
    setPhase('results');
  }

  // ─── Mark current note correct & advance ─────────────────
  const registerCorrect = useCallback(() => {
    const idx = currentNoteIndexRef.current;
    const currentNotes = notesRef.current;
    reactionTimesRef.current.push(Date.now() - noteShownAtRef.current);
    centsOffsetsRef.current.push(0);

    setNotes((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], status: 'correct' };
      return updated;
    });

    setTimeout(() => {
      setCurrentNoteIndex((prev) => {
        const next = prev + 1;
        if (next >= currentNotes.length) {
          finishRef.current();
          return prev;
        }
        noteShownAtRef.current = Date.now();
        return next;
      });
    }, 200);
  }, []);

  // ─── Mark current note incorrect & advance ───────────────
  const registerIncorrect = useCallback(() => {
    const idx = currentNoteIndexRef.current;
    setNotes((prev) => {
      const updated = [...prev];
      if (updated[idx].status !== 'correct') updated[idx] = { ...updated[idx], status: 'incorrect' };
      return updated;
    });
    // Auto-advance after delay
    setTimeout(() => {
      setCurrentNoteIndex((prev) => {
        const next = prev + 1;
        if (next >= notesRef.current.length) {
          finishRef.current();
          return prev;
        }
        noteShownAtRef.current = Date.now();
        return next;
      });
    }, 400);
  }, []);

  // ─── Mic pitch handling ──────────────────────────────────
  const handlePitch: PitchCallback = useCallback((data) => {
    setPitch(data);
    if (phaseRef.current !== 'playing' || inputModeRef.current !== 'mic') return;

    const currentNote = notesRef.current[currentNoteIndexRef.current];
    if (!currentNote || currentNote.status === 'correct') return;

    const wcfg = wizardRef.current;
    const isCorrectNote = data.midiNote === currentNote.midiNote;
    const isInTolerance = Math.abs(data.cents) <= wcfg.toleranceCents;
    const isConfident = data.confidence > 0.4;
    const hasVolume = data.volume > wcfg.volumeThreshold;

    if (isCorrectNote && isInTolerance && isConfident && hasVolume) {
      if (incorrectTimerRef.current) { clearTimeout(incorrectTimerRef.current); incorrectTimerRef.current = null; }
      if (!matchHoldTimerRef.current) {
        const delay = wcfg.noteDelayMs ?? 250;
        matchHoldTimerRef.current = setTimeout(() => {
          matchHoldTimerRef.current = null;
          registerCorrect();
        }, delay);
      }
    } else if (hasVolume && !isCorrectNote) {
      if (!matchHoldTimerRef.current && !incorrectTimerRef.current) {
        incorrectTimerRef.current = setTimeout(() => {
          incorrectTimerRef.current = null;
          registerIncorrect();
        }, 400);
      }
    } else {
      if (matchHoldTimerRef.current) {
        clearTimeout(matchHoldTimerRef.current);
        matchHoldTimerRef.current = null;
      }
    }
  }, [registerCorrect, registerIncorrect]);

  useEffect(() => {
    const unsub = audioEngine.onPitch(handlePitch);
    return () => {
      unsub();
      if (matchHoldTimerRef.current) clearTimeout(matchHoldTimerRef.current);
      if (incorrectTimerRef.current) clearTimeout(incorrectTimerRef.current);
    };
  }, [handlePitch]);

  // ─── Start exercise ──────────────────────────────────────
  const startExercise = useCallback(async () => {
    resetNoteIdCounter();
    const ch = chapterRef.current;
    const exercise = exerciseRef.current;
    const wcfg = wizardRef.current;

    const config = configFromExercise(ch, exercise, {
      toleranceCents: wcfg.toleranceCents,
      noteDelayMs: wcfg.noteDelayMs,
    });

    const newNotes = generateExercise(config);
    setNotes(newNotes);
    setCurrentNoteIndex(0);
    setResult(null);
    reactionTimesRef.current = [];
    centsOffsetsRef.current = [];
    noteShownAtRef.current = Date.now();

    // Start audio only if mic mode
    if (inputModeRef.current === 'mic' && !audioEngine.isRunning) {
      try {
        await audioEngine.start(wcfg.a4Frequency);
      } catch {
        setInputMode('manual');
      }
    }

    setPhase('countdown');
    setCountdown(3);
    // Quick 600ms transition instead of a long 3s countdown
    setTimeout(() => {
      setPhase('playing');
      noteShownAtRef.current = Date.now();
    }, 600);
  }, []);

  // ─── Manual note input ───────────────────────────────────
  const handleManualNote = useCallback((midi: number) => {
    if (phaseRef.current !== 'playing' || inputModeRef.current !== 'manual') return;
    const currentNote = notesRef.current[currentNoteIndexRef.current];
    if (!currentNote || currentNote.status === 'correct') return;

    setPitch({ frequency: 0, midiNote: midi, noteName: '', cents: 0, volume: 0.5, confidence: 1 });

    if (midi === currentNote.midiNote) {
      registerCorrect();
    } else {
      registerIncorrect();
    }
  }, [registerCorrect, registerIncorrect]);

  // ─── Keyboard input for manual mode ──────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing' || inputModeRef.current !== 'manual') return;
      // Map keyboard rows to MIDI notes (A0..)
      const keyMap: Record<string, number> = {
        a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69,
        u: 70, j: 71, k: 72, o: 73, l: 74, p: 75, ';': 76,
      };
      const note = keyMap[e.key.toLowerCase()];
      if (note !== undefined) handleManualNote(note);
      // Space skips
      if (e.code === 'Space') {
        e.preventDefault();
        const current = notesRef.current[currentNoteIndexRef.current];
        if (current) registerIncorrect();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualNote, registerIncorrect]);

  // ─── Stop audio on unmount ───────────────────────────────
  useEffect(() => {
    return () => { audioEngine.stop(); };
  }, []);

  // ─── Render helpers ──────────────────────────────────────
  const currentNote = notes[currentNoteIndex];
  const targetMidi = currentNote?.midiNote ?? 0;
  const correctCount = notes.filter((n) => n.status === 'correct').length;

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col items-center px-4 py-6">
      {/* Header */}
      <header className="w-full max-w-4xl mb-6 flex items-center justify-between">
        <button onClick={onExit} className="p-2 rounded-lg bg-surface-700 border border-surface hover:border-gray-400 transition-all" aria-label="Sair">
          <Icon name="back" size={18} />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-bold gradient-text">Treinamento por Capítulos</h1>
          <div className="text-xs text-secondary">Capítulo {chapter.index}: {chapter.title}</div>
        </div>
        <ThemeToggle />
      </header>

      {/* Setup / Chapter selection */}
      {phase === 'setup' && (
        <AnimatedSection type="slide-up" className="w-full max-w-4xl">
          {/* Chapter selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {curriculum.map((ch) => {
              const isLocked = ch.index > maxUnlock;
              const isSelected = chapter.id === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => { if (!isLocked) { setChapter(ch); setSelectedExercise(ch.exercises[0]); } }}
                  disabled={isLocked}
                  className={`p-3 rounded-xl text-left transition-all ${
                    isLocked
                      ? 'bg-surface-800 border border-surface opacity-50 cursor-not-allowed'
                      : isSelected
                      ? 'bg-neon-cyan/10 border border-neon-cyan/50'
                      : 'bg-surface-700 border border-surface hover:border-gray-400 card-hover'
                  }`}
                >
                  <div className="text-xs font-bold text-secondary">Cap {ch.index}</div>
                  <div className="text-sm font-semibold truncate">
                    {isLocked ? (
                      <span className="text-muted flex items-center gap-1">
                        <Icon name="lock" size={12} /> {ch.title}
                      </span>
                    ) : ch.title}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Exercise selector */}
          <Card className="p-6 mb-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Icon name="target" size={18} className="text-neon-cyan" />
              Exercícios do Capítulo {chapter.index}
            </h3>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {chapter.exercises.map((ex, i) => {
                const isSelected = selectedExercise?.id === ex.id;
                return (
                  <button
                    key={ex.id}
                    onClick={() => setSelectedExercise(ex)}
                    className={`p-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-neon-cyan/10 border border-neon-cyan/50'
                        : 'bg-surface-700 border border-surface hover:border-gray-400 card-hover'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isSelected ? 'bg-neon-cyan text-surface-900' : 'bg-surface-600 text-secondary'
                    }`}>
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{ex.title}</div>
                      <div className="text-xs text-muted">{ex.description}</div>
                    </div>
                    {ex.focusNote !== undefined && (
                      <span className="ml-auto text-lg font-bold text-neon-cyan">{pcToName(ex.focusNote)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Input mode */}
          <Card className="p-6 mb-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Icon name="mic" size={18} className="text-neon-cyan" />
              Entrada de Notas
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setInputMode('mic')}
                className={`py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  inputMode === 'mic'
                    ? 'bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan'
                    : 'bg-surface-700 border border-surface text-secondary hover:border-gray-400'
                }`}
              >
                <Icon name="mic" size={18} />
                Microfone
              </button>
              <button
                onClick={() => setInputMode('manual')}
                className={`py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  inputMode === 'manual'
                    ? 'bg-neon-purple/15 border border-neon-purple/50 text-neon-purple'
                    : 'bg-surface-700 border border-surface text-secondary hover:border-gray-400'
                }`}
              >
                <Icon name="keyboard" size={18} />
                Manual (clique/teclado)
              </button>
            </div>
          </Card>

          <Button variant="primary" size="lg" icon="play" onClick={startExercise} className="w-full">
            Iniciar Treino
          </Button>
        </AnimatedSection>
      )}

      {/* Countdown */}
      {phase === 'countdown' && (
        <div className="flex flex-col items-center justify-center flex-1 animate-scale-in">
          <div className="w-20 h-20 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
            <div className="text-4xl font-bold text-neon-cyan animate-pulse-glow">3</div>
          </div>
          <p className="text-secondary mt-4 text-sm">Preparar...</p>
        </div>
      )}

      {/* Playing / Results */}
      {(phase === 'playing' || phase === 'results') && (
        <div className="w-full max-w-4xl flex flex-col items-center gap-5">
          {/* Progress */}
          <div className="w-full max-w-2xl">
            <div className="flex justify-between text-xs text-secondary mb-1">
              <span>Cap {chapter.index} · {selectedExercise?.title ?? chapter.title} · Nota {Math.min(currentNoteIndex + 1, notes.length)}/{notes.length}</span>
              <span className="text-neon-emerald">{correctCount} acertos</span>
            </div>
            <div className="w-full h-2 bg-surface-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-neon-cyan to-neon-emerald rounded-full transition-all duration-300"
                style={{ width: `${(correctCount / Math.max(notes.length, 1)) * 100}%` }} />
            </div>
          </div>

          {/* Sheet music with key signature */}
          <Card className="p-6 w-full">
            <SheetMusicDisplay notes={notes} clef={selectedExercise?.clef ?? (chapter.range.min < 55 ? 'bass' : 'treble')} width={850} height={220} theme={theme} keyFifths={selectedExercise?.keyFifths ?? chapter.keySignature.fifths} />
          </Card>

          {/* Manual / mic input */}
          <Card className="p-4 w-full">
            {inputMode === 'manual' ? (
              <div>
                <div className="text-center mb-3 text-sm text-secondary">
                  Leia a partitura e toque a nota clicando ou usando o teclado
                </div>
                <AdaptedInstrumentInput manualType={wizardConfig.manualType} onNote={handleManualNote} />
                <div className="text-center text-xs text-muted mt-2">
                  Teclado: A,W,S,E,D,F,T,G,Y,H,U,J,K,O,L,P · Espaço para pular
                </div>
              </div>
            ) : (
              <TunerMini pitch={pitch} targetMidi={targetMidi} toleranceCents={wizardConfig.toleranceCents} volumeThreshold={wizardConfig.volumeThreshold} />
            )}
          </Card>

          {/* Results */}
          {phase === 'results' && result && (
            <AnimatedSection type="slide-up" className="w-full max-w-md">
              <Card className="p-8 text-center">
                <div className="flex justify-center mb-3 text-neon-emerald animate-scale-in">
                  <Icon name="check" size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-5 text-neon-emerald">Capítulo Concluído!</h2>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <StatCard label="Precisão" value={`${result.accuracy}%`} color="text-neon-cyan" />
                  <StatCard label="Tempo Médio" value={`${result.averageResponseTimeMs}ms`} color="text-neon-purple" />
                  <StatCard label="Acertos" value={`${result.correctNotes}/${result.totalNotes}`} color="text-neon-emerald" />
                  <StatCard label="Desvio" value={`${result.averageCentsOffset}¢`} />
                </div>
                <div className="flex gap-3">
                  <Button variant="primary" icon="play" onClick={startExercise} className="flex-1">Repetir</Button>
                  <Button variant="secondary" icon="home" onClick={onExit}>Menu</Button>
                </div>
              </Card>
            </AnimatedSection>
          )}
        </div>
      )}
    </div>
  );
}

/** Convert pitch class to note name for display. */
function pcToName(pc: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return names[((pc % 12) + 12) % 12];
}

/** Minimal tuner display for mic mode. */
function TunerMini({ pitch, targetMidi, toleranceCents, volumeThreshold }: {
  pitch: PitchData | null; targetMidi: number; toleranceCents: number; volumeThreshold: number;
}) {
  const isMatch = pitch?.midiNote === targetMidi && pitch.volume > volumeThreshold;
  const active = pitch && pitch.volume > 0;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`text-4xl font-bold ${isMatch ? 'text-neon-emerald' : active ? 'text-neon-cyan' : 'text-muted'}`}>
        {active ? pitch?.noteName : '—'}
      </div>
      <div className="w-full max-w-xs h-3 bg-surface-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-75"
          style={{
            width: `${Math.min((pitch?.volume ?? 0) * 500, 100)}%`,
            backgroundColor: (pitch?.volume ?? 0) > volumeThreshold ? '#00F2FE' : 'var(--bg-surface-600)',
          }} />
      </div>
      <div className={`text-xs px-3 py-1 rounded-full ${isMatch ? 'bg-neon-emerald/15 text-neon-emerald' : active ? 'bg-neon-cyan/10 text-neon-cyan' : 'text-muted bg-surface-700'}`}>
        {isMatch ? 'Nota correta!' : active ? 'Toque a nota alvo...' : 'Aguardando microfone...'}
      </div>
    </div>
  );
}
