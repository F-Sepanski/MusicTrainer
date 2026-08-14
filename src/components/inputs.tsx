/**
 * Musical input helpers for manual mode.
 * Provides a PianoKeyboard, GuitarFretboard, and CircleOfFifths
 * so the user can play the correct note without a microphone.
 *
 * IMPORTANT: These inputs intentionally do NOT highlight the answer.
 * The user must read the staff and find the note themselves (sight-reading).
 * Labels are hidden by default and can be toggled for learning mode.
 *
 * @module components/inputs
 */

import { useState } from 'react';
import { pitchClassToLetter } from '../exercise/curriculum';

export interface NoteInputProps {
  /** Callback with the played MIDI note */
  onNote: (midi: number) => void;
  /** If true, show note-name labels (learning mode). Default false. */
  showLabels?: boolean;
  /** Base octave range */
  range?: { min: number; max: number };
}

/* ── Shared: label toggle header ─────────────────────────── */
function LabelsToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
        show
          ? 'bg-neon-amber/15 border border-neon-amber/50 text-neon-amber'
          : 'bg-surface-700 border border-surface text-secondary hover:border-gray-400'
      }`}
    >
      {show ? 'Nomes visíveis' : 'Mostrar nomes'}
    </button>
  );
}

/* ── Piano Keyboard ───────────────────────────────────────── */
export function PianoKeyboard({ onNote, showLabels = false, range = { min: 48, max: 72 } }: NoteInputProps) {
  const [show, setShow] = useState(showLabels);
  const keys: { midi: number; isBlack: boolean }[] = [];
  for (let m = range.min; m <= range.max; m++) {
    const pc = ((m % 12) + 12) % 12;
    const isBlack = [1, 3, 6, 8, 10].includes(pc);
    keys.push({ midi: m, isBlack });
  }

  return (
    <div className="select-none">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-muted">Teclado</span>
        <LabelsToggle show={show} onToggle={() => setShow(!show)} />
      </div>
      <div className="relative w-full overflow-x-auto pb-2">
        <div className="flex" style={{ minWidth: keys.length * 28 }}>
          {keys.filter((k) => !k.isBlack).map((k) => (
            <button
              key={k.midi}
              onClick={() => onNote(k.midi)}
              className="relative h-28 flex-1 rounded-b-md border transition-all active:scale-y-95 hover:bg-neon-cyan/20"
              style={{
                background: 'var(--piano-white)',
                color: show ? 'var(--piano-key-text)' : 'transparent',
                borderColor: 'var(--fret-line)',
                borderBottomWidth: 4,
              }}
            >
              {show ? pitchClassToLetter(k.midi) : '·'}
            </button>
          ))}
          {keys.filter((k) => k.isBlack).map((k) => (
            <button
              key={k.midi}
              onClick={() => onNote(k.midi)}
              className="absolute top-0 h-16 w-4 rounded-b-md transition-colors hover:bg-gray-500"
              style={{
                left: `${(k.midi - range.min) * 28 + 14}px`,
                zIndex: 2,
                background: 'var(--piano-black)',
              }}
              aria-label="Nota preta"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Guitar Fretboard (grid) ──────────────────────────────── */
const STRING_TUNING: Record<string, number[]> = {
  standard: [40, 45, 50, 55, 59, 64], // E2, A2, D3, G3, B3, E4
  dropd: [38, 45, 50, 55, 59, 64],
};

const STRING_NAMES: Record<string, string[]> = {
  standard: ['E', 'A', 'D', 'G', 'B', 'E'],
  dropd: ['D', 'A', 'D', 'G', 'B', 'E'],
};

export function GuitarFretboard({ onNote, showLabels = false }: NoteInputProps) {
  const [tuning, setTuning] = useState<'standard' | 'dropd'>('standard');
  const [show, setShow] = useState(showLabels);
  const strings = STRING_TUNING[tuning];
  const stringNames = STRING_NAMES[tuning];

  return (
    <div className="select-none">
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setTuning('standard')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              tuning === 'standard'
                ? 'bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan'
                : 'bg-surface-700 border border-surface text-secondary'
            }`}
          >
            Padrão (EADGBE)
          </button>
          <button
            onClick={() => setTuning('dropd')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              tuning === 'dropd'
                ? 'bg-neon-purple/15 border border-neon-purple/50 text-neon-purple'
                : 'bg-surface-700 border border-surface text-secondary'
            }`}
          >
            Drop D
          </button>
        </div>
        <LabelsToggle show={show} onToggle={() => setShow(!show)} />
      </div>

      <div className="rounded-xl border border-surface overflow-x-auto pb-1" style={{ background: 'var(--bg-surface-700)' }}>
        {/* Header: fret numbers */}
        <div className="flex pt-2 pb-1">
          <div className="w-8 shrink-0" />
          <div className="flex-1 relative" style={{ minWidth: 13 * 44 }}>
            {Array.from({ length: 13 }).map((_, fret) => (
              <div key={fret} className="absolute text-[10px] text-muted text-center" style={{ left: fret * 44 + 14, width: 44 }}>
                {fret === 0 ? '' : fret}
              </div>
            ))}
          </div>
        </div>

        {/* Frets */}
        <div className="px-1 pb-2">
          {strings.map((openMidi, si) => (
            <div key={si} className="flex items-center">
              {/* String name */}
              <div className="w-8 shrink-0 text-center font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                {stringNames[si]}
              </div>
              <div className="flex-1 relative" style={{ height: 34 }}>
                {/* String line */}
                <div
                  className="absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                  style={{
                    height: si >= 4 ? 2 : 2 + (3 - si) * 1.5,
                    background: 'var(--text-secondary)',
                    opacity: 0.85,
                  }}
                />
                {/* Fret separators — nut is thicker, others subtle but visible */}
                {Array.from({ length: 14 }).map((_, f) => (
                  <div
                    key={`sep-${f}`}
                    className="absolute top-0 bottom-0 pointer-events-none"
                    style={{ left: f * 44, width: f === 0 ? 3 : 1, background: f === 0 ? 'var(--fret-nut)' : 'var(--fret-line)' }}
                  />
                ))}
                {/* Fret dots */}
                {[3, 5, 7, 9, 12].map((d) => (
                  <div
                    key={`dot-${d}`}
                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none"
                    style={{ left: d * 44 - 5, background: 'var(--fret-dot)' }}
                  />
                ))}
                {/* Note buttons */}
                {Array.from({ length: 13 }).map((_, fret) => {
                  const midi = openMidi + fret;
                  return (
                    <button
                      key={fret}
                      onClick={() => onNote(midi)}
                      className="absolute top-0 bottom-0 transition-colors rounded-sm hover:bg-neon-cyan/20"
                      style={{ left: fret * 44, width: 44 }}
                      title={`${midiToName(midi)} (casa ${fret})`}
                    >
                      {show && (
                        <span
                          className="text-[10px] font-semibold leading-none"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {fret === 0 ? midiToName(midi).replace(/\d/, '') : midiToName(midi)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function midiToName(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${pitchClassToLetter(pc)}${octave}`;
}

/* ── Circle of Fifths ─────────────────────────────────────── */
export function CircleOfFifths({ onNote, showLabels = false }: NoteInputProps) {
  const [show, setShow] = useState(showLabels);
  const notes = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
  const midiBase = [48, 55, 50, 57, 52, 59, 54, 61, 56, 63, 58, 53];

  return (
    <div className="select-none">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-muted">Círculo de Quintas</span>
        <LabelsToggle show={show} onToggle={() => setShow(!show)} />
      </div>
      <div className="relative w-56 h-56 mx-auto">
        {notes.map((name, i) => (
          <button
            key={name}
            onClick={() => onNote(midiBase[i])}
            className={`absolute w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center transition-all -translate-x-1/2 -translate-y-1/2 ${
              show
                ? 'bg-surface-700 text-primary hover:bg-surface-600'
                : 'bg-surface-700 text-transparent hover:bg-surface-600 hover:text-primary'
            }`}
            style={{ left: `${50 + 42 * Math.cos((i / 12) * Math.PI * 2 - Math.PI / 2)}%`, top: `${50 + 42 * Math.sin((i / 12) * Math.PI * 2 - Math.PI / 2)}%` }}
            title={name}
          >
            {show ? name : '·'}
          </button>
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border-2 border-surface-600 flex items-center justify-center text-center text-[10px] text-muted leading-tight">
            Círculo de<br />Quintas
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Instrument-adapted input ─────────────────────────────── */
interface AdaptedInputProps extends NoteInputProps {
  manualType: 'guitar' | 'piano' | 'circle';
}

export function AdaptedInstrumentInput({ manualType, ...rest }: AdaptedInputProps) {
  switch (manualType) {
    case 'guitar':
      return <GuitarFretboard {...rest} />;
    case 'piano':
      return <PianoKeyboard {...rest} />;
    case 'circle':
      return <CircleOfFifths {...rest} />;
  }
}
