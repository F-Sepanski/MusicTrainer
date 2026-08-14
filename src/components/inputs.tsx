/**
 * Musical input helpers for manual mode.
 * Provides a PianoKeyboard, GuitarFretboard, and CircleOfFifths
 * with ultra-premium design, musical SVG accidentals (♯ and ♭), and Solfège / Letter notation support.
 *
 * @module components/inputs
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  mdiMusicAccidentalSharp,
  mdiMusicAccidentalFlat,
  mdiMusicAccidentalNatural,
} from '@mdi/js';
import { pitchClassToName, type NotationSystem } from '../audio/noteFrequencies';

export interface NoteInputProps {
  /** Callback with the played MIDI note */
  onNote: (midi: number, isPitchClassOnly?: boolean) => void;
  /** If true, show note-name labels (learning mode). Default false. */
  showLabels?: boolean;
  /** Base octave range (default D3=50 to B6=95) */
  range?: { min: number; max: number };
  /** Notation system: letters (C, D, E) or solfege (Dó, Ré, Mi) */
  notation?: NotationSystem;
}

/* ── Standard Musical Accidental SVGs (MDI Canonical with tight bounds) ─ */

export function SharpGlyph({ size = 13, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={Math.round(size * (10 / 13))}
      height={size}
      viewBox="7 5.5 10 13"
      fill="currentColor"
      className={`inline-block shrink-0 ${className}`}
      aria-label="sustenido"
    >
      <path d={mdiMusicAccidentalSharp} />
    </svg>
  );
}

export function FlatGlyph({ size = 13, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={Math.round(size * (7 / 14))}
      height={size}
      viewBox="8.5 5 7 14"
      fill="currentColor"
      className={`inline-block shrink-0 ${className}`}
      aria-label="bemol"
    >
      <path d={mdiMusicAccidentalFlat} />
    </svg>
  );
}

export function NaturalGlyph({ size = 13, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={Math.round(size * (8 / 17))}
      height={size}
      viewBox="8 3.5 8 17"
      fill="currentColor"
      className={`inline-block shrink-0 ${className}`}
      aria-label="bequadro"
    >
      <path d={mdiMusicAccidentalNatural} />
    </svg>
  );
}

/** Formats a note label with accidental on top-right (superscript) and octave on bottom-right (subscript), perfectly aligned and scalable */
export function NoteLabelDisplay({
  name,
  className = '',
  size = 14,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  const isSharp = name.includes('#') || name.includes('♯');
  const isFlat = name.includes('b') || name.includes('♭');
  const hasAccidental = isSharp || isFlat;
  const baseName = name.replace(/[#b♯♭\d]/g, '');
  const octave = name.match(/\d+/)?.[0] || '';
  const hasOctave = Boolean(octave);

  if (!hasAccidental && !hasOctave) {
    return <span className={`inline-block leading-none ${className}`}>{baseName}</span>;
  }

  // Case 1: Both Accidental and Octave (stacked 2-tier suffix)
  if (hasAccidental && hasOctave) {
    return (
      <span className={`inline-flex items-center leading-none ${className}`}>
        <span>{baseName}</span>
        <span className="inline-flex flex-col items-center justify-between ml-[0.08em] h-[1.3em] -translate-y-[0.1em] pointer-events-none select-none">
          <span className="flex items-center justify-center h-[0.6em] -translate-y-[0.05em]">
            {isSharp && <SharpGlyph size={Math.round(size * 0.85)} />}
            {isFlat && <FlatGlyph size={Math.round(size * 0.85)} />}
          </span>
          <span className="text-[0.52em] font-mono font-bold leading-none translate-y-[0.2em] opacity-90 text-center">
            {octave}
          </span>
        </span>
      </span>
    );
  }

  // Case 2: Only Accidental (tight superscript right next to letter)
  if (hasAccidental && !hasOctave) {
    return (
      <span className={`inline-flex items-center leading-none ${className}`}>
        <span>{baseName}</span>
        <span className="inline-flex items-center ml-[0.06em] -translate-y-[0.28em] pointer-events-none select-none">
          {isSharp && <SharpGlyph size={Math.round(size * 0.85)} />}
          {isFlat && <FlatGlyph size={Math.round(size * 0.85)} />}
        </span>
      </span>
    );
  }

  // Case 3: Only Octave (subscript right next to letter)
  return (
    <span className={`inline-flex items-center leading-none ${className}`}>
      <span>{baseName}</span>
      <span className="inline-flex items-center ml-[0.06em] translate-y-[0.22em] text-[0.6em] font-mono font-bold opacity-85 pointer-events-none select-none">
        {octave}
      </span>
    </span>
  );
}

/* ── Shared: label toggle header ─────────────────────────── */
function LabelsToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
        show
          ? 'bg-accent-soft border border-accent-soft text-neon-cyan'
          : 'bg-surface-700 border border-surface text-secondary hover:border-adaptive'
      }`}
    >
      {show ? 'Ocultar nomes' : 'Mostrar nomes'}
    </button>
  );
}

/* ── 1. Piano Keyboard (D3 – B6 with Musical Glyph Labels) ── */
export function PianoKeyboard({
  onNote,
  showLabels = false,
  range = { min: 50, max: 95 },
  notation = 'letters',
}: NoteInputProps) {
  const [show, setShow] = useState(showLabels);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Build chromatic keys from range (D3 to B6 = 27 white keys, 19 black keys)
  const { whiteKeys, blackKeys } = useMemo(() => {
    const whites: { midi: number; pc: number; octave: number; whiteIndex: number }[] = [];
    const blacks: { midi: number; pc: number; octave: number; precedingWhiteIndex: number }[] = [];

    let currentWhiteIndex = 0;
    for (let m = range.min; m <= range.max; m++) {
      const pc = ((m % 12) + 12) % 12;
      const octave = Math.floor(m / 12) - 1;
      const isBlack = [1, 3, 6, 8, 10].includes(pc);

      if (!isBlack) {
        whites.push({ midi: m, pc, octave, whiteIndex: currentWhiteIndex });
        currentWhiteIndex++;
      } else {
        blacks.push({
          midi: m,
          pc,
          octave,
          precedingWhiteIndex: Math.max(0, currentWhiteIndex - 1),
        });
      }
    }
    return { whiteKeys: whites, blackKeys: blacks };
  }, [range.min, range.max]);

  const whiteKeyWidth = 28;
  const blackKeyWidth = 18;
  const totalWidth = whiteKeys.length * whiteKeyWidth;

  // Auto-center on Middle C (C4 = MIDI 60) on mount
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const c4Index = whiteKeys.findIndex((k) => k.midi === 60);
    if (c4Index !== -1) {
      const targetScroll = c4Index * whiteKeyWidth - el.clientWidth / 2 + whiteKeyWidth / 2;
      el.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  }, [whiteKeys]);

  return (
    <div className="select-none">
      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-xs font-semibold text-secondary flex items-center gap-1.5">
          🎹 Teclado (D3 – B6)
        </span>
        <LabelsToggle show={show} onToggle={() => setShow(!show)} />
      </div>

      <div
        ref={scrollContainerRef}
        className="relative w-full overflow-x-auto pb-3 pt-1 flex justify-start sm:justify-center"
      >
        <div
          className="relative rounded-b-xl overflow-hidden shadow-2xl p-1 bg-surface-900 border border-surface-700"
          style={{ width: totalWidth + 8, minWidth: totalWidth + 8 }}
        >
          {/* White keys container */}
          <div className="relative flex">
            {whiteKeys.map((k) => {
              const isC = k.pc === 0;
              const isMiddleC = k.midi === 60;
              const cLabel = notation === 'solfege' ? `Dó${k.octave}` : `C${k.octave}`;
              const noteName = pitchClassToName(k.pc, notation);

              return (
                <button
                  key={k.midi}
                  onClick={() => onNote(k.midi)}
                  className={`relative h-32 flex flex-col justify-between items-center pt-1.5 pb-2 rounded-b-md border-r border-l border-b transition-all active:translate-y-0.5 group cursor-pointer ${
                    isMiddleC ? 'border-neon-cyan/40' : 'border-slate-300'
                  }`}
                  style={{
                    width: whiteKeyWidth,
                    minWidth: whiteKeyWidth,
                    background: isMiddleC
                      ? 'linear-gradient(to bottom, #ffffff 0%, #f0fdfa 85%, #ccfbf1 100%)'
                      : 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 85%, #e2e8f0 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 3px 5px rgba(0,0,0,0.3)',
                  }}
                  title={`${noteName}${k.octave}`}
                >
                  {/* Octave badge on C keys */}
                  {isC ? (
                    <span
                      className={`text-[9px] font-bold px-1 rounded-sm shadow-xs ${
                        isMiddleC
                          ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 font-extrabold'
                          : 'bg-slate-200/80 text-slate-700'
                      }`}
                    >
                      {cLabel}
                    </span>
                  ) : (
                    <div className="h-3" />
                  )}

                  {/* Note label on bottom of key */}
                  {show && (
                    <span className="text-[10px] font-bold text-slate-800 leading-none group-hover:text-neon-cyan transition-colors">
                      <NoteLabelDisplay name={noteName} size={9} />
                    </span>
                  )}
                </button>
              );
            })}

            {/* Black keys overlaid on top */}
            {blackKeys.map((k) => {
              const leftPos = (k.precedingWhiteIndex + 1) * whiteKeyWidth - blackKeyWidth / 2;
              const noteName = pitchClassToName(k.pc, notation, true);

              return (
                <button
                  key={k.midi}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNote(k.midi);
                  }}
                  className="absolute top-0 h-20 rounded-b-md transition-all active:translate-y-0.5 z-20 flex flex-col justify-end items-center pb-1 group cursor-pointer"
                  style={{
                    left: leftPos,
                    width: blackKeyWidth,
                    background: 'linear-gradient(to bottom, #1e293b 0%, #0f172a 75%, #020617 100%)',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.7), inset 0 -1.5px 2px rgba(255,255,255,0.15)',
                    border: '1px solid #334155',
                    borderTop: 'none',
                  }}
                  title={`${noteName}${k.octave}`}
                >
                  {show && (
                    <span className="text-[8px] font-bold text-slate-300 leading-none group-hover:text-neon-cyan transition-colors">
                      <NoteLabelDisplay name={noteName} size={8} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 2. Guitar Fretboard (Ultra-Premium Rosewood & Inlay Details up to 20 Frets) ── */
const GUITAR_STRINGS = [40, 45, 50, 55, 59, 64]; // E2, A2, D3, G3, B3, E4 (Standard Tuning)
const GUITAR_STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'E'];

export function GuitarFretboard({
  onNote,
  showLabels = false,
  notation = 'letters',
}: NoteInputProps) {
  const [show, setShow] = useState(showLabels);
  const FRET_WIDTH = 46;
  const TOTAL_FRETS = 20; // 0 (solta) to 20 frets

  return (
    <div className="select-none">
      <div className="flex justify-between items-center mb-2.5 flex-wrap gap-2 px-1">
        <span className="text-xs font-semibold text-secondary flex items-center gap-1.5">
          🎸 Violão (20 Casas)
        </span>
        <LabelsToggle show={show} onToggle={() => setShow(!show)} />
      </div>

      {/* Fretboard Container */}
      <div
        className="rounded-2xl border border-surface-700 overflow-x-auto shadow-2xl p-2"
        style={{
          background: 'linear-gradient(180deg, #1c1917 0%, #171412 50%, #12100e 100%)',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)',
        }}
      >
        {/* Fret Numbers Header */}
        <div className="flex pt-1 pb-1.5">
          <div className="w-10 shrink-0 text-center text-[10px] font-bold text-muted">Corda</div>
          <div className="flex-1 relative" style={{ minWidth: (TOTAL_FRETS + 1) * FRET_WIDTH }}>
            {Array.from({ length: TOTAL_FRETS + 1 }).map((_, fret) => (
              <div
                key={fret}
                className="absolute text-[10px] font-mono font-semibold text-muted text-center"
                style={{ left: fret * FRET_WIDTH, width: FRET_WIDTH }}
              >
                {fret === 0 ? 'Solta' : fret}
              </div>
            ))}
          </div>
        </div>

        {/* Fretboard Strings and Frets */}
        <div className="relative px-1 pb-1" style={{ minWidth: (TOTAL_FRETS + 1) * FRET_WIDTH + 40 }}>
          {/* Mother-of-pearl Inlays Layer (Centered between D and G strings) */}
          <div className="absolute inset-y-0 left-10 right-0 pointer-events-none z-0">
            {/* Single dots on frets 3, 5, 7, 9, 15, 17, 19 (Centered at 50% height, between D and G) */}
            {[3, 5, 7, 9, 15, 17, 19].map((d) => (
              <div
                key={`dot-${d}`}
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: d * FRET_WIDTH + FRET_WIDTH / 2 - 4.5,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 9,
                  height: 9,
                  background: 'radial-gradient(circle, #f8fafc 20%, #cbd5e1 60%, #94a3b8 100%)',
                  boxShadow: '0 0 6px rgba(255,255,255,0.4)',
                }}
              />
            ))}
            {/* Double dot on 12th fret (Symmetric around center) */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                left: 12 * FRET_WIDTH + FRET_WIDTH / 2 - 4,
                top: '33.3%',
                transform: 'translateY(-50%)',
                width: 8,
                height: 8,
                background: 'radial-gradient(circle, #f8fafc 20%, #cbd5e1 60%, #94a3b8 100%)',
                boxShadow: '0 0 6px rgba(255,255,255,0.4)',
              }}
            />
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                left: 12 * FRET_WIDTH + FRET_WIDTH / 2 - 4,
                top: '66.7%',
                transform: 'translateY(-50%)',
                width: 8,
                height: 8,
                background: 'radial-gradient(circle, #f8fafc 20%, #cbd5e1 60%, #94a3b8 100%)',
                boxShadow: '0 0 6px rgba(255,255,255,0.4)',
              }}
            />
          </div>

          {GUITAR_STRINGS.map((openMidi, si) => (
            <div key={si} className="flex items-center group relative z-10">
              {/* String label on left */}
              <div
                className="w-10 shrink-0 text-center font-mono text-xs font-bold"
                style={{ color: 'var(--text-secondary)' }}
              >
                {GUITAR_STRING_NAMES[si]}
              </div>

              {/* Fret row */}
              <div className="flex-1 relative" style={{ height: 34 }}>
                {/* String wire */}
                <div
                  className="absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-full pointer-events-none z-0"
                  style={{
                    height: si === 0 ? 3.5 : si === 1 ? 3 : si === 2 ? 2.5 : si === 3 ? 2 : si === 4 ? 1.6 : 1.2,
                    background:
                      si <= 2
                        ? 'linear-gradient(180deg, #d97706 0%, #b45309 50%, #78350f 100%)' // wound bronze
                        : 'linear-gradient(180deg, #e2e8f0 0%, #94a3b8 50%, #64748b 100%)', // plain steel
                    boxShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    opacity: 0.95,
                  }}
                />

                {/* Metallic Fret Separators */}
                {Array.from({ length: TOTAL_FRETS + 2 }).map((_, f) => (
                  <div
                    key={`fret-${f}`}
                    className="absolute top-0 bottom-0 pointer-events-none z-0"
                    style={{
                      left: f * FRET_WIDTH,
                      width: f === 0 ? 4 : 2,
                      background:
                        f === 0
                          ? 'linear-gradient(180deg, #fef08a 0%, #ca8a04 100%)' // Bone nut
                          : 'linear-gradient(180deg, #cbd5e1 0%, #64748b 50%, #334155 100%)', // Nickel fret wire
                      boxShadow: f === 0 ? '0 0 4px rgba(234, 179, 8, 0.4)' : '1px 0 2px rgba(0,0,0,0.5)',
                    }}
                  />
                ))}

                {/* Interactive Note Buttons */}
                {Array.from({ length: TOTAL_FRETS + 1 }).map((_, fret) => {
                  const midi = openMidi + fret;
                  const pc = ((midi % 12) + 12) % 12;
                  const octave = Math.floor(midi / 12) - 1;
                  const baseName = pitchClassToName(pc, notation);
                  const fullName = `${baseName}${octave}`;

                  return (
                    <button
                      key={fret}
                      onClick={() => onNote(midi)}
                      className="absolute top-0 bottom-0 transition-all rounded-md flex items-center justify-center hover:bg-neon-cyan/15 hover:border hover:border-neon-cyan/40 active:scale-95 group/btn cursor-pointer z-10"
                      style={{ left: fret * FRET_WIDTH, width: FRET_WIDTH }}
                      title={`${fullName} (Casa ${fret})`}
                    >
                      {show && (
                        <span
                          className="px-1.5 py-0.5 rounded-md text-[10px] font-bold leading-none bg-surface-900 border-2 border-surface-600 shadow-md group-hover/btn:border-neon-cyan group-hover/btn:text-neon-cyan group-hover/btn:scale-105 transition-all text-primary"
                        >
                          <NoteLabelDisplay name={fullName} size={10} />
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

/* ── 3. Circle of Fifths (Outer Ring = Naturals, Inner Ring = Accidentals with SVGs) ── */
export function CircleOfFifths({
  onNote,
  showLabels = false,
  notation = 'letters',
}: NoteInputProps) {
  const [show, setShow] = useState(showLabels);

  // Outer Ring: 7 Natural Notes (C, D, E, F, G, A, B) with natural spacing
  const outerNaturals = useMemo(
    () => [
      { pc: 0, angleDeg: 0 },   // C / Dó (12:00)
      { pc: 2, angleDeg: 60 },  // D / Ré (2:00)
      { pc: 4, angleDeg: 120 }, // E / Mi (4:00)
      { pc: 5, angleDeg: 150 }, // F / Fá (5:00)
      { pc: 7, angleDeg: 210 }, // G / Sol (7:00)
      { pc: 9, angleDeg: 270 }, // A / Lá (9:00)
      { pc: 11, angleDeg: 330 },// B / Si (11:00)
    ],
    []
  );

  // Inner Ring: 5 Accidental Notes positioned EXACTLY between their neighbor naturals
  const innerAccidentals = useMemo(
    () => [
      { pc: 1, angleDeg: 30 },  // C#/Db / Dó# (1:00 - between Dó and Ré)
      { pc: 3, angleDeg: 90 },  // D#/Eb / Ré# (3:00 - between Ré and Mi)
      { pc: 6, angleDeg: 180 }, // F#/Gb / Fá# (6:00 - between Fá and Sol)
      { pc: 8, angleDeg: 240 }, // G#/Ab / Sol# (8:00 - between Sol and Lá)
      { pc: 10, angleDeg: 300 },// A#/Bb / Lá# (10:00 - between Lá and Si)
    ],
    []
  );

  return (
    <div className="select-none">
      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-xs font-semibold text-secondary flex items-center gap-1.5">
          ⭕ Círculo de Notas
        </span>
        <LabelsToggle show={show} onToggle={() => setShow(!show)} />
      </div>

      <div className="relative w-72 h-72 mx-auto flex items-center justify-center">
        {/* Outer Ring guide circle */}
        <div className="absolute inset-2 rounded-full border border-surface-700/60 pointer-events-none bg-surface-900/40" />

        {/* Inner Ring guide circle */}
        <div className="absolute inset-14 rounded-full border border-neon-purple/20 pointer-events-none bg-surface-800/60" />

        {/* Center core */}
        <div className="absolute w-20 h-20 rounded-full border border-surface-600 flex flex-col items-center justify-center text-center leading-tight bg-surface-900 shadow-xl pointer-events-none z-10">
          <span className="text-[10px] font-bold text-neon-cyan">Círculo</span>
          <span className="text-[9px] text-muted">de Notas</span>
        </div>

        {/* ── Outer Ring: Natural Notes (C, D, E, F, G, A, B) ── */}
        {outerNaturals.map((item) => {
          const rad = ((item.angleDeg - 90) * Math.PI) / 180;
          const radius = 108; // pixels from center
          const cx = 144 + radius * Math.cos(rad);
          const cy = 144 + radius * Math.sin(rad);
          const displayName = pitchClassToName(item.pc, notation);

          return (
            <button
              key={`outer-${item.pc}`}
              onClick={() => onNote(60 + item.pc, true)}
              className={`absolute w-12 h-12 rounded-full font-bold flex items-center justify-center transition-all -translate-x-1/2 -translate-y-1/2 hover:scale-110 active:scale-95 cursor-pointer shadow-lg z-20 ${
                show
                  ? 'bg-surface-800 border-2 border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/20 hover:border-neon-cyan'
                  : 'bg-surface-800 border border-surface-600 text-transparent hover:text-primary hover:border-neon-cyan/60'
              }`}
              style={{ left: cx, top: cy }}
              title={displayName}
            >
              <span className="text-xs font-bold">
                {show ? <NoteLabelDisplay name={displayName} size={11} /> : '·'}
              </span>
            </button>
          );
        })}

        {/* ── Inner Ring: Accidental Notes (C#, D#, F#, G#, A#) centered between naturals ── */}
        {innerAccidentals.map((item) => {
          const rad = ((item.angleDeg - 90) * Math.PI) / 180;
          const radius = 64; // pixels from center
          const cx = 144 + radius * Math.cos(rad);
          const cy = 144 + radius * Math.sin(rad);
          const displayName = pitchClassToName(item.pc, notation, true);

          return (
            <button
              key={`inner-${item.pc}`}
              onClick={() => onNote(60 + item.pc, true)}
              className={`absolute w-9 h-9 rounded-full font-bold flex items-center justify-center transition-all -translate-x-1/2 -translate-y-1/2 hover:scale-115 active:scale-95 cursor-pointer shadow-md z-30 ${
                show
                  ? 'bg-surface-800 border-2 border-neon-purple/60 text-neon-purple hover:bg-neon-purple/20 hover:border-neon-purple'
                  : 'bg-surface-800 border border-purple-900/50 text-transparent hover:text-neon-purple'
              }`}
              style={{ left: cx, top: cy }}
              title={displayName}
            >
              <span className="text-[10px] font-bold">
                {show ? <NoteLabelDisplay name={displayName} size={9} /> : '·'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="text-center text-xs text-muted mt-1">
        {show
          ? 'Anel externo: Naturais · Anel interno: Acidentes (♯/♭)'
          : 'Clique na nota (o Círculo aceita qualquer oitava)'}
      </div>
    </div>
  );
}

/* ── Instrument-adapted input wrapper ─────────────────────── */
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
