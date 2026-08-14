/**
 * AppLayout — consistent page shell with a unified header and content container.
 * Ensures all pages have the same width, header structure, and spacing.
 *
 * @module components/AppLayout
 */

import { type ReactNode } from 'react';
import { Icon } from './Icon';

interface AppLayoutProps {
  /** Page title shown in the header */
  title: string;
  /** Optional subtitle under the title */
  subtitle?: string;
  /** Optional back button (shows when provided) */
  onBack?: () => void;
  /** Right-side header action (e.g. theme settings); optional */
  headerAction?: ReactNode;
  /** Content area (max-width is standardized to max-w-4xl unless `wide` is set) */
  children: ReactNode;
  /** Extra classes for the outer container */
  className?: string;
  /** When true, content area is full-width (no max-width constraint). */
  wide?: boolean;
}

export function AppLayout({ title, subtitle, onBack, headerAction, children, className = '', wide = false }: AppLayoutProps) {
  return (
    <div className={`min-h-screen bg-surface-900 flex flex-col ${className}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-surface">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-surface-700 border border-surface hover:border-adaptive transition-all shrink-0"
              aria-label="Voltar"
            >
              <Icon name="back" size={18} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate leading-tight">{title}</h1>
            {subtitle && <div className="text-xs text-secondary truncate">{subtitle}</div>}
          </div>
          <div className="shrink-0">{headerAction}</div>
        </div>
      </header>

      {/* Content */}
      <main className={`flex-1 w-full mx-auto px-4 sm:px-6 py-8 ${wide ? 'max-w-6xl' : 'max-w-4xl'}`}>
        {children}
      </main>
    </div>
  );
}
