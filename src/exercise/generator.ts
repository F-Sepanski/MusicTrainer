/**
 * Generates random musical notes for sight-reading exercises,
 * supporting progressive chapter pools, key signatures, and rhythm.
 *
 * @module exercise/generator
 */

import type { ExerciseNote, ExerciseConfig } from '../types';
import { midiToNoteName, midiToVexFlowKey, TREBLE_RANGE, BASS_RANGE } from '../audio/noteFrequencies';
import type { Difficulty } from './curriculum';

let noteIdCounter = 0;

export interface GeneratedExercise extends ExerciseConfig {
  /** Key signature fifths value to apply to the staff */
  keyFifths?: number;
  /** Note MIDI pitch classes allowed (0-11) */
  pool?: number[];
  /** Rhythm durations (in beats) — when set, chapter uses rhythm */
  rhythmDurations?: number[];
}

/** Generate a set of random notes for an exercise with the given pool. */
export function generateExercise(config: GeneratedExercise): ExerciseNote[] {
  const range = config.clef === 'treble' ? TREBLE_RANGE : BASS_RANGE;
  const minMidi = Math.max(config.minMidi, range.min);
  const maxMidi = Math.min(config.maxMidi, range.max);
  const pool = config.pool ?? [0, 2, 4, 5, 7, 9, 11]; // natural notes default

  const notes: ExerciseNote[] = [];

  for (let i = 0; i < config.noteCount; i++) {
    // Pick a random MIDI note whose pitch class is in the pool
    let midiNote: number;
    let attempts = 0;
    do {
      midiNote = randomInt(minMidi, maxMidi);
      attempts++;
      // Avoid infinite loop — if pool too restrictive relative to range, accept
      if (attempts > 200) break;
    } while (!pool.includes(((midiNote % 12) + 12) % 12));

    // Determine rhythm duration
    let duration = 1;
    if (config.rhythmDurations && config.rhythmDurations.length > 0) {
      duration = config.rhythmDurations[Math.floor(Math.random() * config.rhythmDurations.length)];
    }

    notes.push({
      id: noteIdCounter++,
      midiNote,
      noteName: midiToNoteName(midiNote),
      duration,
      vfKey: midiToVexFlowKey(midiNote),
      status: i === 0 ? 'active' : 'pending',
    });
  }

  return notes;
}

/** Reset the note ID counter (for new exercises). */
export function resetNoteIdCounter(): void {
  noteIdCounter = 0;
}

/** Convenience: build exercise config from a chapter and difficulty. */
export function configFromChapter(
  chapter: { pools: Record<Difficulty, number[]>; keySignature: { fifths: number }; range: { min: number; max: number } },
  difficulty: Difficulty,
  clef: 'treble' | 'bass',
  extra?: Partial<GeneratedExercise>
): GeneratedExercise {
  const isBassChapter = chapter.range.min < 55;
  return {
    clef,
    noteCount: extra?.noteCount ?? 12,
    minMidi: Math.max(chapter.range.min, isBassChapter ? 40 : 55),
    maxMidi: Math.min(chapter.range.max, isBassChapter ? 64 : 81),
    toleranceCents: extra?.toleranceCents ?? 30,
    noteDelayMs: extra?.noteDelayMs ?? 250,
    keyFifths: chapter.keySignature.fifths,
    pool: chapter.pools[difficulty],
    ...extra,
  };
}

/** Build config from a specific chapter exercise (uses its own pool/clef/range/rhythm). */
export function configFromExercise(
  chapter: { range: { min: number; max: number } },
  exercise: { pool: number[]; keyFifths?: number; rhythmDurations?: number[]; clef?: 'treble' | 'bass'; range?: { min: number; max: number } },
  extra?: Partial<GeneratedExercise>
): GeneratedExercise {
  const clef = exercise.clef ?? (chapter.range.min < 55 ? 'bass' : 'treble');
  const range = exercise.range ?? chapter.range;
  return {
    clef,
    noteCount: extra?.noteCount ?? 12,
    minMidi: Math.max(range.min, clef === 'bass' ? 40 : 55),
    maxMidi: Math.min(range.max, clef === 'bass' ? 64 : 81),
    toleranceCents: extra?.toleranceCents ?? 30,
    noteDelayMs: extra?.noteDelayMs ?? 250,
    keyFifths: exercise.keyFifths ?? 0,
    pool: exercise.pool,
    rhythmDurations: exercise.rhythmDurations,
    ...extra,
  };
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
