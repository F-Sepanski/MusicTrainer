import type { ExerciseNote, ExerciseConfig, Clef } from '../types';
import { midiToNoteName, midiToVexFlowKey } from '../audio/noteFrequencies';
import { fifthsToAccidentals } from './curriculum';

let noteIdCounter = 0;

export interface GeneratedExercise extends ExerciseConfig {
  /** Key signature fifths value to apply to the staff (-7 to +7) */
  keyFifths?: number;
  /** If set, dynamically switches key signatures mid-exercise among these fifths values */
  keyFifthsPool?: number[];
  /** Note MIDI pitch classes allowed (0-11) */
  pool?: number[];
  /** Explicit MIDI notes to sample from (overrides pool+range random) */
  midiNotes?: number[];
  /** Explicit notes with exact VexFlow spellings (for enharmonics like E#, Cb) */
  explicitNotes?: { midiNote: number; vfKey: string }[];
  /** Rhythm durations (in beats) — when set, level uses rhythm */
  rhythmDurations?: number[];
  /** Preference for sharp vs flat accidentals ('sharp', 'flat', or 'mixed') */
  accidentalType?: 'sharp' | 'flat' | 'mixed';
}

/**
 * Determine which clef a MIDI note should be placed on for a grand staff.
 * Notes >= middle C (60) go to treble, below go to bass.
 */
export function clefForMidi(midi: number, baseClef: Clef): 'treble' | 'bass' {
  if (baseClef !== 'grand') {
    return baseClef === 'treble' ? 'treble' : 'bass';
  }
  return midi >= 60 ? 'treble' : 'bass';
}

interface DiatonicNoteInfo {
  midiNote: number;
  vfKey: string;
  letter: string;
  octave: number;
}

/**
 * Returns all diatonic notes for a specific key signature within [minMidi, maxMidi].
 * Correctly accounts for enharmonics (e.g. E# in F# Major, Cb in Gb Major).
 */
export function getDiatonicNotesForKey(
  fifths: number,
  minMidi: number,
  maxMidi: number
): DiatonicNoteInfo[] {
  const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
  const basePitchClasses: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };

  const sharpLetters = fifthsToAccidentals(Math.max(0, fifths));
  const flatLetters = fifthsToAccidentals(Math.min(0, fifths));

  const results: DiatonicNoteInfo[] = [];

  // Octaves 1 through 7 cover MIDI 24 to 108
  for (let octave = 1; octave <= 7; octave++) {
    for (const letter of letters) {
      let accidental = '';
      let alter = 0;

      if (fifths > 0 && sharpLetters.includes(letter)) {
        accidental = '#';
        alter = 1;
      } else if (fifths < 0 && flatLetters.includes(letter)) {
        accidental = 'b';
        alter = -1;
      }

      // Middle C (C4) is MIDI 60: (4 + 1) * 12 + 0 = 60
      const midiNote = (octave + 1) * 12 + basePitchClasses[letter] + alter;
      const vfKey = `${letter.toLowerCase()}${accidental}/${octave}`;

      if (midiNote >= minMidi && midiNote <= maxMidi) {
        results.push({
          midiNote,
          vfKey,
          letter,
          octave,
        });
      }
    }
  }

  return results;
}

/** Generate a set of random notes for an exercise. */
export function generateExercise(config: GeneratedExercise): ExerciseNote[] {
  const useExplicitSpellings = config.explicitNotes && config.explicitNotes.length > 0;
  const explicit = config.midiNotes && config.midiNotes.length > 0;
  const pool = config.pool ?? [0, 2, 4, 5, 7, 9, 11]; // natural notes default

  const notes: ExerciseNote[] = [];
  const noteCount = config.noteCount;

  // Handle mid-exercise dynamic key changes
  const hasKeyFifthsPool = Array.isArray(config.keyFifthsPool) && config.keyFifthsPool.length > 0;

  // Divide into sections of roughly 8 notes (or noteCount / 4)
  const sectionSize = Math.max(6, Math.min(12, Math.floor(noteCount / (hasKeyFifthsPool ? 4 : 1)) || 8));

  let currentKeyFifths = config.keyFifths ?? 0;
  let diatonicChoices: DiatonicNoteInfo[] = [];

  // Track chosen key fifths for each section
  let lastChosenFifths: number | null = null;

  for (let i = 0; i < noteCount; i++) {
    const isSectionStart = hasKeyFifthsPool && i % sectionSize === 0;
    const isFirstNoteOfNewSection = isSectionStart && i > 0;

    if (isSectionStart) {
      // Pick a new key signature from pool, different from previous section if possible
      const available = config.keyFifthsPool!.filter((k) => k !== lastChosenFifths);
      const candidates = available.length > 0 ? available : config.keyFifthsPool!;
      currentKeyFifths = candidates[Math.floor(Math.random() * candidates.length)];
      lastChosenFifths = currentKeyFifths;
      diatonicChoices = getDiatonicNotesForKey(currentKeyFifths, config.minMidi, config.maxMidi);
    } else if (i === 0 && !hasKeyFifthsPool && config.keyFifths !== undefined && config.keyFifths !== 0) {
      diatonicChoices = getDiatonicNotesForKey(currentKeyFifths, config.minMidi, config.maxMidi);
    }

    let midiNote: number;
    let vfKey: string;

    const useSharps =
      config.accidentalType === 'sharp'
        ? true
        : config.accidentalType === 'flat'
        ? false
        : currentKeyFifths > 0
        ? true
        : currentKeyFifths < 0
        ? false
        : Math.random() < 0.5;

    if (useExplicitSpellings) {
      const pick = config.explicitNotes![Math.floor(Math.random() * config.explicitNotes!.length)];
      midiNote = pick.midiNote;
      vfKey = pick.vfKey;
    } else if (explicit) {
      // Pick uniformly from the explicit note list.
      midiNote = config.midiNotes![Math.floor(Math.random() * config.midiNotes!.length)];
      vfKey = midiToVexFlowKey(midiNote, useSharps);
    } else if ((hasKeyFifthsPool || config.keyFifths !== 0) && diatonicChoices.length > 0) {
      // Pick from the authentic diatonic scale of this key signature!
      const pick = diatonicChoices[Math.floor(Math.random() * diatonicChoices.length)];
      midiNote = pick.midiNote;
      vfKey = pick.vfKey;
    } else {
      let attempts = 0;
      do {
        midiNote = randomInt(config.minMidi, config.maxMidi);
        attempts++;
        if (attempts > 200) break;
      } while (!pool.includes(((midiNote % 12) + 12) % 12));
      vfKey = midiToVexFlowKey(midiNote, useSharps);
    }

    // Determine rhythm duration
    let duration = 1;
    if (config.rhythmDurations && config.rhythmDurations.length > 0) {
      duration = config.rhythmDurations[Math.floor(Math.random() * config.rhythmDurations.length)];
    }

    const noteClef = clefForMidi(midiNote, config.clef);

    notes.push({
      id: noteIdCounter++,
      midiNote,
      noteName: midiToNoteName(midiNote, 'letters', useSharps),
      duration,
      vfKey,
      clef: noteClef,
      status: i === 0 ? 'active' : 'pending',
      keyFifths: currentKeyFifths,
      isKeyChange: isFirstNoteOfNewSection,
    });
  }

  return notes;
}

/** Reset the note ID counter (for new exercises). */
export function resetNoteIdCounter(): void {
  noteIdCounter = 0;
}

/** Build config from a specific level (uses its own pool/clef/range). */
export function configFromExercise(
  exercise: {
    pool: number[];
    midiNotes?: number[];
    explicitNotes?: { midiNote: number; vfKey: string }[];
    keyFifths?: number;
    keyFifthsPool?: number[];
    rhythmDurations?: number[];
    clef: Clef;
    range: { min: number; max: number };
    hasAccidentals?: boolean;
    accidentalType?: 'sharp' | 'flat' | 'mixed';
  },
  extra?: Partial<GeneratedExercise>
): GeneratedExercise {
  return {
    clef: exercise.clef,
    noteCount: extra?.noteCount ?? 32,
    minMidi: exercise.range.min,
    maxMidi: exercise.range.max,
    toleranceCents: extra?.toleranceCents ?? 30,
    noteDelayMs: extra?.noteDelayMs ?? 250,
    keyFifths: exercise.keyFifths ?? 0,
    keyFifthsPool: exercise.keyFifthsPool,
    pool: exercise.pool,
    midiNotes: exercise.midiNotes,
    explicitNotes: exercise.explicitNotes,
    rhythmDurations: exercise.rhythmDurations,
    accidentalType: exercise.accidentalType,
    ...extra,
  };
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
