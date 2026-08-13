/**
 * Note name and MIDI ↔ frequency mappings for sight-reading exercises.
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

/** Convert MIDI note number to frequency in Hz (A4 = 440). */
export function midiToFrequency(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

/** Convert frequency in Hz to MIDI note number (fractional). */
export function frequencyToMidi(freq: number, a4 = 440): number {
  return 69 + 12 * Math.log2(freq / a4);
}

/** Get note name from MIDI number (e.g. 60 → "C4"). Uses flats for black keys. */
export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${FLAT_NAMES[noteIndex]}${octave}`;
}

/** Get the VexFlow key string from MIDI number (e.g. 60 → "c/4", 61 → "db/4"). */
export function midiToVexFlowKey(midi: number): string {
  const name = midiToNoteName(midi);
  const noteLetter = name.slice(0, -1).toLowerCase();
  const octave = name.slice(-1);
  return `${noteLetter}/${octave}`;
}

/** Get MIDI note range for treble clef (G4 to G6). */
export const TREBLE_RANGE = { min: 55, max: 79 };

/** Get MIDI note range for bass clef (E2 to E4). */
export const BASS_RANGE = { min: 40, max: 64 };

/**
 * Calculate cents offset between a detected frequency and the nearest equal-temperament note.
 * Positive = sharp, Negative = flat.
 */
export function calculateCents(detectedFreq: number, midiNote: number, a4 = 440): number {
  const idealFreq = midiToFrequency(midiNote, a4);
  return 1200 * Math.log2(detectedFreq / idealFreq);
}

/**
 * Find the closest MIDI note to a given frequency.
 */
export function frequencyToClosestMidi(freq: number, a4 = 440): { midi: number; cents: number } {
  const midi = frequencyToMidi(freq, a4);
  const rounded = Math.round(midi);
  const cents = calculateCents(freq, rounded, a4);
  return { midi: rounded, cents };
}

/** A4 reference frequencies */
export const A4_FREQUENCIES = {
  standard: 440,
  european: 442,
  historical: 432,
} as const;
