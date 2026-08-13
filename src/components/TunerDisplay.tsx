/**
 * TunerDisplay — shows real-time pitch detection feedback
 * (note name, Hz, cents offset, volume bar).
 *
 * @module components/TunerDisplay
 */

import type { PitchData } from '../types';

interface Props {
  pitch: PitchData | null;
  targetMidi: number;
  toleranceCents: number;
  volumeThreshold?: number;
}

export function TunerDisplay({ pitch, targetMidi, toleranceCents, volumeThreshold = 0.06 }: Props) {
  const frequency = pitch?.frequency ?? 0;
  const cents = pitch?.cents ?? 0;
  const noteName = pitch?.noteName ?? '—';
  const volume = pitch?.volume ?? 0;
  const confidence = pitch?.confidence ?? 0;

  // Determine if note matches target
  const isMatch = pitch?.midiNote === targetMidi && Math.abs(cents) <= toleranceCents && confidence > 0.4 && volume > volumeThreshold;
  const isClose = pitch?.midiNote === targetMidi && confidence > 0.3 && volume > volumeThreshold;

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      {/* Note name */}
      <div className="text-5xl font-bold tracking-wider transition-colors duration-150"
        style={{ color: isMatch ? '#10B981' : isClose ? '#FBBF24' : '#A0A0B0' }}
      >
        {noteName}
      </div>

      {/* Frequency */}
      <div className="text-lg text-gray-400 font-mono">
        {frequency > 0 ? `${frequency.toFixed(1)} Hz` : '— Hz'}
      </div>
      {/* Debug info (remove in production) */}
      <div className="text-[10px] text-gray-600 font-mono">
        MIDI: {pitch?.midiNote ?? '—'} | Conf: {(confidence * 100).toFixed(0)}% | Vol: {(volume * 1000).toFixed(1)}
      </div>
      {/* Cents indicator */}
      <div className="relative w-64 h-6 bg-surface-700 rounded-full overflow-hidden">
        {/* Center mark */}
        <div className="absolute left-1/2 top-0 w-0.5 h-full bg-gray-500 z-10" />
        {/* Cents bar */}
        <div
          className="absolute top-0 h-full rounded-full transition-all duration-100"
          style={{
            width: `${Math.min(Math.abs(cents) / 50, 1) * 50}%`,
            left: cents >= 0 ? '50%' : `${50 - Math.min(Math.abs(cents) / 50, 1) * 50}%`,
            backgroundColor: Math.abs(cents) <= toleranceCents ? '#10B981' : '#F43F5E',
          }}
        />
      </div>
      <div className="text-sm text-gray-500 font-mono">
        {cents > 0 ? '+' : ''}{cents.toFixed(0)} cents
      </div>

      {/* Volume bar */}
      <div className="w-64">
        <div className="text-xs text-gray-500 mb-1">Volume</div>
        <div className="w-full h-2 bg-surface-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${Math.min(volume * 500, 100)}%`,
              backgroundColor: volume > volumeThreshold ? '#00F2FE' : '#333',
            }}
          />
        </div>
      </div>

      {/* Status indicator */}
      <div className="text-xs px-3 py-1 rounded-full font-medium"
        style={{
          backgroundColor: isMatch ? 'rgba(16,185,129,0.15)' : isClose ? 'rgba(251,191,36,0.15)' : 'rgba(160,160,176,0.1)',
          color: isMatch ? '#10B981' : isClose ? '#FBBF24' : '#666',
        }}
      >
        {isMatch ? '✓ Nota correta!' : isClose ? '~ Quase...' : '♫ Aguardando...'}
      </div>
    </div>
  );
}
