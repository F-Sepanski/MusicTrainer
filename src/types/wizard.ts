/**
 * Setup Wizard types for environment calibration.
 *
 * @module types/wizard
 */

import type { InputMode, PitchData, InstrumentType, ManualType } from '@/shared/domain';

export type { InputMode, PitchData, InstrumentType, ManualType };

export type Level = 'beginner' | 'learner' | 'intermediate' | 'experienced' | 'professional';

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
  /** Note hold delay in ms before registering as correct */
  noteDelayMs: number;
  /** User skill level — gates chapter access */
  level: Level;
  /** Input method: microphone or manual click/keyboard */
  inputMode: InputMode;
  /** Manual input widget type (when inputMode is 'manual') */
  manualType: ManualType;
  /** Number of notes per exercise */
  noteCount?: number;
  /** Notation system: letters (C, D, E...) or solfege (Dó, Ré, Mi...) */
  notationSystem?: 'letters' | 'solfege';
  /** Octave shift / transposition: -2 (2 abaixo), -1 (1 abaixo / violão), 0 (real), 1 (1 acima), 2 (2 acima) */
  octaveShift?: number;
}
