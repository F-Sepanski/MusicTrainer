/**
 * Canonical pitch-detection data type.
 *
 * @module shared/domain/pitch
 */

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
