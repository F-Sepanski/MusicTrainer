/**
 * Canonical instruments and manual-input widgets.
 *
 * Single source of truth for the instrument and manual-widget catalogs
 * shared by the Setup Wizard and the Settings modal.
 *
 * @module shared/domain/instruments
 */

import type { IconName } from './iconName';
import type { InstrumentType } from './instrumentType';
import type { ManualType } from './manualType';

/** A selectable instrument, with an optional description. */
export interface InstrumentOption {
  type: InstrumentType;
  label: string;
  icon: IconName;
  /** Optional longer description (used in the setup wizard). */
  desc?: string;
}

/** A selectable manual-input widget, with an optional description. */
export interface ManualOption {
  type: ManualType;
  label: string;
  icon: IconName;
  /** Optional longer description (used in the setup wizard). */
  desc?: string;
}

export const INSTRUMENTS: InstrumentOption[] = [
  { type: 'piano', label: 'Piano', icon: 'piano' },
  { type: 'guitar', label: 'Violão', icon: 'guitar' },
  { type: 'violin', label: 'Violino', icon: 'violin' },
  { type: 'flute', label: 'Flauta', icon: 'flute' },
  { type: 'saxophone', label: 'Saxofone', icon: 'sax' },
  { type: 'trumpet', label: 'Trompete', icon: 'trumpet' },
  { type: 'voice', label: 'Voz', icon: 'voice' },
  { type: 'other', label: 'Outro', icon: 'other' },
];

export const MANUAL_TYPES: ManualOption[] = [
  { type: 'piano', label: 'Teclado/Piano', icon: 'piano', desc: 'Clique nas teclas' },
  { type: 'guitar', label: 'Braço de Violão', icon: 'guitar', desc: 'Clique nas casas' },
  { type: 'circle', label: 'Círculo de Quintas', icon: 'music', desc: 'Selecione a nota no círculo' },
];
