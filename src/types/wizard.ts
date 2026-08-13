/**
 * Setup Wizard types for environment calibration.
 *
 * @module types/wizard
 */

export interface WizardConfig {
  /** Selected microphone device ID */
  deviceId: string;
  /** Minimum volume threshold for note detection (RMS, 0-1) */
  volumeThreshold: number;
  /** Tolerance in cents for pitch matching */
  toleranceCents: number;
  /** A4 reference frequency in Hz */
  a4Frequency: number;
  /** Selected instrument */
  instrument: InstrumentType;
  /** Selected clef */
  clef: 'treble' | 'bass';
  /** Note hold delay in ms before registering as correct */
  noteDelayMs: number;
}

export type InstrumentType =
  | 'piano'
  | 'guitar'
  | 'violin'
  | 'flute'
  | 'saxophone'
  | 'trumpet'
  | 'voice'
  | 'other';

export interface PitchData {
  frequency: number;
  midiNote: number;
  noteName: string;
  cents: number;
  volume: number;
  confidence: number;
}
