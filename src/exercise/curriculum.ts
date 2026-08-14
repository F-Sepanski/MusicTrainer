/**
 * Curriculum — progressive chapters, difficulty modes, key signatures,
 * and note pools for sight-reading training.
 *
 * @module exercise/curriculum
 */

export type Difficulty = 'easy' | 'medium' | 'hard';
export type InputMode = 'mic' | 'manual';

export interface KeySignature {
  /** Number of sharps (positive) or flats (negative) */
  fifths: number;
  /** Name, e.g. "G Major" */
  name: string;
  /** Accidental letters, e.g. ['F'] for G Major */
  accidentals: string[];
}

export interface ChapterExercise {
  /** Exercise id within the chapter, e.g. 'ch1-e1' */
  id: string;
  /** Human-readable title */
  title: string;
  /** Focus description */
  description: string;
  /** Which MIDI pitch classes (0-11) this exercise uses */
  pool: number[];
  /** Optional specific note to focus (single pitch class highlighted) */
  focusNote?: number;
  /** Key signature for this exercise (fifths) */
  keyFifths: number;
  /** Rhythm durations in beats (for rhythmic exercises) */
  rhythmDurations?: number[];
  /** Clef to use ('treble', 'bass', or both) */
  clef?: 'treble' | 'bass';
  /** MIDI range */
  range?: { min: number; max: number };
}

export interface Chapter {
  id: string;
  index: number;
  title: string;
  icon: string;
  description: string;
  /** Notes introduced progressively across difficulties */
  pools: Record<Difficulty, number[]>;
  /** Key signature applied to the chapter's exercises */
  keySignature: KeySignature;
  /** Whether this chapter introduces accidentals */
  hasAccidentals: boolean;
  /** MIDI range for the chapter */
  range: { min: number; max: number };
  /** Multiple progressive exercises for this chapter */
  exercises: ChapterExercise[];
}
export const CIRCLE_OF_FIFTHS: KeySignature[] = [
  { fifths: 0, name: 'C Major', accidentals: [] },
  { fifths: 1, name: 'G Major', accidentals: ['F'] },
  { fifths: 2, name: 'D Major', accidentals: ['F', 'C'] },
  { fifths: 3, name: 'A Major', accidentals: ['F', 'C', 'G'] },
  { fifths: 4, name: 'E Major', accidentals: ['F', 'C', 'G', 'D'] },
  { fifths: 5, name: 'B Major', accidentals: ['F', 'C', 'G', 'D', 'A'] },
  { fifths: 6, name: 'F# Major', accidentals: ['F', 'C', 'G', 'D', 'A', 'E'] },
  { fifths: 7, name: 'C# Major', accidentals: ['F', 'C', 'G', 'D', 'A', 'E', 'B'] },
  { fifths: -1, name: 'F Major', accidentals: ['B'] },
  { fifths: -2, name: 'Bb Major', accidentals: ['B', 'E'] },
  { fifths: -3, name: 'Eb Major', accidentals: ['B', 'E', 'A'] },
  { fifths: -4, name: 'Ab Major', accidentals: ['B', 'E', 'A', 'D'] },
  { fifths: -5, name: 'Db Major', accidentals: ['B', 'E', 'A', 'D', 'G'] },
  { fifths: -6, name: 'Gb Major', accidentals: ['B', 'E', 'A', 'D', 'G', 'C'] },
  { fifths: -7, name: 'Cb Major', accidentals: ['B', 'E', 'A', 'D', 'G', 'C', 'F'] },
];

/** Natural note MIDI values (white keys). */
export const NATURAL_MIDI = [0, 2, 4, 5, 7, 9, 11];
/** All 12 chromatic MIDI classes. */
export const CHROMATIC_MIDI = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/** Note letters A-G mapped to their accidental direction. */
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

/** Convert a KeySignature fifths count to the note letters that are altered. */
export function fifthsToAccidentals(fifths: number): string[] {
  if (fifths === 0) return [];
  if (fifths > 0) return SHARP_ORDER.slice(0, fifths);
  return FLAT_ORDER.slice(0, -fifths);
}

/** Whether a given MIDI pitch class (0-11) is altered by this key signature. */
export function isAlteredInKey(pitchClass: number, accidentals: string[]): boolean {
  const name = pitchClassToLetter(pitchClass);
  return accidentals.includes(name);
}

import { pitchClassToName, type NotationSystem } from '../audio/noteFrequencies';

/** Map pitch class to its note name (C=0 → 'C' or 'Dó', etc.). */
export function pitchClassToLetter(pitchClass: number, notation: NotationSystem = 'letters'): string {
  return pitchClassToName(pitchClass, notation, false);
}

export interface CurriculumChapter extends Chapter {}

/**
 * Build progressive exercises for a chapter. Each exercise introduces
 * a note or concept incrementally for complete learning.
 */
function buildNaturalExercises(
  prefix: string,
  range: { min: number; max: number },
  notation: NotationSystem = 'letters'
): ChapterExercise[] {
  // Progressively add notes: C → C+D → C+D+E → ... full scale
  const sequence = [0, 2, 4, 5, 7, 9, 11];
  const exercises: ChapterExercise[] = [];
  for (let i = 0; i < sequence.length; i++) {
    const pool = sequence.slice(0, i + 1);
    const focus = sequence[i];
    const focusName = pitchClassToName(focus, notation);
    exercises.push({
      id: `${prefix}-e${i + 1}`,
      title: focus === 0 ? (notation === 'solfege' ? 'Nota Dó' : 'Nota C') : `Até ${focusName}`,
      description: `Exercício com ${i + 1} nota(s): ${pool.map((p) => pitchClassToName(p, notation)).join(', ')}`,
      pool,
      focusNote: focus,
      keyFifths: 0,
      range,
    });
  }
  return exercises;
}

function buildSharpExercises(
  prefix: string,
  range: { min: number; max: number },
  notation: NotationSystem = 'letters'
): ChapterExercise[] {
  const isSolfege = notation === 'solfege';
  return [
    {
      id: `${prefix}-e1`,
      title: isSolfege ? 'Fá Sustenido (Fá#)' : 'F Sustenido (F#)',
      description: isSolfege ? 'Familiarize-se com o Fá# na armadura' : 'Familiarize-se com o F# na armadura',
      pool: [0, 2, 4, 5, 6, 7, 9, 11],
      focusNote: 6,
      keyFifths: 1,
    },
    {
      id: `${prefix}-e2`,
      title: isSolfege ? 'Dó Sustenido (Dó#)' : 'C Sustenido (C#)',
      description: isSolfege ? 'Adicione o Dó# (2 sustenidos)' : 'Adicione o C# (2 sustenidos)',
      pool: [0, 1, 2, 4, 5, 6, 7, 9, 11],
      focusNote: 1,
      keyFifths: 2,
    },
    {
      id: `${prefix}-e3`,
      title: isSolfege ? 'Sol Sustenido (Sol#)' : 'G Sustenido (G#)',
      description: isSolfege ? 'Adicione o Sol# (3 sustenidos)' : 'Adicione o G# (3 sustenidos)',
      pool: [0, 1, 2, 4, 5, 6, 7, 8, 9, 11],
      focusNote: 8,
      keyFifths: 3,
    },
    {
      id: `${prefix}-e4`,
      title: 'Cromático com Sustenidos',
      description: 'Todos os sustenidos',
      pool: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      keyFifths: 4,
    },
  ];
}

function buildFlatExercises(
  prefix: string,
  range: { min: number; max: number },
  notation: NotationSystem = 'letters'
): ChapterExercise[] {
  const isSolfege = notation === 'solfege';
  return [
    {
      id: `${prefix}-e1`,
      title: isSolfege ? 'Si Bemol (Sib)' : 'B Bemol (Bb)',
      description: isSolfege ? 'Familiarize-se com o Sib na armadura' : 'Familiarize-se com o Bb na armadura',
      pool: [0, 2, 4, 5, 7, 9, 10, 11],
      focusNote: 10,
      keyFifths: -1,
    },
    {
      id: `${prefix}-e2`,
      title: isSolfege ? 'Mi Bemol (Mib)' : 'E Bemol (Eb)',
      description: isSolfege ? 'Adicione o Mib (2 bemóis)' : 'Adicione o Eb (2 bemóis)',
      pool: [0, 2, 3, 4, 5, 7, 9, 10, 11],
      focusNote: 3,
      keyFifths: -2,
    },
    {
      id: `${prefix}-e3`,
      title: isSolfege ? 'Lá Bemol (Láb)' : 'A Bemol (Ab)',
      description: isSolfege ? 'Adicione o Láb (3 bemóis)' : 'Adicione o Ab (3 bemóis)',
      pool: [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11],
      focusNote: 8,
      keyFifths: -3,
    },
    {
      id: `${prefix}-e4`,
      title: 'Cromático com Bemóis',
      description: 'Todos os bemóis',
      pool: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      keyFifths: -4,
    },
  ];
}

function buildKeySignatureExercises(
  prefix: string,
  range: { min: number; max: number },
  notation: NotationSystem = 'letters'
): ChapterExercise[] {
  const isSolfege = notation === 'solfege';
  return [
    { id: `${prefix}-e1`, title: isSolfege ? 'Sol Maior (1#)' : 'G Maior (1#)', description: 'Armadura com 1 sustenido', pool: [0, 2, 4, 5, 6, 7, 9, 11], keyFifths: 1 },
    { id: `${prefix}-e2`, title: isSolfege ? 'Ré Maior (2#)' : 'D Maior (2#)', description: 'Armadura com 2 sustenidos', pool: [0, 1, 2, 4, 5, 6, 7, 9, 11], keyFifths: 2 },
    { id: `${prefix}-e3`, title: isSolfege ? 'Lá Maior (3#)' : 'A Maior (3#)', description: 'Armadura com 3 sustenidos', pool: [0, 1, 2, 4, 5, 6, 7, 8, 9, 11], keyFifths: 3 },
    { id: `${prefix}-e4`, title: isSolfege ? 'Mi Maior (4#)' : 'E Maior (4#)', description: 'Armadura com 4 sustenidos', pool: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11], keyFifths: 4 },
  ];
}

function buildRhythmExercises(prefix: string, range: { min: number; max: number }): ChapterExercise[] {
  return [
    { id: `${prefix}-e1`, title: 'Semibreves e Mínimas', description: 'Notas longas, foco na duração', pool: [0, 2, 4, 5, 7, 9, 11], rhythmDurations: [4, 2], keyFifths: 0 },
    { id: `${prefix}-e2`, title: 'Semínimas', description: 'Pulso regular em semínimas', pool: [0, 2, 4, 5, 7, 9, 11], rhythmDurations: [1], keyFifths: 0 },
    { id: `${prefix}-e3`, title: 'Colcheias', description: 'Notas rápidas em colcheias', pool: [0, 2, 4, 5, 7, 9, 11], rhythmDurations: [0.5], keyFifths: 0 },
    { id: `${prefix}-e4`, title: 'Ritmo Misto', description: 'Combinação de durações', pool: [0, 2, 4, 5, 7, 9, 11], rhythmDurations: [4, 2, 1, 0.5], keyFifths: 0 },
  ];
}

function buildBassExercises(
  prefix: string,
  range: { min: number; max: number },
  notation: NotationSystem = 'letters'
): ChapterExercise[] {
  const sequence = [0, 2, 4, 5, 7, 9, 11];
  const exercises: ChapterExercise[] = [];
  for (let i = 0; i < sequence.length; i++) {
    const pool = sequence.slice(0, i + 1);
    const name = pitchClassToName(sequence[i], notation);
    exercises.push({
      id: `${prefix}-e${i + 1}`,
      title: `Clave de Fá Até ${name}`,
      description: `Clave de Fá com ${i + 1} nota(s): ${pool.map((p) => pitchClassToName(p, notation)).join(', ')}`,
      pool,
      keyFifths: 0,
      clef: 'bass',
      range,
    });
  }
  return exercises;
}

/**
 * Build the full curriculum. Each chapter adds notes progressively.
 * The pools are MIDI pitch classes (0-11) that can appear.
 */
export function buildCurriculum(notation: NotationSystem = 'letters'): CurriculumChapter[] {
  const isSolfege = notation === 'solfege';
  return [
    {
      id: 'ch1',
      index: 1,
      title: 'Notas Naturais',
      icon: 'treble',
      description: isSolfege
        ? 'Clave de Sol, apenas notas naturais (dó, ré, mi, fá, sol, lá, si)'
        : 'Clave de Sol, apenas notas naturais (C, D, E, F, G, A, B)',
      pools: {
        easy: [0, 2, 4, 7, 9, 11],
        medium: [0, 2, 4, 5, 7, 9, 11],
        hard: [0, 2, 4, 5, 7, 9, 11],
      },
      keySignature: CIRCLE_OF_FIFTHS[0],
      hasAccidentals: false,
      range: { min: 60, max: 77 },
      exercises: buildNaturalExercises('ch1', { min: 60, max: 77 }, notation),
    },
    {
      id: 'ch2',
      index: 2,
      title: 'Acidentes Sustenidos',
      icon: 'sharp',
      description: 'Introduz sustenidos (♯) e notas cromáticas',
      pools: {
        easy: [0, 1, 2, 4, 5, 7, 9, 11],
        medium: [0, 1, 2, 3, 4, 5, 7, 8, 9, 11],
        hard: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      },
      keySignature: CIRCLE_OF_FIFTHS[1], // G Major (1 sharp)
      hasAccidentals: true,
      range: { min: 60, max: 79 },
      exercises: buildSharpExercises('ch2', { min: 60, max: 79 }, notation),
    },
    {
      id: 'ch3',
      index: 3,
      title: 'Acidentes Bemóis',
      icon: 'flat',
      description: 'Introduz bemóis (♭) e armaduras com bemóis',
      pools: {
        easy: [0, 1, 2, 3, 4, 5, 7, 9, 10, 11],
        medium: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        hard: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      },
      keySignature: CIRCLE_OF_FIFTHS[8], // F Major (1 flat)
      hasAccidentals: true,
      range: { min: 58, max: 79 },
      exercises: buildFlatExercises('ch3', { min: 58, max: 79 }, notation),
    },
    {
      id: 'ch4',
      index: 4,
      title: 'Armaduras Avançadas',
      icon: 'keys',
      description: 'Armaduras com múltiplos acidentes e escala cromática',
      pools: {
        easy: [0, 2, 4, 5, 7, 9, 11],
        medium: [0, 1, 2, 4, 5, 7, 8, 9, 11],
        hard: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      },
      keySignature: CIRCLE_OF_FIFTHS[3], // A Major (3 sharps)
      hasAccidentals: true,
      range: { min: 55, max: 79 },
      exercises: buildKeySignatureExercises('ch4', { min: 55, max: 79 }, notation),
    },
    {
      id: 'ch5',
      index: 5,
      title: 'Leitura Rítmica',
      icon: 'rhythm',
      description: 'Combina notas com durações rítmicas (semibreves, mínimas, colcheias)',
      pools: {
        easy: [0, 2, 4, 5, 7, 9, 11],
        medium: [0, 1, 2, 4, 5, 7, 8, 9, 11],
        hard: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      },
      keySignature: CIRCLE_OF_FIFTHS[0],
      hasAccidentals: false,
      range: { min: 60, max: 77 },
      exercises: buildRhythmExercises('ch5', { min: 60, max: 77 }),
    },
    {
      id: 'ch6',
      index: 6,
      title: 'Clave de Fá',
      icon: 'bass',
      description: 'Leitura completa na clave de Fá (notas graves)',
      pools: {
        easy: [0, 2, 4, 7, 9, 11],
        medium: [0, 2, 4, 5, 7, 9, 11],
        hard: [0, 2, 4, 5, 7, 9, 11],
      },
      keySignature: CIRCLE_OF_FIFTHS[0],
      hasAccidentals: false,
      range: { min: 40, max: 60 },
      exercises: buildBassExercises('ch6', { min: 40, max: 60 }, notation),
    },
    {
      id: 'ch7',
      index: 7,
      title: 'Clave de Fá Acidentes',
      icon: 'bass-sharp',
      description: 'Clave de Fá com acidentes e armaduras',
      pools: {
        easy: [0, 1, 2, 4, 5, 7, 9, 10],
        medium: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11],
        hard: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      },
      keySignature: CIRCLE_OF_FIFTHS[8], // F Major
      hasAccidentals: true,
      range: { min: 38, max: 64 },
      exercises: buildFlatExercises('ch7', { min: 38, max: 64 }).map((e) => ({ ...e, clef: 'bass' as const })),
    },
    {
      id: 'ch8',
      index: 8,
      title: 'Cromático Completo',
      icon: 'chromatic',
      description: 'Cromatismo completo em ambas as claves',
      pools: {
        easy: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        medium: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        hard: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      },
      keySignature: CIRCLE_OF_FIFTHS[4], // E Major (4 sharps)
      hasAccidentals: true,
      range: { min: 55, max: 81 },
      exercises: [
        { id: 'ch8-e1', title: 'Cromático Graves', description: 'Cromatismo na clave de Fá', pool: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], keyFifths: 0, clef: 'bass', range: { min: 40, max: 64 } },
        { id: 'ch8-e2', title: 'Cromático Agudos', description: 'Cromatismo na clave de Sol', pool: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], keyFifths: 0, clef: 'treble', range: { min: 55, max: 81 } },
        { id: 'ch8-e3', title: 'Com Armadura', description: 'Cromático com armadura de 4 sustenidos', pool: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], keyFifths: 4, clef: 'treble', range: { min: 55, max: 81 } },
      ],
    },
  ];
}

/** Duration values for rhythmic chapters (in beats). */
export const RHYTHMIC_DURATIONS = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
} as const;

/** Human-readable labels for difficulties. */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
};
