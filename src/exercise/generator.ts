/**
 * Generates random musical notes for sight-reading exercises,
 * supporting progressive course chapters/levels, key signatures,
 * explicit note pools, and grand staff (dual clef).
 *
 * @module exercise/generator
 */

import type { ExerciseNote, ExerciseConfig, Clef } from '../types';
import { midiToNoteName, midiToVexFlowKey } from '../audio/noteFrequencies';

let noteIdCounter = 0;

export interface GeneratedExercise extends ExerciseConfig {
  /** Key signature fifths value to apply to the staff */
  keyFifths?: number;
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

/** Generate a set of random notes for an exercise. */
export function generateExercise(config: GeneratedExercise): ExerciseNote[] {
  // explicitNotes (exact spellings) take precedence, then midiNotes, then random.
  const useExplicitSpellings = config.explicitNotes && config.explicitNotes.length > 0;
  const explicit = config.midiNotes && config.midiNotes.length > 0;
  const pool = config.pool ?? [0, 2, 4, 5, 7, 9, 11]; // natural notes default

  const notes: ExerciseNote[] = [];

  for (let i = 0; i < config.noteCount; i++) {
    let midiNote: number;
    let vfKey: string;

    const useSharps =
      config.accidentalType === 'sharp'
        ? true
        : config.accidentalType === 'flat'
        ? false
        : (config.keyFifths ?? 0) > 0
        ? true
        : (config.keyFifths ?? 0) < 0
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
