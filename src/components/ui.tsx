/**
 * Reusable UI primitives with premium animations.
 *
 * @module components/ui
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/* ── Button ────────────────────────────────────────────────── */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, iconRight, className = '', children, ...rest },
  ref
) {
  const variants: Record<string, string> = {
    primary:
      'accent-btn font-bold hover:opacity-90 shadow-lg shadow-black/20 active:scale-[0.98] transition-all',
    secondary:
      'bg-surface-700 border border-surface text-primary hover:border-adaptive transition-all hover:-translate-y-px',
    ghost:
      'bg-transparent text-secondary hover:bg-surface-700 hover:text-primary transition-all',
    success:
      'accent-success-btn font-bold hover:opacity-90 active:scale-[0.98] transition-all',
  };
  const sizes: Record<string, string> = {
    sm: 'px-4 py-2 text-sm rounded-lg',
    md: 'px-6 py-2.5 text-sm rounded-xl',
    lg: 'px-8 py-3.5 text-base rounded-xl',
  };

  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 select-none disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
      {iconRight && <Icon name={iconRight} size={18} />}
    </button>
  );
});

/* ── Card ─────────────────────────────────────────────────── */
interface CardProps {
  children: ReactNode;
  className?: string;
  animated?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', animated = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface-800 border border-surface rounded-2xl ${animated ? 'card-hover' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

/* ── AnimatedSection (mount animation) ─────────────────────── */
interface AnimatedSectionProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  type?: 'fade' | 'slide-up' | 'slide-down' | 'scale-in';
}

export function AnimatedSection({ children, delay = 0, className = '', type = 'fade' }: AnimatedSectionProps) {
  const animClass = type === 'slide-up' ? 'animate-slide-up' : type === 'slide-down' ? 'animate-slide-down' : type === 'scale-in' ? 'animate-scale-in' : 'animate-fade-in';
  return (
    <div
      className={`${animClass} ${className}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      {children}
    </div>
  );
}

/* ── Slider ───────────────────────────────────────────────── */
interface SliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  accent?: 'cyan' | 'emerald' | 'purple' | 'rose';
  leftHint?: string;
  rightHint?: string;
  format?: (v: number) => string;
}

const ACCENT_CLASSES: Record<NonNullable<SliderProps['accent']>, string> = {
  cyan: 'accent-[var(--accent)]',
  emerald: 'accent-[var(--success)]',
  purple: 'accent-[var(--accent-secondary)]',
  rose: 'accent-[var(--error)]',
};

export function Slider({ label, value, onChange, min, max, step = 1, accent = 'cyan', leftHint, rightHint, format }: SliderProps) {
  return (
    <div className="bg-surface-700 rounded-xl p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-secondary">{label}</span>
        <span className={`font-mono text-lg font-bold ${accent === 'emerald' ? 'text-neon-emerald' : accent === 'purple' ? 'text-neon-purple' : accent === 'rose' ? 'text-neon-rose' : 'text-neon-cyan'}`}>
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className={`w-full ${ACCENT_CLASSES[accent]}`}
      />
      {(leftHint || rightHint) && (
        <div className="flex justify-between text-[10px] text-muted mt-1">
          <span>{leftHint}</span>
          <span>{rightHint}</span>
        </div>
      )}
    </div>
  );
}

/* ── StatCard ─────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: string;
  icon?: IconName;
  color?: string;
}

export function StatCard({ label, value, icon, color = 'text-neon-cyan' }: StatCardProps) {
  return (
    <div className="bg-surface-700 rounded-xl p-3 text-center animate-scale-in">
      {icon && (
        <div className={`flex justify-center mb-1 ${color}`}>
          <Icon name={icon} size={16} />
        </div>
      )}
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

/* ── Modal ────────────────────────────────────────────────── */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
}

export function Modal({ open, onClose, title, children, className = '', closeOnBackdrop = true }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        className={`relative glass rounded-2xl border border-surface shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-scale-in ${className}`}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface shrink-0">
            <h3 className="font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-surface-700 border border-surface hover:border-adaptive transition-all"
              aria-label="Fechar"
            >
              <Icon name="back" size={14} />
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
