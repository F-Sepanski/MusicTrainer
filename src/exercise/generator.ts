/**
 * Generates random musical notes for sight-reading exercises.
 *
 * @module exercise/generator
 */

import type { ExerciseNote, ExerciseConfig } from '../types';
import { midiToNoteName, midiToVexFlowKey, TREBLE_RANGE, BASS_RANGE } from '../audio/noteFrequencies';

let noteIdCounter = 0;

/** Generate a set of random notes for an exercise. */
export function generateExercise(config: ExerciseConfig): ExerciseNote[] {
  const range = config.clef === 'treble' ? TREBLE_RANGE : BASS_RANGE;
  const minMidi = Math.max(config.minMidi, range.min);
  const maxMidi = Math.min(config.maxMidi, range.max);

  const notes: ExerciseNote[] = [];

  for (let i = 0; i < config.noteCount; i++) {
    // Pick a random MIDI note within range (only natural notes for Sprint 1)
    let midiNote: number;
    do {
      midiNote = randomInt(minMidi, maxMidi);
    } while (isBlackKey(midiNote));

    notes.push({
      id: noteIdCounter++,
      midiNote,
      noteName: midiToNoteName(midiNote),
      duration: 1,
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

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isBlackKey(midi: number): boolean {
  const mod = ((midi % 12) + 12) % 12;
  return mod === 1 || mod === 3 || mod === 6 || mod === 8 || mod === 10;
}
