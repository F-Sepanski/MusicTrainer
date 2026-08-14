/**
 * SheetMusicDisplay — VexFlow-based sight-reading staff.
 *
 * Unified single-stave architecture:
 *  - Both the clef/key signature and the notes share the exact same staff lines and container.
 *  - Notes start rendering further to the right (target centered around 35-40% width).
 *  - Dynamic note X-offset extraction ensures 0px drift across all answered notes.
 *  - Target reading position features a perfectly aligned 10% accent glow background.
 *  - Ultra-smooth spring-like fluid scrolling transition.
 *  - Correct notes turn dynamic theme success color (green).
 *  - Incorrect notes turn dynamic theme error color (red) with bold note name annotation.
 *  - Answered notes sliding left towards the clef smoothly fade out before reaching it.
 *  - A steady stream of upcoming notes enters from the right.
 *
 * @module components/SheetMusicDisplay
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Stave, StaveNote, Voice, Formatter, Renderer, Accidental, Annotation, GhostNote, KeySignature } from 'vexflow';
import { midiToNoteName, type NotationSystem } from '../audio/noteFrequencies';
import { fifthsToAccidentals, getKeyDisplayName } from '../exercise/curriculum';
import type { ExerciseNote } from '../types';

interface Props {
  notes: ExerciseNote[];
  clef: 'treble' | 'bass' | 'grand';
  activeIndex?: number;
  width?: number;
  height?: number;
  theme?: 'dark' | 'light';
  keyFifths?: number;
  notation?: NotationSystem;
  octaveShift?: number;
}

const NOTE_SPACING = 105;

export function SheetMusicDisplay({
  notes,
  clef,
  activeIndex: propActiveIndex,
  height = 200,
  theme = 'dark',
  keyFifths = 0,
  notation = 'letters',
  octaveShift = 0,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const notesContainerRef = useRef<HTMLDivElement>(null);

  const [containerWidth, setContainerWidth] = useState<number>(900);
  const [noteOffsets, setNoteOffsets] = useState<number[]>([]);
  const [keyFadeOpacity, setKeyFadeOpacity] = useState<number>(1);

  // Track root width responsively
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const updateWidth = () => {
      const w = el.clientWidth;
      if (w > 0) setContainerWidth(w);
    };

    updateWidth();

    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute active index
  const activeIndex = useMemo(() => {
    if (typeof propActiveIndex === 'number' && propActiveIndex >= 0) {
      return Math.min(propActiveIndex, Math.max(0, notes.length - 1));
    }
    const explicitIdx = notes.findIndex((n) => n.status === 'active');
    if (explicitIdx !== -1) return explicitIdx;
    const pendingIdx = notes.findIndex((n) => n.status === 'pending');
    if (pendingIdx !== -1) return pendingIdx;
    return Math.max(0, notes.length - 1);
  }, [notes, propActiveIndex]);

  // Current key signature active at the current reading position
  const currentKeyFifths = useMemo(() => {
    const activeNote = notes[activeIndex];
    if (activeNote && typeof activeNote.keyFifths === 'number') {
      return activeNote.keyFifths;
    }
    return keyFifths ?? 0;
  }, [notes, activeIndex, keyFifths]);

  // Trigger smooth crossfade when key signature changes at the clef
  const prevKeyFifthsRef = useRef(currentKeyFifths);
  useEffect(() => {
    if (prevKeyFifthsRef.current !== currentKeyFifths) {
      prevKeyFifthsRef.current = currentKeyFifths;
      setKeyFadeOpacity(0.25);
      const t = setTimeout(() => {
        setKeyFadeOpacity(1);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [currentKeyFifths]);

  // Calculate key signature transition points across the exercise
  const keyChanges = useMemo(() => {
    const changes: { index: number; keyFifths: number }[] = [];
    for (let i = 1; i < notes.length; i++) {
      const prevKey: number = typeof notes[i - 1].keyFifths === 'number' ? (notes[i - 1].keyFifths as number) : (keyFifths ?? 0);
      const currKey: number = typeof notes[i].keyFifths === 'number' ? (notes[i].keyFifths as number) : (keyFifths ?? 0);
      if (notes[i].isKeyChange || currKey !== prevKey) {
        changes.push({ index: i, keyFifths: currKey });
      }
    }
    return changes;
  }, [notes, keyFifths]);

  // Width of clef + key signature area on the left
  const clefWidth = useMemo(() => {
    const maxFifths = Math.max(Math.abs(keyFifths), Math.abs(currentKeyFifths), 1);
    return Math.max(90, 70 + maxFifths * 15);
  }, [keyFifths, currentKeyFifths]);

  // Target position for the active note: centered around 35-38% of container width
  const targetX = useMemo(() => {
    return Math.max(clefWidth + 110, Math.round(containerWidth * 0.36));
  }, [clefWidth, containerWidth]);

  // Staff vertical positioning (stave center = staveY + 60, height / 2 = centered)
  const isGrand = clef === 'grand';
  const staveY = useMemo(() => {
    return Math.round(height / 2 - 60);
  }, [height]);

  // For grand staff: treble stave above center, bass stave below.
  const trebleStaveY = isGrand ? Math.round(height / 2 - 60 - 40) : staveY;
  const bassStaveY = isGrand ? Math.round(height / 2 - 60 + 40) : staveY;

  // Middle line of the 5 staff lines (Line 2) is at staveY + 60 = height / 2
  const staffCenterY = useMemo(() => {
    return staveY + 60;
  }, [staveY]);

  const totalNotesWidth = useMemo(() => {
    return Math.max(containerWidth + 400, targetX + notes.length * (NOTE_SPACING + 15) + 300);
  }, [containerWidth, targetX, notes.length]);

  /* ── 1. Render Background Stave with Clef + Key Sig + Continuous Staff Lines ── */
  const renderBackground = useCallback(() => {
    const bgEl = bgRef.current;
    if (!bgEl || containerWidth <= 0) return;
    bgEl.innerHTML = '';

    const staffLineColor = getCssVar('--staff-line', theme === 'dark' ? '#9aa0aa' : '#4b5563');
    const symbolColor = getCssVar('--text-primary', theme === 'dark' ? '#f1f5f9' : '#0f172a');

    const bgR = new Renderer(bgEl, Renderer.Backends.SVG);
    bgR.resize(containerWidth, height);
    const bgCtx = bgR.getContext();

    // Single unified stave from left (x=10) across the entire width
    if (clef === 'grand') {
      // Grand staff: treble stave on top, bass stave below.
      const trebleStave = new Stave(10, trebleStaveY, Math.max(100, containerWidth - 20));
      trebleStave.addClef('treble');
      if (currentKeyFifths !== 0) trebleStave.addKeySignature(fifthsToKeySpec(currentKeyFifths));
      trebleStave.setContext(bgCtx).draw();

      const bassStave = new Stave(10, bassStaveY, Math.max(100, containerWidth - 20));
      bassStave.addClef('bass');
      if (currentKeyFifths !== 0) bassStave.addKeySignature(fifthsToKeySpec(currentKeyFifths));
      bassStave.setContext(bgCtx).draw();
    } else {
      const stave = new Stave(10, staveY, Math.max(100, containerWidth - 20));
      if (octaveShift === -1 || octaveShift === -2) {
        stave.addClef(clef, 'default', '8vb');
      } else if (octaveShift === 1 || octaveShift === 2) {
        stave.addClef(clef, 'default', '8va');
      } else {
        stave.addClef(clef);
      }
      if (currentKeyFifths !== 0) {
        stave.addKeySignature(fifthsToKeySpec(currentKeyFifths));
      }
      stave.setContext(bgCtx).draw();
    }

    normalizeSvg(bgEl);
    applyStaffTheme(bgEl, staffLineColor, symbolColor);
  }, [clef, currentKeyFifths, containerWidth, height, staveY, theme, octaveShift, trebleStaveY, bassStaveY]);

  /* ── 2. Render Notes on Shared Coordinate System with In-Staff Key Changes ─── */
  const renderNotes = useCallback(() => {
    const notesEl = notesContainerRef.current;
    if (!notesEl || notes.length === 0) return;
    notesEl.innerHTML = '';

    const defaultNoteColor = getCssVar('--note-default', theme === 'dark' ? '#cbd5e1' : '#475569');
    const staffLineColor = getCssVar('--staff-line', theme === 'dark' ? '#9aa0aa' : '#4b5563');
    const symbolColor = getCssVar('--text-primary', theme === 'dark' ? '#f1f5f9' : '#0f172a');
    const statusColors = getStatusColors();

    const notesR = new Renderer(notesEl, Renderer.Backends.SVG);
    notesR.resize(totalNotesWidth, height);
    const notesCtx = notesR.getContext();

    const createStaveNote = (note: ExerciseNote, noteClef: 'treble' | 'bass', index: number) => {
      const sn = new StaveNote({
        clef: noteClef,
        keys: [note.vfKey],
        duration: 'q',
      });

      const noteKeyFifths = typeof note.keyFifths === 'number' ? note.keyFifths : currentKeyFifths;
      const keyAccidentals = fifthsToAccidentals(noteKeyFifths);

      const keyPart = note.vfKey.split('/')[0] || '';
      const noteLetter = (keyPart[0] || '').toUpperCase();
      const acc = keyPart.slice(1);

      // Determine if this accidental is ALREADY part of the note's active key signature
      const isKeySharp = noteKeyFifths > 0 && acc === '#' && keyAccidentals.includes(noteLetter);
      const isKeyFlat = noteKeyFifths < 0 && acc === 'b' && keyAccidentals.includes(noteLetter);
      const isCoveredByKeySignature = isKeySharp || isKeyFlat;

      // OMIT visual accidental modifier if the accidental is covered by the key signature!
      if (acc && !isCoveredByKeySignature) {
        sn.addModifier(new Accidental(acc), 0);
      }

      const isCurrent = index === activeIndex;
      let color = defaultNoteColor;
      if (note.status === 'correct') {
        color = statusColors.success;
      } else if (note.status === 'incorrect') {
        color = statusColors.error;
        const isSharp = acc === '#' || (noteKeyFifths > 0 && keyAccidentals.includes(noteLetter));
        const noteLabel = midiToNoteName(note.midiNote, notation, isSharp);
        const ann = new Annotation(noteLabel);
        ann.setVerticalJustification(Annotation.VerticalJustify.BOTTOM);
        ann.setFont({ family: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif', size: 12, weight: 'bold' });
        ann.setStyle({ fillStyle: statusColors.error, strokeStyle: statusColors.error });
        sn.addModifier(ann, 0);
      } else if (isCurrent) {
        color = statusColors.active;
      }

      const noteStyle = { fillStyle: color, strokeStyle: color };
      sn.setStyle(noteStyle);
      sn.setKeyStyle(0, noteStyle);
      sn.setStemStyle(noteStyle);
      sn.setFlagStyle(noteStyle);
      sn.setLedgerLineStyle({ strokeStyle: staffLineColor, fillStyle: staffLineColor });

      return sn;
    };

    // Group notes into contiguous key signature sections
    interface NoteSection {
      startIndex: number;
      notes: ExerciseNote[];
      keyFifths: number;
      isInitial: boolean;
    }

    const sections: NoteSection[] = [];
    let curSec: NoteSection | null = null;

    notes.forEach((note, idx) => {
      const noteKey = typeof note.keyFifths === 'number' ? note.keyFifths : (keyFifths ?? 0);
      const isTransition = idx > 0 && (note.isKeyChange || (notes[idx - 1] && noteKey !== (notes[idx - 1].keyFifths ?? keyFifths ?? 0)));
      if (!curSec || isTransition) {
        curSec = {
          startIndex: idx,
          notes: [note],
          keyFifths: noteKey,
          isInitial: idx === 0,
        };
        sections.push(curSec);
      } else {
        curSec.notes.push(note);
      }
    });

    const offsets: number[] = new Array(notes.length);
    let currentStartX = targetX;

    if (clef === 'grand') {
      sections.forEach((sec) => {
        const accCount = Math.abs(sec.keyFifths);
        const keySigPadding = !sec.isInitial && sec.keyFifths !== 0 ? Math.max(35, accCount * 14 + 30) : (!sec.isInitial ? 20 : 0);
        const secWidth = Math.max(90, sec.notes.length * NOTE_SPACING + keySigPadding);

        const trebleStave = new Stave(currentStartX, trebleStaveY, secWidth);
        const bassStave = new Stave(currentStartX, bassStaveY, secWidth);
        trebleStave.setContext(notesCtx);
        bassStave.setContext(notesCtx);

        if (!sec.isInitial) {
          trebleStave.setBegBarType(1); // Double Barline
          bassStave.setBegBarType(1);
          if (sec.keyFifths !== 0) {
            trebleStave.addKeySignature(fifthsToKeySpec(sec.keyFifths));
            bassStave.addKeySignature(fifthsToKeySpec(sec.keyFifths));
          }
        }

        trebleStave.draw();
        bassStave.draw();

        const trebleTickables: (StaveNote | GhostNote)[] = [];
        const bassTickables: (StaveNote | GhostNote)[] = [];

        sec.notes.forEach((note, i) => {
          const globalIdx = sec.startIndex + i;
          const noteClef = note.clef ?? (note.midiNote >= 60 ? 'treble' : 'bass');
          if (noteClef === 'treble') {
            trebleTickables.push(createStaveNote(note, 'treble', globalIdx));
            bassTickables.push(new GhostNote({ duration: 'q' }));
          } else {
            trebleTickables.push(new GhostNote({ duration: 'q' }));
            bassTickables.push(createStaveNote(note, 'bass', globalIdx));
          }
        });

        const trebleVoice = new Voice({ numBeats: sec.notes.length, beatValue: 4 }).setStrict(false);
        trebleVoice.addTickables(trebleTickables);

        const bassVoice = new Voice({ numBeats: sec.notes.length, beatValue: 4 }).setStrict(false);
        bassVoice.addTickables(bassTickables);

        new Formatter()
          .joinVoices([trebleVoice])
          .joinVoices([bassVoice])
          .formatToStave([trebleVoice, bassVoice], trebleStave);

        trebleVoice.draw(notesCtx, trebleStave);
        bassVoice.draw(notesCtx, bassStave);

        sec.notes.forEach((note, i) => {
          const globalIdx = sec.startIndex + i;
          const noteClef = note.clef ?? (note.midiNote >= 60 ? 'treble' : 'bass');
          const tickable = noteClef === 'treble' ? trebleTickables[i] : bassTickables[i];
          offsets[globalIdx] = tickable.getAbsoluteX();
        });

        currentStartX += secWidth;
      });
    } else {
      sections.forEach((sec) => {
        const accCount = Math.abs(sec.keyFifths);
        const keySigPadding = !sec.isInitial && sec.keyFifths !== 0 ? Math.max(35, accCount * 14 + 30) : (!sec.isInitial ? 20 : 0);
        const secWidth = Math.max(90, sec.notes.length * NOTE_SPACING + keySigPadding);

        const stave = new Stave(currentStartX, staveY, secWidth);
        stave.setContext(notesCtx);

        if (!sec.isInitial) {
          stave.setBegBarType(1); // Double Barline
          if (sec.keyFifths !== 0) {
            stave.addKeySignature(fifthsToKeySpec(sec.keyFifths));
          }
        }

        stave.draw();

        const sns = sec.notes.map((n, i) => createStaveNote(n, clef, sec.startIndex + i));
        const voice = new Voice({ numBeats: sec.notes.length, beatValue: 4 }).setStrict(false);
        voice.addTickables(sns);

        new Formatter().joinVoices([voice]).formatToStave([voice], stave);
        voice.draw(notesCtx, stave);

        sec.notes.forEach((_, i) => {
          const globalIdx = sec.startIndex + i;
          offsets[globalIdx] = sns[i].getAbsoluteX();
        });

        currentStartX += secWidth;
      });
    }

    normalizeSvg(notesEl);

    // Apply uniform theme coloring to staves, double barlines, key signatures, and full note stems/noteheads
    applySheetColors(notesEl, notes, activeIndex, staffLineColor, symbolColor, defaultNoteColor, statusColors);

    // Extract exact rendered X positions of all notes to ensure zero drift
    setNoteOffsets(offsets);
  }, [notes, clef, activeIndex, currentKeyFifths, targetX, totalNotesWidth, height, staveY, theme, notation, trebleStaveY, bassStaveY]);

  useEffect(() => {
    renderBackground();
  }, [renderBackground]);

  useEffect(() => {
    renderNotes();
  }, [renderNotes]);

  // Exact translation offset: maps active note directly to target slot with 0px drift
  const translateX = useMemo(() => {
    if (noteOffsets.length === 0) return 0;
    const baseX = noteOffsets[0] ?? targetX;
    const currentX = noteOffsets[activeIndex] ?? (baseX + activeIndex * NOTE_SPACING);
    return -(currentX - baseX);
  }, [noteOffsets, activeIndex, targetX]);

  // Fade parameters: notes start fading out before reaching the clef
  const fadeStart = clefWidth + 10;
  const fadeEnd = clefWidth + 80;

  // Accent box dimensions and positioning: centered on notehead center
  const accentWidth = 48;
  const accentHeight = 104;
  const targetNoteCenterX = (noteOffsets[0] ?? (targetX + 17)) + 7;
  const accentLeft = targetNoteCenterX - accentWidth / 2;
  const accentTop = staffCenterY - accentHeight / 2;

  const accentColor = getCssVar('--neon-cyan', getCssVar('--accent', '#38bdf8'));

  // Calculate divider position between notes for key signature changes
  const getDividerX = (changeIndex: number) => {
    if (noteOffsets[changeIndex] !== undefined && noteOffsets[changeIndex - 1] !== undefined) {
      return (noteOffsets[changeIndex - 1] + noteOffsets[changeIndex]) / 2;
    }
    const baseX = noteOffsets[0] ?? targetX;
    return baseX + (changeIndex - 0.5) * NOTE_SPACING;
  };

  return (
    <div
      ref={rootRef}
      className="relative w-full overflow-hidden select-none"
      style={{ height }}
      role="region"
      aria-label="Partitura"
    >
      {/* Background container fill */}
      <div className="absolute inset-0 bg-surface-800 rounded-xl" />

      {/* ── Layer 1: Unified Full-Width Stave (Clef + Key Signature + Continuous Staff Lines) ── */}
      <div
        ref={bgRef}
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 ease-out"
        style={{ height, opacity: keyFadeOpacity }}
      />

      {/* ── Layer 1.5: Target Note Background Accent (10% subtle highlight behind active note) ── */}
      <div
        className="absolute pointer-events-none transition-all duration-300"
        style={{
          left: accentLeft,
          top: accentTop,
          width: accentWidth,
          height: accentHeight,
          borderRadius: 14,
          backgroundColor: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
          border: `1px solid color-mix(in srgb, ${accentColor} 22%, transparent)`,
          boxShadow: `0 0 24px color-mix(in srgb, ${accentColor} 10%, transparent)`,
        }}
      />

      {/* ── Layer 2: Notes Layer with Fading Mask near Clef and on Right Edge ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          height,
          maskImage: `linear-gradient(to right, transparent 0px, transparent ${fadeStart}px, black ${fadeEnd}px, black calc(100% - 60px), transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to right, transparent 0px, transparent ${fadeStart}px, black ${fadeEnd}px, black calc(100% - 60px), transparent 100%)`,
        }}
      >
        <div
          className="absolute top-0 left-0"
          style={{
            width: totalNotesWidth,
            height,
            transform: `translate3d(${translateX}px, 0, 0)`,
            transition: 'transform 0.55s cubic-bezier(0.16, 1, 0.28, 1)',
            willChange: 'transform',
          }}
        >
          {/* Vexflow SVG canvas container (renders staff lines, notes, double barlines and in-staff key changes) */}
          <div ref={notesContainerRef} className="absolute inset-0 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */

function applySheetColors(
  container: HTMLElement,
  notes: ExerciseNote[],
  activeIndex: number,
  staffLineColor: string,
  symbolColor: string,
  defaultNoteColor: string,
  statusColors: { success: string; error: string; active: string }
) {
  // 1. Color in-staff key signatures (sharps / flats in stave transitions)
  container.querySelectorAll('.vf-keysignature, .vf-keysignature path, .vf-keysignature text').forEach((el) => {
    el.setAttribute('fill', symbolColor);
    el.setAttribute('stroke', symbolColor);
    (el as SVGElement).style.fill = symbolColor;
    (el as SVGElement).style.stroke = symbolColor;
  });

  // 2. Color stave lines and barlines (double barlines and staff lines)
  container.querySelectorAll('.vf-stave path, .vf-stave line, .vf-barline, .vf-barline path, .vf-barline line').forEach((el) => {
    el.setAttribute('stroke', staffLineColor);
    (el as SVGElement).style.stroke = staffLineColor;
  });

  // 3. Color all StaveNotes precisely by their index and status (notehead, stem, flags)
  const staveNoteGroups = container.querySelectorAll('.vf-stavenote');
  staveNoteGroups.forEach((group, idx) => {
    const note = notes[idx];
    if (!note) return;

    const isCurrent = idx === activeIndex;
    let color = defaultNoteColor;
    if (note.status === 'correct') {
      color = statusColors.success;
    } else if (note.status === 'incorrect') {
      color = statusColors.error;
    } else if (isCurrent) {
      color = statusColors.active;
    }

    // Color every path, line, rect inside this stavenote (including stem and notehead)
    group.querySelectorAll('path, line, rect, ellipse').forEach((child) => {
      // If it's an annotation text/box, keep error color
      if (child.closest('.vf-annotation') || child.classList.contains('vf-annotation')) return;

      child.setAttribute('fill', color);
      child.setAttribute('stroke', color);
      (child as SVGElement).style.fill = color;
      (child as SVGElement).style.stroke = color;
    });
  });

  // 4. Any remaining blackish glyphs (e.g. key signature glyphs without class names)
  container.querySelectorAll('path, line, rect').forEach((el) => {
    if (el.closest('.vf-stavenote')) return; // Preserve notes
    const fill = el.getAttribute('fill');
    const stroke = el.getAttribute('stroke');
    const isBlack = (v: string | null) => !v || v === '#000' || v === '#000000' || v === 'black' || /^rgb\(0,\s*0,\s*0\)/.test(v ?? '');

    if (isBlack(fill)) {
      el.setAttribute('fill', symbolColor);
      (el as SVGElement).style.fill = symbolColor;
    }
    if (isBlack(stroke)) {
      el.setAttribute('stroke', staffLineColor);
      (el as SVGElement).style.stroke = staffLineColor;
    }
  });
}

function normalizeSvg(container: HTMLElement) {
  const svg = container.querySelector('svg');
  if (!svg) return;
  svg.style.display = 'block';
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.margin = '0';
  svg.style.padding = '0';
}

function applyStaffTheme(container: HTMLElement, staffColor: string, symbolColor?: string) {
  const svg = container.querySelector('svg');
  if (!svg) return;
  const isBlackish = (v: string | null) =>
    !v || v === '#000' || v === '#000000' || v === 'black' || /^rgb(?:a)?\(\s*0\s*,\s*0\s*,\s*0/.test(v ?? '');

  svg.querySelectorAll('path, line, rect, circle, text, ellipse').forEach((el) => {
    const stroke = el.getAttribute('stroke');
    if (isBlackish(stroke)) el.setAttribute('stroke', symbolColor || staffColor);
    const fill = el.getAttribute('fill');
    if (isBlackish(fill)) el.setAttribute('fill', symbolColor || staffColor);
  });
}

function fifthsToKeySpec(fifths: number): string {
  const majors = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
  const majorsFlat = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
  return fifths >= 0 ? majors[fifths] : majorsFlat[-fifths];
}

function getStatusColors(): { success: string; error: string; active: string } {
  return {
    success: getCssVar('--success', '#10b981'),
    error: getCssVar('--error', '#f43f5e'),
    active: getCssVar('--neon-cyan', getCssVar('--accent', '#38bdf8')),
  };
}

function getCssVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
