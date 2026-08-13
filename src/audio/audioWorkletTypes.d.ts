/**
 * Type declarations for Web Audio API AudioWorklet globals.
 */

declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: any);
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}

declare function registerProcessor(name: string, processorConstructor: typeof AudioWorkletProcessor): void;

/** Global sampleRate available in AudioWorklet scope */
declare const sampleRate: number;
