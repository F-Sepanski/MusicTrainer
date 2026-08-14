/**
 * SheetMusicDisplay — VexFlow-based component for rendering musical staves
 * with real-time note highlighting.
 *
 * @module components/SheetMusicDisplay
 */

import { useEffect, useRef, useCallback } from 'react';
import { Stave, StaveNote, Voice, Formatter, Renderer } from 'vexflow';
import type { ExerciseNote } from '../types';

interface Props {
  notes: ExerciseNote[];
  clef: 'treble' | 'bass';
  width?: number;
  height?: number;
  theme?: 'dark' | 'light';
  /** Key signature in fifths (positive sharps, negative flats) */
  keyFifths?: number;
}

/**
 * Renders a musical staff with the given notes.
 * Notes change color based on their `status` field.
 */
export function SheetMusicDisplay({ notes, clef, width = 900, height = 250, theme = 'dark', keyFifths = 0 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const renderStaff = useCallback(() => {
    const container = containerRef.current;
    if (!container || notes.length === 0) return;

    // Clear previous render
    container.innerHTML = '';

    // Create SVG renderer directly
    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();

    // Theme-aware colors from CSS variables (so themes apply)
    const staffLineColor = getCssVar('--staff-line', theme === 'dark' ? '#9aa0aa' : '#4b5563');
    const defaultNoteColor = getCssVar('--note-default', theme === 'dark' ? '#cbd5e1' : '#374151');

    // Create a staff
    const stave = new Stave(10, 40, width - 20);
    stave.addClef(clef).setContext(context).draw();

    // Add key signature if not natural
    if (keyFifths !== 0) {
      stave.addKeySignature(fifthsToKeySpec(keyFifths)).setContext(context).draw();
    }

    // Style the staff lines, clef, and key signature for visibility in the current theme
    const svg = container.querySelector('svg');
    if (svg) {
      const isBlackish = (v: string | null) =>
        !v || v === '#000' || v === '#000000' || v === 'black' || v === 'rgb(0,0,0)' || v === '#000000' || /^rgba?\(0\s*,\s*0\s*,\s*0/.test(v ?? '');
      svg.querySelectorAll('path, line, rect, circle, text, ellipse').forEach((el) => {
        const stroke = el.getAttribute('stroke');
        if (isBlackish(stroke)) {
          el.setAttribute('stroke', staffLineColor);
        }
        const fill = el.getAttribute('fill');
        if (isBlackish(fill)) {
          el.setAttribute('fill', staffLineColor);
        }
      });
    }

    // Resolve dynamic status colors from CSS variables (so themes apply)
    const statusColors = getStatusColors();

    // Apply color based on status
    const vfNotes = notes.map((note) => {
      const sn = new StaveNote({
        clef,
        keys: [note.vfKey],
        duration: 'q',
      });

      // Apply color based on status
      switch (note.status) {
        case 'active':
        case 'pending':
          sn.setStyle({ fillStyle: defaultNoteColor, strokeStyle: defaultNoteColor });
          break;
        case 'correct':
          sn.setStyle({ fillStyle: statusColors.success, strokeStyle: statusColors.success });
          break;
        case 'incorrect':
          sn.setStyle({ fillStyle: statusColors.error, strokeStyle: statusColors.error });
          break;
      }

      return sn;
    });

    // Create voice and format
    const voice = new Voice({ numBeats: notes.length, beatValue: 4 });
    voice.setStrict(false);
    voice.addTickables(vfNotes);

    new Formatter().joinVoices([voice]).format([voice], width - 60);

    voice.draw(context, stave);
  }, [notes, clef, width, height, theme, keyFifths]);

  useEffect(() => {
    renderStaff();
  }, [renderStaff]);

  return (
    <div
      ref={containerRef}
      className="w-full flex justify-center items-center overflow-x-auto"
      style={{ minHeight: height }}
    />
  );
}

/** Convert circle-of-fifths value to a VexFlow key spec string. */
function fifthsToKeySpec(fifths: number): string {
  const majors = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
  const majorsFlat = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
  if (fifths >= 0) return `${majors[fifths]}`;
  return `${majorsFlat[-fifths]}`;
}

/** Read success/error colors from CSS variables (theme-aware). */
function getStatusColors(): { success: string; error: string } {
  return {
    success: getCssVar('--success', '#10b981'),
    error: getCssVar('--error', '#f43f5e'),
  };
}

/** Read a CSS variable value from :root (theme-aware). */
function getCssVar(name: string, fallback: string): string {
  const cs = getComputedStyle(document.documentElement);
  return cs.getPropertyValue(name).trim() || fallback;
}
