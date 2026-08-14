/**
 * ChapterTrainingScreen — progressive chapter training with difficulty modes.
 * Supports mic input OR manual input (click/keyboard via adapted instrument widgets).
 * Includes an interactive Keyboard Typing HUD with arrow-key accidentals (↑ ♯ / ↓ ♭)
 * and countdown progress animation.
 *
 * @module components/ChapterTrainingScreen
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { audioEngine, type PitchCallback } from '../audio/AudioEngine';
import { SheetMusicDisplay } from './SheetMusicDisplay';
import { Icon } from './Icon';
import { Button, Card, AnimatedSection, StatCard } from './ui';
import { AppLayout } from './AppLayout';
import { SettingsModal } from './SettingsModal';
import { useTheme } from '../theme/ThemeContext';
import { appendHistory } from '../storage/storage';
import { generateExercise, resetNoteIdCounter, configFromExercise } from '../exercise/generator';
import { buildCurriculum } from '../exercise/curriculum';
import { AdaptedInstrumentInput, NoteLabelDisplay } from './inputs';
import { parseNoteToMidi } from '../audio/noteFrequencies';
import type { ExerciseNote, PitchData, AppPhase, SessionResult } from '../types';
import type { WizardConfig } from '../types/wizard';
import type { InputMode, Chapter, ChapterExercise } from '../exercise/curriculum';

interface Props {
  wizardConfig: WizardConfig;
  onExit: () => void;
  onUpdateConfig?: (config: WizardConfig) => void;
}

/** Max chapter index unlocked per level. */
const LEVEL_UNLOCK: Record<string, number> = {
  beginner: 3,
  learner: 5,
  intermediate: 7,
  experienced: 8,
  professional: 8,
};

function getNoteDisplayName(
  letter: string,
  accidental: 'sharp' | 'flat' | null,
  octave: string,
  notation: 'letters' | 'solfege'
): string {
  const map: Record<string, string> = {
    C: 'Dó',
    D: 'Ré',
    E: 'Mi',
    F: 'Fá',
    G: 'Sol',
    A: 'Lá',
    B: 'Si',
  };
  const base = notation === 'solfege' ? (map[letter] ?? letter) : letter;
  const acc = accidental === 'sharp' ? '#' : accidental === 'flat' ? 'b' : '';
  return `${base}${acc}${octave}`;
}

export function ChapterTrainingScreen({ wizardConfig, onExit, onUpdateConfig }: Props) {
  const { config: themeConfig } = useTheme();
  const theme = themeConfig.mode;
  const [showSettings, setShowSettings] = useState(false);

  // Dynamic curriculum that respects the user's notation system
  const curriculum = useMemo(
    () => buildCurriculum(wizardConfig.notationSystem ?? 'letters'),
    [wizardConfig.notationSystem]
  );

  // Chapter list gated by the user's level
  const maxUnlock = LEVEL_UNLOCK[wizardConfig.level] ?? 8;
  const unlocked = useMemo(
    () => curriculum.filter((c) => c.index <= maxUnlock),
    [curriculum, maxUnlock]
  );

  const [chapter, setChapter] = useState<Chapter>(unlocked[0]);
  const [selectedExercise, setSelectedExercise] = useState<ChapterExercise>(unlocked[0].exercises[0]);

  // Keep chapter and selected exercise synced when notation changes
  useEffect(() => {
    const currentCh = unlocked.find((c) => c.id === chapter.id) ?? unlocked[0];
    if (currentCh) {
      setChapter(currentCh);
      const currentEx = currentCh.exercises.find((e) => e.id === selectedExercise.id) ?? currentCh.exercises[0];
      if (currentEx) setSelectedExercise(currentEx);
    }
  }, [curriculum, unlocked]);

  // Input mode comes from the wizard config
  const [inputMode, setInputMode] = useState<InputMode>(wizardConfig.inputMode);

  const [phase, setPhase] = useState<AppPhase>('setup');
  const [notes, setNotes] = useState<ExerciseNote[]>([]);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [pitch, setPitch] = useState<PitchData | null>(null);
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

  // Sync input mode when the config changes on-the-fly.
  useEffect(() => {
    setInputMode(wizardConfig.inputMode);
  }, [wizardConfig.inputMode]);

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
      levelName: `${ch.title} - ${exerciseRef.current.title}`,
      clef: exerciseRef.current.clef ?? (ch.range.min < 55 ? 'bass' : 'treble'),
      instrument: wizardRef.current.instrument,
    });

    setResult(res);
    setPhase('results');
  }

  // ─── Mark current note answer & advance (atomic, zero race conditions) ──
  const registerAnswer = useCallback((isCorrect: boolean) => {
    const idx = currentNoteIndexRef.current;
    const currentNotes = notesRef.current;
    if (idx >= currentNotes.length) return;

    // Advance ref immediately to prevent any race condition during fast typing/clicking
    currentNoteIndexRef.current = idx + 1;

    reactionTimesRef.current.push(Date.now() - noteShownAtRef.current);
    centsOffsetsRef.current.push(0);
    noteShownAtRef.current = Date.now();

    const status = isCorrect ? 'correct' : 'incorrect';

    setNotes((prev) => {
      const updated = [...prev];
      if (idx < updated.length) {
        updated[idx] = { ...updated[idx], status };
      }
      return updated;
    });

    const next = idx + 1;
    if (next >= currentNotes.length) {
      setCurrentNoteIndex(next);
      setTimeout(() => {
        finishRef.current();
      }, 300);
    } else {
      setCurrentNoteIndex(next);
    }
  }, []);

  const registerCorrect = useCallback(() => registerAnswer(true), [registerAnswer]);
  const registerIncorrect = useCallback(() => registerAnswer(false), [registerAnswer]);

  const effectiveOctaveShift = inputMode === 'manual'
    ? (wizardConfig.manualType === 'guitar' ? -1 : 0)
    : (wizardConfig.octaveShift ?? (wizardConfig.instrument === 'guitar' ? -1 : 0));

  // ─── Mic pitch handling ──────────────────────────────────
  const handlePitch: PitchCallback = useCallback((data) => {
    if (phaseRef.current !== 'playing') return;
    setPitch(data);

    const currentNote = notesRef.current[currentNoteIndexRef.current];
    if (!currentNote || currentNote.status === 'correct') return;

    // Shift detected mic pitch according to octave shift setting (e.g. -1 octave for guitar: heard E2=40 transposed to E3=52)
    const shiftedMidi = data.midiNote - (effectiveOctaveShift * 12);

    const midiMatches = shiftedMidi === currentNote.midiNote;
    const inTolerance = Math.abs(data.cents) <= wizardRef.current.toleranceCents;
    const loudEnough = data.volume >= wizardRef.current.volumeThreshold;
    const confident = data.confidence > 0.8;

    if (midiMatches && inTolerance && loudEnough && confident) {
      if (incorrectTimerRef.current) {
        clearTimeout(incorrectTimerRef.current);
        incorrectTimerRef.current = null;
      }
      if (!matchHoldTimerRef.current) {
        matchHoldTimerRef.current = setTimeout(() => {
          registerCorrect();
          matchHoldTimerRef.current = null;
        }, wizardRef.current.noteDelayMs);
      }
    } else {
      if (matchHoldTimerRef.current) {
        clearTimeout(matchHoldTimerRef.current);
        matchHoldTimerRef.current = null;
      }
    }
  }, [registerCorrect, effectiveOctaveShift]);

  // ─── Start training session ──────────────────────────────
  const handleStart = useCallback(async () => {
    resetNoteIdCounter();
    const config = configFromExercise(chapter, selectedExercise, { noteCount: wizardConfig.noteCount ?? 12 });
    const generatedNotes = generateExercise(config);
    setNotes(generatedNotes);
    setCurrentNoteIndex(0);
    setResult(null);
    reactionTimesRef.current = [];
    centsOffsetsRef.current = [];

    if (inputMode === 'mic') {
      try {
        audioEngine.onPitch(handlePitch);
        await audioEngine.start(wizardConfig.a4Frequency);
      } catch (err) {
        console.error('Failed to start audio engine:', err);
        return;
      }
    }

    setPhase('playing');
    noteShownAtRef.current = Date.now();
  }, [selectedExercise, chapter, wizardConfig, inputMode, handlePitch]);

  // ─── Manual note input ───────────────────────────────────
  const handleManualNote = useCallback((midi: number, isPitchClassOnly = false) => {
    if (phaseRef.current !== 'playing' || inputModeRef.current !== 'manual') return;
    const currentNote = notesRef.current[currentNoteIndexRef.current];
    if (!currentNote || currentNote.status === 'correct') return;

    // Guitar fretboard produces physical guitar pitch (E2=40..E5=76), matching 8vb written treble stave
    const effMidi = wizardRef.current.manualType === 'guitar' && effectiveOctaveShift === -1
      ? midi + 12
      : midi;

    setPitch({ frequency: 0, midiNote: effMidi, noteName: '', cents: 0, volume: 0.5, confidence: 1 });

    const currentPc = ((currentNote.midiNote % 12) + 12) % 12;
    const playedPc = ((effMidi % 12) + 12) % 12;

    const isMatch = isPitchClassOnly || wizardRef.current.manualType === 'circle'
      ? currentPc === playedPc
      : effMidi === currentNote.midiNote;

    if (isMatch) {
      registerCorrect();
    } else {
      registerIncorrect();
    }
  }, [registerCorrect, registerIncorrect, effectiveOctaveShift]);

  // ─── Octave Memory & Keyboard Typing State ────────────────
  const lastOctaveRef = useRef<number>(4);

  const [typingState, setTypingState] = useState<{
    id: number;
    noteLetter: string;
    accidental: 'sharp' | 'flat' | null;
    octave: string;
    contextOctave: number;
    totalMs: number;
  } | null>(null);

  const typingStateRef = useRef<{
    id: number;
    noteLetter: string;
    accidental: 'sharp' | 'flat' | null;
    octave: string;
    timer: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  const clearTypingBuffer = useCallback(() => {
    if (typingStateRef.current?.timer) {
      clearTimeout(typingStateRef.current.timer);
    }
    typingStateRef.current = null;
    setTypingState(null);
  }, []);

  const commitTypingBuffer = useCallback(() => {
    const current = typingStateRef.current;
    if (!current) return;
    const { noteLetter, accidental, octave } = current;
    clearTypingBuffer();

    // Use typed octave if present, otherwise fall back to context/last octave
    const effOctave = octave !== '' ? parseInt(octave, 10) : lastOctaveRef.current;
    if (octave !== '') {
      lastOctaveRef.current = effOctave;
    }

    const accStr = accidental === 'sharp' ? '#' : accidental === 'flat' ? 'b' : '';
    const noteStr = `${noteLetter}${accStr}${effOctave}`;

    const parsedMidi = parseNoteToMidi(noteStr);
    if (parsedMidi !== null) {
      handleManualNote(parsedMidi, false);
    }
  }, [clearTypingBuffer, handleManualNote]);

  const startOrUpdateTyping = useCallback(
    (noteLetter: string, accidental: 'sharp' | 'flat' | null, octave: string, totalMs = 850) => {
      if (typingStateRef.current?.timer) {
        clearTimeout(typingStateRef.current.timer);
      }

      const id = Date.now();
      setTypingState({
        id,
        noteLetter,
        accidental,
        octave,
        contextOctave: lastOctaveRef.current,
        totalMs,
      });

      const timer = setTimeout(() => {
        commitTypingBuffer();
      }, totalMs);

      typingStateRef.current = {
        id,
        noteLetter,
        accidental,
        octave,
        timer,
      };
    },
    [commitTypingBuffer]
  );

  // ─── Keyboard Event Listener (Only deliberate musical notes) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing' || inputModeRef.current !== 'manual') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Space skips current note
      if (e.code === 'Space') {
        e.preventDefault();
        clearTypingBuffer();
        const current = notesRef.current[currentNoteIndexRef.current];
        if (current) registerIncorrect();
        return;
      }

      // If buffer is currently active:
      if (typingStateRef.current) {
        const cur = typingStateRef.current;

        // ArrowUp: toggle/set sharp (♯)
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const nextAcc = cur.accidental === 'sharp' ? null : 'sharp';
          startOrUpdateTyping(cur.noteLetter, nextAcc, cur.octave, 900);
          return;
        }

        // ArrowDown: toggle/set flat (♭)
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextAcc = cur.accidental === 'flat' ? null : 'flat';
          startOrUpdateTyping(cur.noteLetter, nextAcc, cur.octave, 900);
          return;
        }

        // Number keys (1-8): sets octave on note being constructed and shows it in toast!
        if (/^[1-8]$/.test(e.key)) {
          e.preventDefault();
          startOrUpdateTyping(cur.noteLetter, cur.accidental, e.key, 450);
          return;
        }

        // Enter: immediately validate note
        if (e.key === 'Enter') {
          e.preventDefault();
          commitTypingBuffer();
          return;
        }

        // Escape / Backspace: cancel buffer
        if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          clearTypingBuffer();
          return;
        }
      }

      const key = e.key.toLowerCase();

      // Note Letters: A, B, C, D, E, F, G ONLY
      if (/^[a-g]$/.test(key)) {
        e.preventDefault();
        startOrUpdateTyping(key.toUpperCase(), null, '', 850);
        return;
      }

      // ALL OTHER KEYS ARE COMPLETELY IGNORED (NO UNINTENTIONAL ERRORS!)
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTypingBuffer();
    };
  }, [clearTypingBuffer, commitTypingBuffer, registerIncorrect, startOrUpdateTyping]);

  // ─── Stop audio on unmount ───────────────────────────────
  useEffect(() => {
    return () => { audioEngine.stop(); };
  }, []);

  // ─── Render helpers ──────────────────────────────────────
  const currentNote = notes[currentNoteIndex];
  const targetMidi = currentNote?.midiNote ?? 0;
  const correctCount = notes.filter((n) => n.status === 'correct').length;

  const currentExerciseRange = selectedExercise?.range ?? chapter.range;

  return (
    <AppLayout
      title="Treino por Capítulos"
      subtitle={`${chapter.title} · ${selectedExercise.title}`}
      onBack={onExit}
      headerAction={
        <div className="flex gap-2 items-center">
          {phase === 'playing' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                audioEngine.stop();
                setPhase('setup');
              }}
            >
              Reiniciar
            </Button>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg bg-surface-700 border border-surface hover:border-adaptive transition-all"
            aria-label="Configurações"
          >
            <Icon name="settings" size={18} />
          </button>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
        {/* SETUP PHASE: Chapter & Exercise Selectors */}
        {phase === 'setup' && (
          <AnimatedSection type="fade" className="w-full flex flex-col gap-6">
            {/* Chapter Selection Bar */}
            <div className="w-full">
              <h3 className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2">
                <Icon name="music" size={16} /> Selecione o Capítulo
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {curriculum.map((ch) => {
                  const isLocked = ch.index > maxUnlock;
                  const isSelected = ch.id === chapter.id;

                  return (
                    <button
                      key={ch.id}
                      disabled={isLocked}
                      onClick={() => {
                        setChapter(ch);
                        setSelectedExercise(ch.exercises[0]);
                      }}
                      className={`p-3 rounded-2xl flex flex-col items-center text-center transition-all ${
                        isSelected
                          ? 'bg-accent-soft border-2 border-accent-soft text-neon-cyan shadow-lg shadow-neon-cyan/10'
                          : isLocked
                          ? 'bg-surface-800/40 border border-surface text-muted opacity-40 cursor-not-allowed'
                          : 'bg-surface-800 border border-surface text-secondary hover:border-adaptive hover:text-primary'
                      }`}
                    >
                      <div className="text-xs font-bold mb-1">Cap. {ch.index}</div>
                      <div className="text-[11px] font-medium leading-tight truncate w-full">
                        {ch.title}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exercise Selection Grid */}
            <div className="w-full">
              <h3 className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2">
                <Icon name="target" size={16} /> Exercício do Capítulo
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {chapter.exercises.map((ex) => {
                  const isSelected = ex.id === selectedExercise.id;
                  return (
                    <button
                      key={ex.id}
                      onClick={() => setSelectedExercise(ex)}
                      className={`p-4 rounded-2xl text-left transition-all ${
                        isSelected
                          ? 'bg-purple-soft border-2 border-purple-soft text-primary shadow-lg shadow-purple-900/20'
                          : 'bg-surface-800 border border-surface text-secondary hover:border-adaptive hover:text-primary'
                      }`}
                    >
                      <div className="text-xs font-bold mb-1 text-neon-purple">
                        {ex.title}
                      </div>
                      <div className="text-xs text-muted leading-snug">
                        {ex.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Start Session Button */}
            <div className="flex justify-center mt-2">
              <Button size="lg" onClick={handleStart} className="px-10">
                Iniciar Treino
              </Button>
            </div>
          </AnimatedSection>
        )}

        {/* PLAYING PHASE: Conveyor Partitura & Input */}
        {(phase === 'playing' || phase === 'results') && (
          <>
            {/* Progress indicator */}
            <div className="w-full flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs text-secondary font-medium">
                <span>
                  Nota {Math.min(currentNoteIndex + 1, notes.length)} de {notes.length}
                </span>
                <span>{Math.round((correctCount / Math.max(notes.length, 1)) * 100)}% de Precisão</span>
              </div>
              <div className="w-full h-2 bg-surface-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-neon-cyan to-neon-emerald rounded-full transition-all duration-300"
                  style={{ width: `${(correctCount / Math.max(notes.length, 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Sheet music with key signature */}
            <div className="w-full rounded-2xl border border-surface bg-surface-800 p-4">
              <SheetMusicDisplay
                notes={notes}
                activeIndex={currentNoteIndex}
                clef={selectedExercise?.clef ?? (chapter.range.min < 55 ? 'bass' : 'treble')}
                height={200}
                theme={theme}
                keyFifths={selectedExercise?.keyFifths ?? chapter.keySignature.fifths}
                notation={wizardConfig.notationSystem ?? 'letters'}
                octaveShift={effectiveOctaveShift}
              />
            </div>

            {/* Manual / mic input */}
            <Card className="p-4 w-full">
              {inputMode === 'manual' ? (
                <div>
                  <div className="text-center mb-3 text-sm text-secondary">
                    Leia a partitura e toque a nota clicando ou usando o teclado físico
                  </div>
                  <AdaptedInstrumentInput
                    manualType={wizardConfig.manualType}
                    onNote={handleManualNote}
                    range={wizardConfig.manualType === 'piano' ? { min: 50, max: 95 } : currentExerciseRange}
                    notation={wizardConfig.notationSystem ?? 'letters'}
                  />
                  <div className="text-center text-xs text-muted mt-2">
                    Teclado: Digite a nota (ex: <kbd>C</kbd> + <kbd>↑</kbd> para C♯, <kbd>D</kbd> + <kbd>↓</kbd> para D♭, ou <kbd>C4</kbd>) · <kbd>Espaço</kbd> para pular
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm text-secondary py-4">
                  Ouvindo microfone... Toque ou cante a nota na altura certa!
                </div>
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
                    <StatCard label="Acertos" value={`${result.correctNotes} / ${result.totalNotes}`} color="text-neon-emerald" />
                    <StatCard label="Desvio Médio" value={`${result.averageCentsOffset} ¢`} color="text-secondary" />
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={handleStart}>Repetir Exercício</Button>
                    <Button variant="secondary" onClick={() => setPhase('setup')}>
                      Outro Exercício
                    </Button>
                  </div>
                </Card>
              </AnimatedSection>
            )}
          </>
        )}
      </div>

      {/* Floating Note Construction Toast (Fixed Bottom, Solid Opaque Background, Zero Layout Shift) */}
      {typingState && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="px-5 py-3 rounded-2xl bg-surface-800 border-2 border-surface-600 shadow-2xl flex flex-col items-center gap-1.5 min-w-[250px]">
            <div className="flex items-center gap-3 w-full justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                Digitando Nota
              </span>
              <span className="text-[9px] font-mono text-neon-cyan">
                {typingState.octave
                  ? `Oitava ${typingState.octave}`
                  : `Oitava ${typingState.contextOctave} (padrão)`}
              </span>
            </div>

            <div className="flex items-center justify-center gap-1 my-0.5">
              <NoteLabelDisplay
                name={getNoteDisplayName(
                  typingState.noteLetter,
                  typingState.accidental,
                  typingState.octave || String(typingState.contextOctave),
                  wizardConfig.notationSystem ?? 'letters'
                )}
                size={18}
                className="text-2xl font-black text-neon-cyan drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]"
              />
            </div>

            {/* CSS-driven countdown progress line without React state jitter */}
            <div className="w-full h-1 bg-surface-700 rounded-full overflow-hidden">
              <div
                key={typingState.id}
                className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full"
                style={{
                  width: '100%',
                  animation: `shrinkWidth ${typingState.totalMs}ms linear forwards`,
                }}
              />
            </div>

            <div className="flex items-center gap-2 text-[9px] text-muted font-medium justify-center pt-0.5">
              <span><kbd className="text-neon-cyan font-bold">↑</kbd> ♯</span>
              <span>·</span>
              <span><kbd className="text-neon-purple font-bold">↓</kbd> ♭</span>
              <span>·</span>
              <span><kbd className="text-primary font-bold">1-8</kbd> Oitava</span>
              <span>·</span>
              <span><kbd className="text-neon-emerald font-bold">↵</kbd> Enviar</span>
            </div>
          </div>
        </div>
      )}

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        config={wizardConfig}
        onSave={(c) => onUpdateConfig?.(c)}
        onRunWizard={() => {
          setShowSettings(false);
          onExit();
        }}
      />
    </AppLayout>
  );
}
