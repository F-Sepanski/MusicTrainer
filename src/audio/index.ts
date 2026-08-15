/**
 * Audio slice — real-time audio engine, frequency/pitch utilities, and the
 * AudioWorklet processor. Public surface of the slice.
 *
 * Note: the worklet processor module is intentionally NOT re-exported here —
 * it is loaded directly by the AudioEngine at runtime (see AudioEngine.ts).
 *
 * @module audio
 */

export { audioEngine, AudioEngine, type PitchCallback } from './AudioEngine';
export * from './noteFrequencies';
