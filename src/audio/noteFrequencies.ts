/**
 * Note name and MIDI ↔ frequency mappings for sight-reading exercises.
 * Supports both Letter notation (C, D, E...) and Solfège (Dó, Ré, Mi...).
 *
 * @module audio/noteFrequencies
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export const SOLFEGE_NAMES = ['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si'] as const;
export const SOLFEGE_FLAT_NAMES = ['Dó', 'Réb', 'Ré', 'Mib', 'Mi', 'Fá', 'Solb', 'Sol', 'Láb', 'Lá', 'Sib', 'Si'] as const;

export type NotationSystem = 'letters' | 'solfege';

/** Convert MIDI note number to frequency in Hz (A4 = 440). */
export function midiToFrequency(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

/** Convert frequency in Hz to MIDI note number (fractional). */
export function frequencyToMidi(freq: number, a4 = 440): number {
  return 69 + 12 * Math.log2(freq / a4);
}

/** Get note name from MIDI number (e.g. 60 → "C4" or "Dó4"). */
export function midiToNoteName(
  midi: number,
  notation: NotationSystem = 'letters',
  useSharps = false
): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = ((midi % 12) + 12) % 12;
  const baseName = pitchClassToName(noteIndex, notation, useSharps);
  return `${baseName}${octave}`;
}

/** Get pitch class name without octave. */
export function pitchClassToName(
  pitchClass: number,
  notation: NotationSystem = 'letters',
  useSharps = false
): string {
  const pc = ((pitchClass % 12) + 12) % 12;
  if (notation === 'solfege') {
    return useSharps ? SOLFEGE_NAMES[pc] : SOLFEGE_FLAT_NAMES[pc];
  }
  return useSharps ? NOTE_NAMES[pc] : FLAT_NAMES[pc];
}

/** Parse any user string (e.g. "c4", "C#4", "do4", "re#3", "eb5") into a MIDI number. */
export function parseNoteToMidi(input: string): number | null {
  const clean = input.trim().toLowerCase();
  if (!clean) return null;

  // Match note part and octave part (e.g. "c4", "c#4", "db3", "do4", "re#5", "c")
  const match = clean.match(/^([a-g]|do|dó|re|ré|mi|fa|fá|sol|la|lá|si)([#b♯♭]?)(\d?)$/i);
  if (!match) return null;

  const [, rawNote, rawAcc, rawOct] = match;
  let pc = -1;

  switch (rawNote.toLowerCase()) {
    case 'c': case 'do': case 'dó': pc = 0; break;
    case 'd': case 're': case 'ré': pc = 2; break;
    case 'e': case 'mi': pc = 4; break;
    case 'f': case 'fa': case 'fá': pc = 5; break;
    case 'g': case 'sol': pc = 7; break;
    case 'a': case 'la': case 'lá': pc = 9; break;
    case 'b': case 'si': pc = 11; break;
    default: return null;
  }

  if (rawAcc === '#' || rawAcc === '♯') pc += 1;
  else if (rawAcc === 'b' || rawAcc === '♭') pc -= 1;
  pc = ((pc % 12) + 12) % 12;

  if (rawOct !== '') {
    const octave = parseInt(rawOct, 10);
    return (octave + 1) * 12 + pc;
  }

  // Default to octave 4 if no octave provided
  return 60 + pc;
}

/** Parse note letter / solfege directly into pitch class (0-11). */
export function parseNoteToPitchClass(input: string): number | null {
  const midi = parseNoteToMidi(input);
  if (midi === null) return null;
  return ((midi % 12) + 12) % 12;
}

/** Get the VexFlow key string from MIDI number (e.g. 60 → "c/4", 61 → "db/4"). */
export function midiToVexFlowKey(midi: number): string {
  const name = midiToNoteName(midi, 'letters', false);
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
