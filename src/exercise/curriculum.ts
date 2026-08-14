/**
 * Curriculum — progressive chapters, difficulty modes, key signatures,
 * and note pools for sight-reading training.
 *
 * @module exercise/curriculum
 */

export type Difficulty = 'easy' | 'medium' | 'hard';
export type InputMode = 'mic' | 'manual';
/** Supported clefs. 'grand' = both staves simultaneously. */
export type Clef = 'treble' | 'bass' | 'grand';

export interface KeySignature {
  /** Number of sharps (positive) or flats (negative) */
  fifths: number;
  /** Name, e.g. "G Major" */
  name: string;
  /** Accidental letters, e.g. ['F'] for G Major */
  accidentals: string[];
}

/** A progressive level within a chapter (an exercise). */
export interface ChapterExercise {
  /** Level id, e.g. 'c1-ch1-n1' */
  id: string;
  /** Level number (1-based) */
  level: number;
  /** Human-readable title */
  title: string;
  /** Focus description */
  description: string;
  /** Which MIDI pitch classes (0-11) this level uses */
  pool: number[];
  /** Explicit MIDI notes to generate from (overrides pool+range random) */
  midiNotes?: number[];
  /** Explicit notes with exact spellings (for enharmonics like E#, Cb) */
  explicitNotes?: { midiNote: number; vfKey: string }[];
  /** Optional specific pitch class to focus */
  focusNote?: number;
  /** Key signature for this level (fifths) */
  keyFifths: number;
  /** If set, dynamically switches key signatures mid-exercise among these fifths values */
  keyFifthsPool?: number[];
  /** Clef to use ('treble', 'bass', or 'grand') */
  clef: Clef;
  /** MIDI range */
  range: { min: number; max: number };
  /** Whether notes include accidentals even outside the key signature */
  hasAccidentals?: boolean;
  /** Accidental spelling preference: 'sharp' | 'flat' | 'mixed' */
  accidentalType?: 'sharp' | 'flat' | 'mixed';
}

export interface Chapter {
  id: string;
  index: number;
  title: string;
  icon: string;
  description: string;
  clef: Clef;
  /** MIDI range for the chapter */
  range: { min: number; max: number };
  /** Multiple progressive levels for this chapter */
  exercises: ChapterExercise[];
}

export interface Course {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  icon: string;
  chapters: Chapter[];
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

/** Note letters A-G mapped to their accidental direction. */
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

/** Convert a KeySignature fifths count to the note letters that are altered. */
export function fifthsToAccidentals(fifths: number): string[] {
  if (fifths === 0) return [];
  if (fifths > 0) return SHARP_ORDER.slice(0, fifths);
  return FLAT_ORDER.slice(0, -fifths);
}

import { pitchClassToName, type NotationSystem } from '../audio/noteFrequencies';

/** Map pitch class to its note name (C=0 → 'C' or 'Dó', etc.). */
export function pitchClassToLetter(pitchClass: number, notation: NotationSystem = 'letters'): string {
  return pitchClassToName(pitchClass, notation, false);
}

/** Get human readable key name in letters or solfege */
export function getKeyDisplayName(fifths: number, notation: NotationSystem = 'letters'): string {
  const mapSolfege: Record<number, string> = {
    0: 'Dó Maior',
    1: 'Sol Maior (1♯)',
    2: 'Ré Maior (2♯)',
    3: 'Lá Maior (3♯)',
    4: 'Mi Maior (4♯)',
    5: 'Si Maior (5♯)',
    6: 'Fá♯ Maior (6♯)',
    7: 'Dó♯ Maior (7♯)',
    [-1]: 'Fá Maior (1♭)',
    [-2]: 'Si♭ Maior (2♭)',
    [-3]: 'Mi♭ Maior (3♭)',
    [-4]: 'Lá♭ Maior (4♭)',
    [-5]: 'Ré♭ Maior (5♭)',
    [-6]: 'Sol♭ Maior (6♭)',
    [-7]: 'Dó♭ Maior (7♭)',
  };

  const mapLetters: Record<number, string> = {
    0: 'C Major',
    1: 'G Major (1#)',
    2: 'D Major (2#)',
    3: 'A Major (3#)',
    4: 'E Major (4#)',
    5: 'B Major (5#)',
    6: 'F# Major (6#)',
    7: 'C# Major (7#)',
    [-1]: 'F Major (1b)',
    [-2]: 'Bb Major (2b)',
    [-3]: 'Eb Major (3b)',
    [-4]: 'Ab Major (4b)',
    [-5]: 'Db Major (5b)',
    [-6]: 'Gb Major (6b)',
    [-7]: 'Cb Major (7b)',
  };

  return notation === 'solfege'
    ? (mapSolfege[fifths] ?? `${fifths} acidentes`)
    : (mapLetters[fifths] ?? `${fifths} fifths`);
}

/** Pitch classes for all 15 major diatonic keys (-7 to 7) */
export const KEY_DIATONIC_POOLS: Record<number, number[]> = {
  0: [0, 2, 4, 5, 7, 9, 11], // C
  1: [7, 9, 11, 0, 2, 4, 6], // G (F#)
  2: [2, 4, 6, 7, 9, 11, 1], // D (F#, C#)
  3: [9, 11, 1, 2, 4, 6, 8], // A (F#, C#, G#)
  4: [4, 6, 8, 9, 11, 1, 3], // E (F#, C#, G#, D#)
  5: [11, 1, 3, 4, 6, 8, 10], // B (F#, C#, G#, D#, A#)
  6: [6, 8, 10, 11, 1, 3, 5], // F# (F#, C#, G#, D#, A#, E#)
  7: [1, 3, 5, 6, 8, 10, 0], // C# (F#, C#, G#, D#, A#, E#, B#)
  [-1]: [5, 7, 9, 10, 0, 2, 4], // F (Bb)
  [-2]: [10, 0, 2, 3, 5, 7, 9], // Bb (Bb, Eb)
  [-3]: [3, 5, 7, 8, 10, 0, 2], // Eb (Bb, Eb, Ab)
  [-4]: [8, 10, 0, 1, 3, 5, 7], // Ab (Bb, Eb, Ab, Db)
  [-5]: [1, 3, 5, 6, 8, 10, 0], // Db (Bb, Eb, Ab, Db, Gb)
  [-6]: [6, 8, 10, 11, 1, 3, 5], // Gb (Bb, Eb, Ab, Db, Gb, Cb)
  [-7]: [11, 1, 3, 4, 6, 8, 10], // Cb (Bb, Eb, Ab, Db, Gb, Cb, Fb)
};

/** Build all 18 progressive key signature levels (7 sharps + 7 flats + 4 mixed mid-exercise levels) */
function buildKeySignatureExercises(
  prefix: string,
  clef: Clef,
  range: { min: number; max: number }
): ChapterExercise[] {
  return [
    // ── Sustenidos (1# a 7#) ──
    {
      id: `${prefix}-n1`,
      level: 1,
      title: 'Sol Maior (1♯)',
      description: '1 sustenido na armadura: Fá♯',
      pool: KEY_DIATONIC_POOLS[1],
      keyFifths: 1,
      clef,
      range,
    },
    {
      id: `${prefix}-n2`,
      level: 2,
      title: 'Ré Maior (2♯)',
      description: '2 sustenidos na armadura: Fá♯, Dó♯',
      pool: KEY_DIATONIC_POOLS[2],
      keyFifths: 2,
      clef,
      range,
    },
    {
      id: `${prefix}-n3`,
      level: 3,
      title: 'Lá Maior (3♯)',
      description: '3 sustenidos na armadura: Fá♯, Dó♯, Sol♯',
      pool: KEY_DIATONIC_POOLS[3],
      keyFifths: 3,
      clef,
      range,
    },
    {
      id: `${prefix}-n4`,
      level: 4,
      title: 'Mi Maior (4♯)',
      description: '4 sustenidos na armadura: Fá♯, Dó♯, Sol♯, Ré♯',
      pool: KEY_DIATONIC_POOLS[4],
      keyFifths: 4,
      clef,
      range,
    },
    {
      id: `${prefix}-n5`,
      level: 5,
      title: 'Si Maior (5♯)',
      description: '5 sustenidos na armadura: Fá♯, Dó♯, Sol♯, Ré♯, Lá♯',
      pool: KEY_DIATONIC_POOLS[5],
      keyFifths: 5,
      clef,
      range,
    },
    {
      id: `${prefix}-n6`,
      level: 6,
      title: 'Fá♯ Maior (6♯)',
      description: '6 sustenidos na armadura: Fá♯, Dó♯, Sol♯, Ré♯, Lá♯, Mi♯',
      pool: KEY_DIATONIC_POOLS[6],
      keyFifths: 6,
      clef,
      range,
    },
    {
      id: `${prefix}-n7`,
      level: 7,
      title: 'Dó♯ Maior (7♯)',
      description: '7 sustenidos na armadura: Fá♯, Dó♯, Sol♯, Ré♯, Lá♯, Mi♯, Si♯',
      pool: KEY_DIATONIC_POOLS[7],
      keyFifths: 7,
      clef,
      range,
    },

    // ── Bemóis (1♭ a 7♭) ──
    {
      id: `${prefix}-n8`,
      level: 8,
      title: 'Fá Maior (1♭)',
      description: '1 bemol na armadura: Si♭',
      pool: KEY_DIATONIC_POOLS[-1],
      keyFifths: -1,
      clef,
      range,
    },
    {
      id: `${prefix}-n9`,
      level: 9,
      title: 'Si♭ Maior (2♭)',
      description: '2 bemóis na armadura: Si♭, Mi♭',
      pool: KEY_DIATONIC_POOLS[-2],
      keyFifths: -2,
      clef,
      range,
    },
    {
      id: `${prefix}-n10`,
      level: 10,
      title: 'Mi♭ Maior (3♭)',
      description: '3 bemóis na armadura: Si♭, Mi♭, Lá♭',
      pool: KEY_DIATONIC_POOLS[-3],
      keyFifths: -3,
      clef,
      range,
    },
    {
      id: `${prefix}-n11`,
      level: 11,
      title: 'Lá♭ Maior (4♭)',
      description: '4 bemóis na armadura: Si♭, Mi♭, Lá♭, Ré♭',
      pool: KEY_DIATONIC_POOLS[-4],
      keyFifths: -4,
      clef,
      range,
    },
    {
      id: `${prefix}-n12`,
      level: 12,
      title: 'Ré♭ Maior (5♭)',
      description: '5 bemóis na armadura: Si♭, Mi♭, Lá♭, Ré♭, Sol♭',
      pool: KEY_DIATONIC_POOLS[-5],
      keyFifths: -5,
      clef,
      range,
    },
    {
      id: `${prefix}-n13`,
      level: 13,
      title: 'Sol♭ Maior (6♭)',
      description: '6 bemóis na armadura: Si♭, Mi♭, Lá♭, Ré♭, Sol♭, Dó♭',
      pool: KEY_DIATONIC_POOLS[-6],
      keyFifths: -6,
      clef,
      range,
    },
    {
      id: `${prefix}-n14`,
      level: 14,
      title: 'Dó♭ Maior (7♭)',
      description: '7 bemóis na armadura: Si♭, Mi♭, Lá♭, Ré♭, Sol♭, Dó♭, Fá♭',
      pool: KEY_DIATONIC_POOLS[-7],
      keyFifths: -7,
      clef,
      range,
    },

    // ── Subparte Final: Troca Mista Dinâmica no Meio do Exercício ──
    {
      id: `${prefix}-n15`,
      level: 15,
      title: 'Misto até 3 Acidentes',
      description: 'Troca de armadura no meio do exercício (Sol, Ré, Lá, Fá, Si♭, Mi♭)',
      pool: CHROMATIC_MIDI,
      keyFifths: 1,
      keyFifthsPool: [1, 2, 3, -1, -2, -3],
      clef,
      range,
    },
    {
      id: `${prefix}-n16`,
      level: 16,
      title: 'Misto até 4 Acidentes',
      description: 'Troca de armadura no meio do exercício com até 4 acidentes (inclui Mi e Lá♭ Maior)',
      pool: CHROMATIC_MIDI,
      keyFifths: 2,
      keyFifthsPool: [1, 2, 3, 4, -1, -2, -3, -4],
      clef,
      range,
    },
    {
      id: `${prefix}-n17`,
      level: 17,
      title: 'Misto até 5 Acidentes',
      description: 'Troca de armadura no meio do exercício com até 5 acidentes (inclui Si e Ré♭ Maior)',
      pool: CHROMATIC_MIDI,
      keyFifths: 3,
      keyFifthsPool: [1, 2, 3, 4, 5, -1, -2, -3, -4, -5],
      clef,
      range,
    },
    {
      id: `${prefix}-n18`,
      level: 18,
      title: 'Misto até 6 e 7 Acidentes',
      description: 'Desafio mestre com troca contínua entre todas as 14 armaduras do círculo de quintas',
      pool: CHROMATIC_MIDI,
      keyFifths: 4,
      keyFifthsPool: [1, 2, 3, 4, 5, 6, 7, -1, -2, -3, -4, -5, -6, -7],
      clef,
      range,
    },
  ];
}

/** Natural note MIDI pitch classes (white keys). */
export const NATURAL_MIDI = [0, 2, 4, 5, 7, 9, 11];
/** All 12 chromatic MIDI pitch classes. */
export const CHROMATIC_MIDI = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/* MIDI reference constants. C4 = 60, A4 = 69. */
const C4 = 60;
const G5 = 79;
const F2 = 41;
const D6 = 86;
const C2 = 36;

/** Build progressive natural-note levels (treble) mirroring the bass chapter:
 *  note-by-note from the C4 anchor upward, then descending below, then full staff. */
function buildTrebleNaturalLevels(prefix: string, notation: NotationSystem): ChapterExercise[] {
  const n = (midi: number) => pitchClassToName(((midi % 12) + 12) % 12, notation);
  const level = (id: string, num: number, title: string, desc: string, midiNotes: number[], min: number, max: number): ChapterExercise => ({
    id: `${prefix}-${id}`,
    level: num,
    title,
    description: desc,
    pool: [...new Set(midiNotes.map((m) => ((m % 12) + 12) % 12))],
    midiNotes,
    keyFifths: 0,
    clef: 'treble',
    range: { min, max },
  });

  return [
    level('n1', 1, 'C4 e D4', `C4, D4 a partir do Dó central (${n(60)}, ${n(62)})`, [60, 62], 60, 62),
    level('n2', 2, 'C4 até E4', `C4, D4, E4 (${n(60)}, ${n(62)}, ${n(64)})`, [60, 62, 64], 60, 64),
    level('n3', 3, 'C4 até F4', `C4, D4, E4, F4 (${n(60)}, ${n(62)}, ${n(64)}, ${n(65)})`, [60, 62, 64, 65], 60, 65),
    level('n4', 4, 'C4 até G4 (Sol - Nota Âncora)', `C4 a G4 (${n(60)} até ${n(67)})`, [60, 62, 64, 65, 67], 60, 67),
    level('n5', 5, 'Descendo — B3 + A3', `B3, A3 descendo (${n(59)}, ${n(57)})`, [59, 57], 57, 59),
    level('n6', 6, 'C4 até A4', `C4, D4, E4, F4, G4, A4 (${n(60)} até ${n(69)})`, [60, 62, 64, 65, 67, 69], 60, 69),
    level('n7', 7, 'C4 até B4', `C4 até B4 (${n(60)} até ${n(71)})`, [60, 62, 64, 65, 67, 69, 71], 60, 71),
    level('n8', 8, 'C4 até C5 (Dó Agudo)', `C4 até C5 — completa a 1ª oitava (${n(60)} até ${n(72)})`, [60, 62, 64, 65, 67, 69, 71, 72], 60, 72),
    level('n9', 9, 'Pauta Completa da Clave de Sol', `Todas as notas naturais na pauta (${n(60)} até ${n(79)} / C4 até G5)`, [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79], 60, 79),
  ];
}

/* ── CURSO 1: CLAVE DE SOL ─────────────────────────────── */
function buildCourse1Treble(notation: NotationSystem): Chapter[] {
  const chapters: Chapter[] = [];

  chapters.push({
    id: 'c1-ch1',
    index: 1,
    title: 'Notas Naturais na Pauta',
    icon: 'treble',
    description: 'Dominar a extensão principal da Clave de Sol dentro do pentagrama, adicionando 1 nota por nível.',
    clef: 'treble',
    range: { min: C4, max: G5 },
    exercises: buildTrebleNaturalLevels('c1-ch1', notation),
  });

  chapters.push({
    id: 'c1-ch2',
    index: 2,
    title: 'Linhas e Espaços Suplementares',
    icon: 'treble',
    description: 'Expandir a leitura para fora do pentagrama (registros graves e agudos).',
    clef: 'treble',
    range: { min: 41, max: D6 },
    exercises: [
      { id: 'c1-ch2-n1', level: 1, title: 'Inferiores I', description: 'Abaixo do C4 até a 2ª linha suplementar inferior', pool: [7, 9], midiNotes: [57, 55], keyFifths: 0, clef: 'treble', range: { min: 55, max: 57 } },
      { id: 'c1-ch2-n2', level: 2, title: 'Inferiores II', description: 'Extensão grave com revisão de B3, A3, C4', pool: [0, 9, 11], midiNotes: [55, 53, 52, 60], keyFifths: 0, clef: 'treble', range: { min: 52, max: 60 } },
      { id: 'c1-ch2-n3', level: 3, title: 'Superiores I', description: '1ª linha e 1º espaço suplementar superior', pool: [9, 11], midiNotes: [81, 83], keyFifths: 0, clef: 'treble', range: { min: 81, max: 83 } },
      { id: 'c1-ch2-n4', level: 4, title: 'Superiores II', description: '2ª linha e 2º espaço suplementar superior', pool: [0, 2], midiNotes: [84, 86], keyFifths: 0, clef: 'treble', range: { min: 84, max: 86 } },
      { id: 'c1-ch2-n5', level: 5, title: 'Extremos Gerais', description: 'Apenas as suplementares (F3 a C4 e A5 a D6)', pool: [0, 2, 9, 11], midiNotes: [41, 43, 45, 47, 48, 55, 57, 60, 81, 83, 84, 86], keyFifths: 0, clef: 'treble', range: { min: 41, max: 86 } },
      { id: 'c1-ch2-n6', level: 6, title: 'Revisão Total Natural', description: 'Extensão completa da Clave de Sol (F3 até D6)', pool: [0, 2, 4, 5, 7, 9, 11], keyFifths: 0, clef: 'treble', range: { min: 41, max: 86 } },
    ],
  });

  chapters.push({
    id: 'c1-ch3',
    index: 3,
    title: 'Acidentes Ocorrentes',
    icon: 'sharp',
    description: 'Reconhecer alterações imediatas coladas à nota (restrito à pauta principal).',
    clef: 'treble',
    range: { min: C4, max: G5 },
    exercises: [
      { id: 'c1-ch3-n1', level: 1, title: 'Sustenidos Básicos', description: 'F#, C# dentro da pauta (F4#, C5#, F5#)', pool: [1, 6], midiNotes: [61, 66, 73, 78], keyFifths: 0, clef: 'treble', range: { min: 61, max: 78 }, hasAccidentals: true, accidentalType: 'sharp' },
      { id: 'c1-ch3-n2', level: 2, title: 'Sustenidos Avançados', description: 'G#, D#, A# dentro da pauta', pool: [3, 8, 10], midiNotes: [63, 68, 70, 75, 80], keyFifths: 0, clef: 'treble', range: { min: 63, max: 80 }, hasAccidentals: true, accidentalType: 'sharp' },
      { id: 'c1-ch3-n3', level: 3, title: 'Bemóis Básicos', description: 'Bb, Eb dentro da pauta', pool: [3, 10], midiNotes: [63, 70, 75], keyFifths: 0, clef: 'treble', range: { min: 63, max: 75 }, hasAccidentals: true, accidentalType: 'flat' },
      { id: 'c1-ch3-n4', level: 4, title: 'Bemóis Avançados', description: 'Ab, Db, Gb dentro da pauta', pool: [1, 6, 8], midiNotes: [61, 66, 68, 73, 78, 80], keyFifths: 0, clef: 'treble', range: { min: 61, max: 80 }, hasAccidentals: true, accidentalType: 'flat' },
      { id: 'c1-ch3-n5', level: 5, title: 'Bequadro', description: 'Identificação de notas alteradas seguidas de cancelamento', pool: [0, 2, 4, 5, 7, 9, 11, 1, 3, 6, 8, 10], keyFifths: 0, clef: 'treble', range: { min: 60, max: 79 }, hasAccidentals: true, accidentalType: 'mixed' },
      {
        id: 'c1-ch3-n6',
        level: 6,
        title: 'Enarmonias Sem Tecla Preta',
        description: 'E♯, B♯, F♭, C♭ dentro da pauta',
        pool: [0, 4, 5, 11],
        keyFifths: 0,
        clef: 'treble',
        range: { min: 60, max: 79 },
        hasAccidentals: true,
        explicitNotes: [
          { midiNote: 65, vfKey: 'e#/4' }, // E#4 = F4
          { midiNote: 72, vfKey: 'b#/4' }, // B#4 = C5
          { midiNote: 64, vfKey: 'fb/4' }, // Fb4 = E4
          { midiNote: 59, vfKey: 'cb/4' }, // Cb4 = B3
          { midiNote: 77, vfKey: 'fb/5' }, // Fb5 = E5 (in staff)
          { midiNote: 69, vfKey: 'e#/4' }, // E#4 again (variety)
        ],
      },
      { id: 'c1-ch3-n7', level: 7, title: 'Mix Cromático na Pauta', description: 'Qualquer nota com ou sem acidente dentro da pauta (C4 a G5)', pool: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], keyFifths: 0, clef: 'treble', range: { min: 60, max: 79 }, hasAccidentals: true, accidentalType: 'mixed' },
    ],
  });

  chapters.push({
    id: 'c1-ch4',
    index: 4,
    title: 'Armaduras de Clave',
    icon: 'keys',
    description: 'Identificar notas alteradas indiretamente através da armadura no início da pauta e transições de tonalidade.',
    clef: 'treble',
    range: { min: C4, max: G5 },
    exercises: buildKeySignatureExercises('c1-ch4', 'treble', { min: C4, max: G5 }),
  });

  return chapters;
}

/* ── CURSO 2: CLAVE DE FÁ ─────────────────────────────── */
function buildCourse2Bass(notation: NotationSystem): Chapter[] {
  const chapters: Chapter[] = [];

  chapters.push({
    id: 'c2-ch1',
    index: 1,
    title: 'Notas Naturais na Pauta',
    icon: 'bass',
    description: 'Mapear a Clave de Fá partindo do Fá3 (âncora) e expandindo progressivamente.',
    clef: 'bass',
    range: { min: F2, max: 60 },
    exercises: [
      { id: 'c2-ch1-n1', level: 1, title: 'F3 e G3', description: 'F3, G3 a partir da âncora', pool: [5, 7], midiNotes: [53, 55], keyFifths: 0, clef: 'bass', range: { min: 53, max: 55 } },
      { id: 'c2-ch1-n2', level: 2, title: 'F3 até A3', description: 'F3, G3, A3', pool: [5, 7, 9], midiNotes: [53, 55, 57], keyFifths: 0, clef: 'bass', range: { min: 53, max: 57 } },
      { id: 'c2-ch1-n3', level: 3, title: 'F3 até B3', description: 'F3, G3, A3, B3', pool: [5, 7, 9, 11], midiNotes: [53, 55, 57, 59], keyFifths: 0, clef: 'bass', range: { min: 53, max: 59 } },
      { id: 'c2-ch1-n4', level: 4, title: 'F3 até C4 (Dó Central)', description: 'F3, G3, A3, B3, C4', pool: [0, 5, 7, 9, 11], midiNotes: [53, 55, 57, 59, 60], keyFifths: 0, clef: 'bass', range: { min: 53, max: 60 } },
      { id: 'c2-ch1-n5', level: 5, title: 'Descendo — E3 + D3', description: 'F3, E3, D3 (descendo)', pool: [2, 4, 5], midiNotes: [53, 52, 50], keyFifths: 0, clef: 'bass', range: { min: 50, max: 53 } },
      { id: 'c2-ch1-n6', level: 6, title: 'C3 até C4', description: 'C3, D3, E3, F3, G3, A3, B3, C4', pool: [0, 2, 4, 5, 7, 9, 11], midiNotes: [48, 50, 52, 53, 55, 57, 59, 60], keyFifths: 0, clef: 'bass', range: { min: 48, max: 60 } },
      { id: 'c2-ch1-n7', level: 7, title: 'B2 + A2', description: 'B2, A2 descendo', pool: [9, 11], midiNotes: [47, 45], keyFifths: 0, clef: 'bass', range: { min: 45, max: 47 } },
      { id: 'c2-ch1-n8', level: 8, title: 'G2 + F2', description: 'G2, F2 descendo', pool: [5, 7], midiNotes: [43, 41], keyFifths: 0, clef: 'bass', range: { min: 41, max: 43 } },
      { id: 'c2-ch1-n9', level: 9, title: 'Pauta Completa da Clave de Fá', description: 'Todas as notas naturais dentro da pauta (F2 até C4)', pool: [0, 2, 4, 5, 7, 9, 11], keyFifths: 0, clef: 'bass', range: { min: 41, max: 60 } },
    ],
  });

  chapters.push({
    id: 'c2-ch2',
    index: 2,
    title: 'Linhas e Espaços Suplementares',
    icon: 'bass',
    description: 'Dominar os subgraves e a transição para a região média.',
    clef: 'bass',
    range: { min: 35, max: 64 },
    exercises: [
      { id: 'c2-ch2-n1', level: 1, title: 'Superiores', description: 'D4, E4 (subindo em direção à Clave de Sol)', pool: [2, 4], midiNotes: [62, 64], keyFifths: 0, clef: 'bass', range: { min: 62, max: 64 } },
      { id: 'c2-ch2-n2', level: 2, title: 'Inferiores I', description: 'E2, D2 (1ª linha e 1º espaço suplementar inferior)', pool: [2, 4], midiNotes: [40, 38], keyFifths: 0, clef: 'bass', range: { min: 38, max: 40 } },
      { id: 'c2-ch2-n3', level: 3, title: 'Inferiores II (Subgraves)', description: 'C2, B1 (2ª linha e 2º espaço suplementar inferior)', pool: [0, 11], midiNotes: [36, 35], keyFifths: 0, clef: 'bass', range: { min: 35, max: 36 } },
      { id: 'c2-ch2-n4', level: 4, title: 'Extremos Gerais', description: 'Suplementares (B1 a E2 e D4 a E4)', pool: [0, 2, 4, 11], midiNotes: [35, 38, 40, 62, 64, 36], keyFifths: 0, clef: 'bass', range: { min: 35, max: 64 } },
      { id: 'c2-ch2-n5', level: 5, title: 'Revisão Total Natural', description: 'Extensão completa da Clave de Fá (B1 até E4)', pool: [0, 2, 4, 5, 7, 9, 11], keyFifths: 0, clef: 'bass', range: { min: 35, max: 64 } },
    ],
  });

  chapters.push({
    id: 'c2-ch3',
    index: 3,
    title: 'Acidentes Ocorrentes',
    icon: 'sharp',
    description: 'Reconhecer alterações em registros graves (restrito à pauta principal).',
    clef: 'bass',
    range: { min: 41, max: 60 },
    exercises: [
      { id: 'c2-ch3-n1', level: 1, title: 'Sustenidos Básicos', description: 'F#, C#, G#', pool: [1, 6, 8], midiNotes: [42, 44, 49, 54, 56, 61], keyFifths: 0, clef: 'bass', range: { min: 42, max: 61 }, hasAccidentals: true, accidentalType: 'sharp' },
      { id: 'c2-ch3-n2', level: 2, title: 'Sustenidos Avançados', description: 'D#, A#', pool: [3, 10], midiNotes: [39, 46, 51, 58], keyFifths: 0, clef: 'bass', range: { min: 39, max: 58 }, hasAccidentals: true, accidentalType: 'sharp' },
      { id: 'c2-ch3-n3', level: 3, title: 'Bemóis Básicos', description: 'Bb, Eb, Ab', pool: [3, 8, 10], midiNotes: [44, 46, 51, 56, 58], keyFifths: 0, clef: 'bass', range: { min: 44, max: 58 }, hasAccidentals: true, accidentalType: 'flat' },
      { id: 'c2-ch3-n4', level: 4, title: 'Bemóis Avançados', description: 'Db, Gb', pool: [1, 6], midiNotes: [42, 49, 54, 61], keyFifths: 0, clef: 'bass', range: { min: 42, max: 61 }, hasAccidentals: true, accidentalType: 'flat' },
      { id: 'c2-ch3-n5', level: 5, title: 'Bequadro', description: 'Identificação e cancelamento de alterações', pool: [0, 2, 4, 5, 7, 9, 11, 1, 3, 6, 8, 10], keyFifths: 0, clef: 'bass', range: { min: 41, max: 60 }, hasAccidentals: true, accidentalType: 'mixed' },
      {
        id: 'c2-ch3-n6',
        level: 6,
        title: 'Enarmonias Sem Tecla Preta',
        description: 'E♯, B♯, F♭, C♭ na Clave de Fá',
        pool: [0, 4, 5, 11],
        keyFifths: 0,
        clef: 'bass',
        range: { min: 41, max: 60 },
        hasAccidentals: true,
        explicitNotes: [
          { midiNote: 53, vfKey: 'e#/3' }, // E#3 = F3
          { midiNote: 60, vfKey: 'b#/3' }, // B#3 = C4
          { midiNote: 52, vfKey: 'fb/3' }, // Fb3 = E3
          { midiNote: 47, vfKey: 'cb/3' }, // Cb3 = B2
          { midiNote: 45, vfKey: 'fb/3' }, // Fb2 = E2 (sub-bass)
          { midiNote: 59, vfKey: 'e#/3' }, // E#3 again
        ],
      },
      { id: 'c2-ch3-n7', level: 7, title: 'Mix Cromático na Pauta', description: 'Qualquer nota com ou sem acidente na Clave de Fá (F2 a C4)', pool: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], keyFifths: 0, clef: 'bass', range: { min: 41, max: 60 }, hasAccidentals: true, accidentalType: 'mixed' },
    ],
  });

  chapters.push({
    id: 'c2-ch4',
    index: 4,
    title: 'Armaduras de Clave',
    icon: 'keys',
    description: 'Aplicação de regras de tonalidade no contexto da Clave de Fá e transições de armadura.',
    clef: 'bass',
    range: { min: 41, max: 60 },
    exercises: buildKeySignatureExercises('c2-ch4', 'bass', { min: 41, max: 60 }),
  });

  return chapters;
}

/* ── CURSO 3: SISTEMA DUPLO (GRAND STAFF) ─────────────── */
function buildCourse3Grand(): Chapter[] {
  const chapters: Chapter[] = [];

  // Capítulo 1: Conexão e Expansão Central (C3 a C5)
  chapters.push({
    id: 'c3-ch1',
    index: 1,
    title: 'Conexão e Expansão Central',
    icon: 'clef',
    description: 'Alternância mental entre claves expandindo a partir do Dó central.',
    clef: 'grand',
    range: { min: 48, max: 72 },
    exercises: [
      { id: 'c3-ch1-n1', level: 1, title: 'O Dó Central Duplo', description: 'C4 (60) alternando entre a linha suplementar inferior (Sol) e superior (Fá)', pool: [0], midiNotes: [60], keyFifths: 0, clef: 'grand', range: { min: 60, max: 60 } },
      { id: 'c3-ch1-n2', level: 2, title: 'Passo 1: Dó e Vizinhos Imediatos', description: 'B3 (Fá), C4 (Central) e D4 (Sol)', pool: [0, 2, 11], midiNotes: [59, 60, 62], keyFifths: 0, clef: 'grand', range: { min: 59, max: 62 } },
      { id: 'c3-ch1-n3', level: 3, title: 'Passo 2: Expansão Simétrica (+2)', description: 'A3, B3 (Fá) vs C4, D4, E4 (Sol)', pool: [0, 2, 4, 9, 11], midiNotes: [57, 59, 60, 62, 64], keyFifths: 0, clef: 'grand', range: { min: 57, max: 64 } },
      { id: 'c3-ch1-n4', level: 4, title: 'Passo 3: As Notas Âncora', description: 'F3, G3, A3 (Fá) vs C4 a G4 (Sol - nota âncora)', pool: [0, 2, 4, 5, 7, 9, 11], midiNotes: [53, 55, 57, 60, 62, 64, 65, 67], keyFifths: 0, clef: 'grand', range: { min: 53, max: 67 } },
      { id: 'c3-ch1-n5', level: 5, title: 'Duas Oitavas Centrais (C3 a C5)', description: 'C3 até C4 (Fá) e C4 até C5 (Sol) completas', pool: [0, 2, 4, 5, 7, 9, 11], midiNotes: [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72], keyFifths: 0, clef: 'grand', range: { min: 48, max: 72 } },
    ],
  });

  // Capítulo 2: Pautas Internas Completas (F2 a G5)
  chapters.push({
    id: 'c3-ch2',
    index: 2,
    title: 'Pautas Internas Completas',
    icon: 'clef',
    description: 'Expandir do miolo central para toda a extensão interna das duas pautas (F2 até G5).',
    clef: 'grand',
    range: { min: 41, max: 79 },
    exercises: [
      { id: 'c3-ch2-n1', level: 1, title: 'Graves da Fá + Agudos da Sol I', description: 'A2, B2, C3 (Fá) + C5, D5, E5 (Sol)', pool: [0, 2, 4, 9, 11], midiNotes: [45, 47, 48, 60, 72, 74, 76], keyFifths: 0, clef: 'grand', range: { min: 45, max: 76 } },
      { id: 'c3-ch2-n2', level: 2, title: 'Extremos das Pautas Internas', description: 'F2, G2, A2 (Fá) + D5, E5, F5, G5 (Sol)', pool: [0, 2, 4, 5, 7, 9, 11], midiNotes: [41, 43, 45, 74, 76, 77, 79], keyFifths: 0, clef: 'grand', range: { min: 41, max: 79 } },
      { id: 'c3-ch2-n3', level: 3, title: 'Pautas Internas Totais (F2 a G5)', description: 'Todas as notas naturais dentro dos dois pentagramas', pool: [0, 2, 4, 5, 7, 9, 11], keyFifths: 0, clef: 'grand', range: { min: 41, max: 79 } },
      { id: 'c3-ch2-n4', level: 4, title: 'Saltos Intervalares Entre Claves', description: 'Pulos rápidos de oitava e quinta entre registros grave e agudo', pool: [0, 2, 4, 5, 7, 9, 11], midiNotes: [41, 48, 53, 60, 67, 72, 79], keyFifths: 0, clef: 'grand', range: { min: 41, max: 79 } },
    ],
  });

  // Capítulo 3: Linhas e Espaços Suplementares (B1 a D6)
  chapters.push({
    id: 'c3-ch3',
    index: 3,
    title: 'Extensão Total com Suplementares',
    icon: 'clef',
    description: 'Leitura de 4 oitavas incluindo registros intermediários, subgraves e superagudos.',
    clef: 'grand',
    range: { min: 35, max: 86 },
    exercises: [
      { id: 'c3-ch3-n1', level: 1, title: 'Suplementares Intermediárias', description: 'G3, A3, B3 (abaixo da Sol) vs D4, E4 (acima da Fá)', pool: [2, 4, 5, 7, 9, 11], midiNotes: [55, 57, 59, 62, 64], keyFifths: 0, clef: 'grand', range: { min: 55, max: 64 } },
      { id: 'c3-ch3-n2', level: 2, title: 'Subgraves da Clave de Fá', description: 'B1, C2, D2, E2 (suplementares inferiores da Fá)', pool: [0, 2, 4, 11], midiNotes: [35, 36, 38, 40], keyFifths: 0, clef: 'grand', range: { min: 35, max: 40 } },
      { id: 'c3-ch3-n3', level: 3, title: 'Superagudos da Clave de Sol', description: 'A5, B5, C6, D6 (suplementares superiores da Sol)', pool: [0, 2, 9, 11], midiNotes: [81, 83, 84, 86], keyFifths: 0, clef: 'grand', range: { min: 81, max: 86 } },
      { id: 'c3-ch3-n4', level: 4, title: 'Extremos Gerais Simultâneos', description: 'Subgraves (B1 a E2) + Superagudos (A5 a D6)', pool: [0, 2, 4, 9, 11], midiNotes: [35, 36, 38, 40, 41, 79, 81, 83, 84, 86], keyFifths: 0, clef: 'grand', range: { min: 35, max: 86 } },
      { id: 'c3-ch3-n5', level: 5, title: 'Grand Staff Natural Total', description: 'Qualquer nota natural no sistema duplo de 4 oitavas (B1 até D6)', pool: [0, 2, 4, 5, 7, 9, 11], keyFifths: 0, clef: 'grand', range: { min: 35, max: 86 } },
    ],
  });

  // Capítulo 4: Acidentes Ocorrentes no Grand Staff
  chapters.push({
    id: 'c3-ch4',
    index: 4,
    title: 'Acidentes Ocorrentes no Grand Staff',
    icon: 'sharp',
    description: 'Reconhecer ♯, ♭ e ♮ distribuídos entre as duas pautas.',
    clef: 'grand',
    range: { min: 41, max: 79 },
    exercises: [
      { id: 'c3-ch4-n1', level: 1, title: 'Sustenidos Básicos (F#, C#)', description: 'F# e C# alternando entre a pauta de Sol e Fá', pool: [1, 6], midiNotes: [42, 49, 54, 61, 66, 73, 78], keyFifths: 0, clef: 'grand', range: { min: 42, max: 78 }, hasAccidentals: true, accidentalType: 'sharp' },
      { id: 'c3-ch4-n2', level: 2, title: 'Sustenidos Avançados (G#, D#, A#)', description: 'G#, D#, A# no sistema duplo', pool: [3, 8, 10], midiNotes: [39, 44, 46, 51, 56, 58, 63, 68, 70, 75, 80], keyFifths: 0, clef: 'grand', range: { min: 39, max: 80 }, hasAccidentals: true, accidentalType: 'sharp' },
      { id: 'c3-ch4-n3', level: 3, title: 'Bemóis Básicos (B♭, E♭)', description: 'Bb e Eb alternando entre as duas pautas', pool: [3, 10], midiNotes: [46, 51, 58, 63, 70, 75], keyFifths: 0, clef: 'grand', range: { min: 46, max: 75 }, hasAccidentals: true, accidentalType: 'flat' },
      { id: 'c3-ch4-n4', level: 4, title: 'Bemóis Avançados (A♭, D♭, G♭)', description: 'Ab, Db, Gb nas duas pautas', pool: [1, 6, 8], midiNotes: [42, 44, 49, 54, 56, 61, 66, 68, 73, 78, 80], keyFifths: 0, clef: 'grand', range: { min: 42, max: 80 }, hasAccidentals: true, accidentalType: 'flat' },
      { id: 'c3-ch4-n5', level: 5, title: 'Bequadro no Grand Staff', description: 'Identificação e cancelamento de alterações nas duas claves', pool: [0, 2, 4, 5, 7, 9, 11, 1, 3, 6, 8, 10], keyFifths: 0, clef: 'grand', range: { min: 41, max: 79 }, hasAccidentals: true, accidentalType: 'mixed' },
      {
        id: 'c3-ch4-n6',
        level: 6,
        title: 'Enarmonias Sem Tecla Preta (Grand)',
        description: 'E♯, B♯, F♭, C♭ nas duas claves',
        pool: [0, 4, 5, 11],
        keyFifths: 0,
        clef: 'grand',
        range: { min: 41, max: 79 },
        hasAccidentals: true,
        explicitNotes: [
          { midiNote: 53, vfKey: 'e#/3' },
          { midiNote: 60, vfKey: 'b#/3' },
          { midiNote: 65, vfKey: 'e#/4' },
          { midiNote: 72, vfKey: 'b#/4' },
          { midiNote: 52, vfKey: 'fb/3' },
          { midiNote: 47, vfKey: 'cb/3' },
          { midiNote: 64, vfKey: 'fb/4' },
          { midiNote: 59, vfKey: 'cb/4' },
        ],
      },
      { id: 'c3-ch4-n7', level: 7, title: 'Mix Cromático no Grand Staff', description: 'Qualquer nota com ou sem alteração dentro das duas pautas', pool: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], keyFifths: 0, clef: 'grand', range: { min: 41, max: 79 }, hasAccidentals: true, accidentalType: 'mixed' },
    ],
  });

  // Capítulo 5: Armaduras de Clave no Sistema Duplo
  chapters.push({
    id: 'c3-ch5',
    index: 5,
    title: 'Armaduras de Clave no Sistema Duplo',
    icon: 'keys',
    description: 'Leitura simultânea com armaduras nas duas pautas e transições dinâmicas de armadura.',
    clef: 'grand',
    range: { min: 41, max: 79 },
    exercises: buildKeySignatureExercises('c3-ch5', 'grand', { min: 41, max: 79 }),
  });

  // Capítulo 6: Desafio Master
  chapters.push({
    id: 'c3-ch6',
    index: 6,
    title: 'Desafio Master',
    icon: 'sparkles',
    description: 'Avaliação final de agilidade e reflexo visual sem limitações.',
    clef: 'grand',
    range: { min: 35, max: 86 },
    exercises: [
      { id: 'c3-ch6-n1', level: 1, title: 'Random Total (Naturais)', description: 'Qualquer nota natural do sistema (B1 a D6)', pool: [0, 2, 4, 5, 7, 9, 11], keyFifths: 0, clef: 'grand', range: { min: 35, max: 86 } },
      { id: 'c3-ch6-n2', level: 2, title: 'Random Total (Cromático)', description: 'Qualquer nota com alteração no sistema com ou sem suplementar', pool: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], keyFifths: 0, clef: 'grand', range: { min: 35, max: 86 }, hasAccidentals: true, accidentalType: 'mixed' },
      { id: 'c3-ch6-n3', level: 3, title: 'Time Attack', description: 'Bater recordes de velocidade mantendo alta precisão', pool: [0, 2, 4, 5, 7, 9, 11], keyFifths: 0, clef: 'grand', range: { min: 35, max: 86 } },
      { id: 'c3-ch6-n4', level: 4, title: 'Exame Final do App', description: '64 notas em velocidade máxima (2s/nota) em qualquer clave, acidente ou armadura', pool: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], keyFifths: 4, clef: 'grand', range: { min: 35, max: 86 }, hasAccidentals: true, accidentalType: 'mixed' },
    ],
  });

  return chapters;
}

/**
 * Build the full curriculum as three progressive Courses.
 * The pools are MIDI pitch classes (0-11) that can appear.
 */
export function buildCurriculum(notation: NotationSystem = 'letters'): Course[] {
  return [
    { id: 'c1', index: 1, title: 'Curso 1', subtitle: 'Clave de Sol', icon: 'treble', chapters: buildCourse1Treble(notation) },
    { id: 'c2', index: 2, title: 'Curso 2', subtitle: 'Clave de Fá', icon: 'bass', chapters: buildCourse2Bass(notation) },
    { id: 'c3', index: 3, title: 'Curso 3', subtitle: 'Sistema Duplo', icon: 'clef', chapters: buildCourse3Grand() },
  ];
}

/* ── Difficulty configuration ─────────────────────────── */

/** Human-readable labels for difficulties. */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
};

/** Fixed number of notes per test by difficulty. */
export const DIFFICULTY_NOTE_COUNT: Record<Difficulty, number> = {
  easy: 32,
  medium: 48,
  hard: 64,
};

/** Maximum allowed average response time (ms) per note by difficulty. */
export const DIFFICULTY_TIME_LIMIT_MS: Record<Difficulty, number> = {
  easy: 4000,
  medium: 3000,
  hard: 2000,
};

/** Minimum accuracy (%) required to pass per difficulty. */
export const PASS_ACCURACY: Record<Difficulty, number> = {
  easy: 80,
  medium: 85,
  hard: 90,
};

/** Whether a clef is the grand staff. */
export function isGrandClef(clef: Clef): boolean {
  return clef === 'grand';
}

/** Whether a level uses explicit MIDI notes. */
export function usesExplicitNotes(ex: ChapterExercise): boolean {
  return !!ex.midiNotes && ex.midiNotes.length > 0;
}

/**
 * Base initial chapters unlocked per wizard experience level.
 */
export const LEVEL_BASE_UNLOCK: Record<string, number> = {
  beginner: 2,
  learner: 2,
  intermediate: 3,
  experienced: 4,
  professional: 99,
};

/**
 * Calculates the highest chapter index unlocked in a given course based on completed exercises.
 * Rule:
 * 1. Base unlocked chapters: at least first 2 chapters (Chapter 1 and 2) or based on wizard level.
 * 2. Completing the LAST exercise of any chapter `k` unlocks up to chapter `k + 2` (2 chapters ahead).
 */
export function getMaxUnlockedChapter(
  course: Course,
  progress: Record<string, 'easy' | 'medium' | 'hard'>,
  wizardLevel: string = 'beginner'
): number {
  let maxUnlocked = LEVEL_BASE_UNLOCK[wizardLevel] ?? 2;

  for (const ch of course.chapters) {
    if (ch.exercises.length === 0) continue;
    const lastEx = ch.exercises[ch.exercises.length - 1];
    // If the last exercise of this chapter was passed at any difficulty:
    if (progress[lastEx.id]) {
      maxUnlocked = Math.max(maxUnlocked, ch.index + 2);
    }
  }

  return maxUnlocked;
}

