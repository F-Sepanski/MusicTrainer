/**
 * Shared domain — canonical types and constants.
 *
 * Single source of truth for cross-cutting domain concepts. Consumers
 * import from this barrel (or the specific module) rather than
 * duplicating definitions.
 *
 * @module shared/domain
 */

export type { Clef } from './clef';
export type { Difficulty } from './difficulty';
export type { InputMode } from './inputMode';
export type { PitchData } from './pitch';
export type { IconName } from './iconName';
export type { InstrumentType } from './instrumentType';
export type { ManualType } from './manualType';
export type { InstrumentOption, ManualOption } from './instruments';
export { INSTRUMENTS, MANUAL_TYPES } from './instruments';
