/** Supported clefs. 'grand' renders both treble and bass staves. */
export type Clef = 'treble' | 'bass' | 'grand';

export interface PitchData {
  /** Detected fundamental frequency in Hz */
  frequency: number;
  /** MIDI note number (e.g. 60 = C4) */
  midiNote: number;
  /** Note name (e.g. "C4") */
  noteName: string;
  /** Detuning in cents from equal temperament */
  cents: number;
  /** RMS volume (0–1) */
  volume: number;
  /** Confidence of detection (0–1) */
  confidence: number;
}

export interface ExerciseNote {
  /** Unique id for this note in the exercise */
  id: number;
  /** MIDI note number */
  midiNote: number;
  /** Note name (e.g. "C4") */
  noteName: string;
  /** Duration in beats */
  duration: number;
  /** VexFlow key string (e.g. "c/4", "f#/4") */
  vfKey: string;
  /** Clef this note is rendered on (for grand staff) */
  clef?: 'treble' | 'bass';
  /** Whether this note has been played correctly */
  status: 'pending' | 'active' | 'correct' | 'incorrect';
}

export interface ExerciseConfig {
  /** Clef to use (treble, bass, or grand for both staves) */
  clef: Clef;
  /** Number of notes in the exercise */
  noteCount: number;
  /** Min MIDI note */
  minMidi: number;
  /** Max MIDI note */
  maxMidi: number;
  /** Tolerance in cents for pitch matching */
  toleranceCents: number;
  /** Note hold delay in ms before registering as correct */
  noteDelayMs: number;
}

export interface SessionResult {
  totalNotes: number;
  correctNotes: number;
  averageResponseTimeMs: number;
  averageCentsOffset: number;
  accuracy: number;
  /** Difficulty of the test taken */
  difficulty: 'easy' | 'medium' | 'hard';
  /** Whether the user passed (>=80% accuracy AND avg time within limit) */
  passed: boolean;
}

export type AppPhase = 'setup' | 'countdown' | 'playing' | 'results';
