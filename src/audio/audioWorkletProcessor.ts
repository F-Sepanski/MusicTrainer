/**
 * AudioWorklet Processor for real-time pitch detection.
 *
 * Implements a YIN-inspired algorithm + RMS volume calculation.
 * Runs in a dedicated audio thread — no DOM access, no imports.
 *
 * @module audioWorkletProcessor
 */

interface ProcessorOptions {
  bufferSize?: number;
  sampleRate?: number;
  a4Frequency?: number;
}

class PitchProcessor extends AudioWorkletProcessor {
  private bufferSize: number;
  private buffer: Float32Array;
  private writeIndex = 0;
  private samplesFilled = 0;
  private r1: Float32Array;
  private r1Index = 0;
  private r1Size = 128;

  // YIN-specific buffers
  private yinBuffer: Float32Array;
  private yinHalf: number;

  // Noise gate
  private noiseGateThreshold = 0.005;
  private noiseCalibrated = false;
  private calibrationBuffer: Float32Array;
  private calibrationIndex = 0;
  private calibrationLength: number;
  private calibrationSum = 0;

  // Stability filter: require N consecutive same-note detections
  private lastDetectedMidi = 0;
  private consecutiveSameNote = 0;
  private readonly STABILITY_THRESHOLD = 2;

  // A4 reference frequency
  private a4Frequency: number;

  constructor(options?: ProcessorOptions) {
    super();
    this.bufferSize = options?.bufferSize ?? 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.yinHalf = Math.floor(this.bufferSize / 2);
    this.yinBuffer = new Float32Array(this.yinHalf);
    this.r1 = new Float32Array(this.r1Size);
    this.a4Frequency = options?.a4Frequency ?? 440;
    this.calibrationLength = (options?.sampleRate ?? 44100) * 1; // 1 second calibration
    this.calibrationBuffer = new Float32Array(this.calibrationLength);
  }

  process(inputs: Float32Array[][], _outputs: Float32Array[][], _params: Record<string, Float32Array>): boolean {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channelData = input[0];
    if (!channelData) return true;

    // 1. Noise gate calibration (first ~1 second)
    if (!this.noiseCalibrated) {
      this.calibrateNoiseGate(channelData);
      return true;
    }

    // 2. Compute instantaneous RMS for this block
    let rms = 0;
    for (let i = 0; i < channelData.length; i++) {
      rms += channelData[i] * channelData[i];
    }
    rms = Math.sqrt(rms / channelData.length);

    // 3. Smoothed RMS (running average)
    const rmsIdx = this.r1Index % this.r1Size;
    this.r1[rmsIdx] = rms * rms;
    this.r1Index++;
    let rmsSmoothed = 0;
    const r1Len = Math.min(this.r1Index, this.r1Size);
    for (let i = 0; i < r1Len; i++) {
      rmsSmoothed += this.r1[i];
    }
    rmsSmoothed = Math.sqrt(rmsSmoothed / r1Len);

    // 4. Copy samples into circular buffer
    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.writeIndex] = channelData[i];
      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
    }
    this.samplesFilled += channelData.length;

    // 5. Noise gate check — if too quiet, report silence
    if (rmsSmoothed < this.noiseGateThreshold) {
      this.lastDetectedMidi = 0;
      this.consecutiveSameNote = 0;
      this.port.postMessage({
        type: 'pitch',
        frequency: 0,
        midiNote: 0,
        noteName: '',
        cents: 0,
        volume: rmsSmoothed,
        confidence: 0,
      });
      return true;
    }

    // 6. Only run pitch detection when buffer has enough data
    if (this.samplesFilled < this.bufferSize) {
      this.port.postMessage({
        type: 'pitch',
        frequency: 0,
        midiNote: 0,
        noteName: '',
        cents: 0,
        volume: rmsSmoothed,
        confidence: 0,
      });
      return true;
    }

    // 7. Run YIN pitch detection
    const result = this.detectPitch();

    // 8. Stability filter: require consecutive same-note detections
    if (result.midiNote > 0 && result.midiNote === this.lastDetectedMidi) {
      this.consecutiveSameNote++;
    } else if (result.midiNote > 0) {
      this.lastDetectedMidi = result.midiNote;
      this.consecutiveSameNote = 1;
    } else {
      this.lastDetectedMidi = 0;
      this.consecutiveSameNote = 0;
    }

    const isStable = this.consecutiveSameNote >= this.STABILITY_THRESHOLD;

    // 9. Post results to main thread
    this.port.postMessage({
      type: 'pitch',
      frequency: isStable ? result.frequency : 0,
      midiNote: isStable ? result.midiNote : 0,
      noteName: isStable ? result.noteName : '',
      cents: isStable ? result.cents : 0,
      volume: rmsSmoothed,
      confidence: isStable ? result.confidence : 0,
    });

    return true;
  }

  private calibrateNoiseGate(samples: Float32Array): void {
    for (let i = 0; i < samples.length; i++) {
      if (this.calibrationIndex < this.calibrationLength) {
        this.calibrationBuffer[this.calibrationIndex] = samples[i] * samples[i];
        this.calibrationSum += samples[i] * samples[i];
        this.calibrationIndex++;
      }
    }

    if (this.calibrationIndex >= this.calibrationLength) {
      const meanSq = this.calibrationSum / this.calibrationLength;
      const rms = Math.sqrt(meanSq);
      // Set threshold to 2.5x the ambient noise RMS, but keep it low
      this.noiseGateThreshold = Math.max(rms * 4, 0.06);
      this.noiseCalibrated = true;
    }
  }

  /**
   * YIN-inspired pitch detection on the circular buffer.
   */
  private detectPitch(): { frequency: number; midiNote: number; noteName: string; cents: number; confidence: number } {
    const sr = globalThis.sampleRate ?? 44100;
    const half = this.yinHalf;

    // Flatten circular buffer into a linear array for analysis
    const buf = new Float32Array(this.bufferSize);
    for (let i = 0; i < this.bufferSize; i++) {
      buf[i] = this.buffer[(this.writeIndex + i) % this.bufferSize];
    }

    // YIN Step 1 & 2: Difference function
    for (let tau = 0; tau < half; tau++) {
      let sum = 0;
      for (let j = 0; j < half; j++) {
        const delta = buf[j] - buf[j + tau];
        sum += delta * delta;
      }
      this.yinBuffer[tau] = sum;
    }

    // YIN Step 3: Cumulative mean normalized difference
    this.yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < half; tau++) {
      runningSum += this.yinBuffer[tau];
      this.yinBuffer[tau] *= tau / runningSum;
    }

    // YIN Step 4: Absolute threshold (τ₀)
    const threshold = 0.10; // Lower threshold = more sensitive detection
    let tauEstimate = -1;
    for (let tau = 1; tau < half; tau++) {
      if (this.yinBuffer[tau] < threshold) {
        // Find the local minimum in the dip
        while (tau + 1 < half && this.yinBuffer[tau + 1] < this.yinBuffer[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
    }

    if (tauEstimate === -1) {
      return { frequency: 0, midiNote: 0, noteName: '', cents: 0, confidence: 0 };
    }

    // Parabolic interpolation for better accuracy
    const betterTau = this.parabolicInterpolation(tauEstimate);

    // Convert lag to frequency
    const frequency = sr / betterTau;

    // Clamp to musical range (65 Hz to 2100 Hz)
    if (frequency < 65 || frequency > 2100) {
      return { frequency: 0, midiNote: 0, noteName: '', cents: 0, confidence: 0 };
    }

    // Confidence based on how deep the YIN dip goes (lower yinBuffer value = better)
    const yinValue = this.yinBuffer[Math.round(tauEstimate)] || 0;
    const confidence = Math.min(1, Math.max(0, 1 - yinValue));

    // Convert to MIDI using configurable A4
    const a4 = this.a4Frequency;
    const midiFloat = 69 + 12 * Math.log2(frequency / a4);
    const midiNote = Math.round(midiFloat);
    const cents = 1200 * Math.log2(frequency / (a4 * Math.pow(2, (midiNote - 69) / 12)));

    const noteName = this.midiToNoteName(midiNote);

    return { frequency, midiNote, noteName, cents, confidence };
  }

  private parabolicInterpolation(tauEstimate: number): number {
    const s0 = this.yinBuffer[tauEstimate - 1] ?? this.yinBuffer[tauEstimate];
    const s1 = this.yinBuffer[tauEstimate];
    const s2 = this.yinBuffer[tauEstimate + 1] ?? this.yinBuffer[tauEstimate];

    return tauEstimate + (s0 - s2) / (2 * (s0 - 2 * s1 + s2));
  }

  private midiToNoteName(midi: number): string {
    const noteNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    const noteIndex = ((midi % 12) + 12) % 12;
    return `${noteNames[noteIndex]}${octave}`;
  }
}

registerProcessor('pitch-processor', PitchProcessor);
