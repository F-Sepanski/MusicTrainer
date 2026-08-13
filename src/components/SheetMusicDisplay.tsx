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
}

/**
 * Renders a musical staff with the given notes.
 * Notes change color based on their `status` field.
 */
export function SheetMusicDisplay({ notes, clef, width = 900, height = 250 }: Props) {
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

    // Create a staff
    const stave = new Stave(10, 40, width - 20);
    stave.addClef(clef).setContext(context).draw();

    // Build VexFlow notes
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
          sn.setStyle({ fillStyle: '#A0A0B0', strokeStyle: '#A0A0B0' });
          break;
        case 'correct':
          sn.setStyle({ fillStyle: '#10B981', strokeStyle: '#10B981' });
          break;
        case 'incorrect':
          sn.setStyle({ fillStyle: '#F43F5E', strokeStyle: '#F43F5E' });
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
  }, [notes, clef, width, height]);

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
