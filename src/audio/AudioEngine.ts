/**
 * AudioEngine — manages microphone input, AudioWorklet processing,
 * and emits pitch data events to the main thread.
 *
 * @module audio/AudioEngine
 */

import type { PitchData } from '../types';

export type PitchCallback = (data: PitchData) => void;

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  private callbacks: PitchCallback[] = [];
  private _isRunning = false;

  get isRunning(): boolean {
    return this._isRunning;
  }

  get sampleRate(): number {
    return this.audioContext?.sampleRate ?? 44100;
  }

  /** Register a callback that fires on every pitch detection frame. */
  onPitch(callback: PitchCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  /** Start microphone capture and pitch processing. */
  async start(a4Frequency?: number): Promise<void> {
    if (this._isRunning) return;

    try {
      // 1. Create AudioContext
      this.audioContext = new AudioContext({ sampleRate: 44100 });

      // 2. Resume if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // 3. Register AudioWorklet processor.
      // Uses `new URL(..., import.meta.url)` so Vite emits the module as an
      // asset in production builds (and resolves correctly in dev too).
      const workletUrl = new URL('./audioWorkletProcessor.ts', import.meta.url);
      await this.audioContext.audioWorklet.addModule(workletUrl);

      // 4. Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 44100,
        },
      });

      // 5. Create nodes
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'pitch-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 0,
        processorOptions: {
          bufferSize: 2048,
          sampleRate: 44100,
          a4Frequency: a4Frequency ?? 440,
        },
      });

      // 6. Listen for messages from the worklet
      this.workletNode.port.onmessage = (event: MessageEvent) => {
        const msg = event.data;
        if (msg.type === 'pitch') {
          const pitchData: PitchData = {
            frequency: msg.frequency,
            midiNote: msg.midiNote,
            noteName: msg.noteName,
            cents: msg.cents,
            volume: msg.volume,
            confidence: msg.confidence,
          };
          for (const cb of this.callbacks) {
            cb(pitchData);
          }
        }
      };

    // 7. Connect: mic → worklet
    this.sourceNode.connect(this.workletNode);

    this._isRunning = true;
    } catch (error) {
      console.error('Failed to start audio engine:', error);
      this.stop();
      throw error;
    }
  }

  /** Stop microphone capture and release resources. */
  stop(): void {
    if (!this._isRunning) return;

    // Disconnect nodes
    this.sourceNode?.disconnect();
    this.workletNode?.disconnect();

    // Stop media tracks
    this.stream?.getTracks().forEach((t) => t.stop());

    // Close audio context
    this.audioContext?.close();

    this.sourceNode = null;
    this.workletNode = null;
    this.stream = null;
    this.audioContext = null;
    this._isRunning = false;
  }
}

/** Singleton instance */
export const audioEngine = new AudioEngine();
