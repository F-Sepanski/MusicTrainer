/**
 * ThemeToggle — light/dark mode toggle button.
 *
 * @module components/ThemeToggle
 */

import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl bg-surface-700 border border-surface hover:border-gray-400 transition-all hover:-translate-y-px active:scale-95"
      aria-label={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
    </button>
  );
}
