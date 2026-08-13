/**
 * HomeScreen — landing screen with options to start training,
 * view history, or re-run the setup wizard.
 *
 * @module components/HomeScreen
 */

import { useMemo } from 'react';
import { Icon, type IconName } from './Icon';
import { Button, Card, AnimatedSection, StatCard } from './ui';
import { useTheme } from '../theme/ThemeContext';
import type { WizardConfig } from '../types/wizard';
import type { HistoryEntry } from '../storage/storage';

interface Props {
  config: WizardConfig | null;
  history: HistoryEntry[];
  onStartTraining: () => void;
  onRunWizard: () => void;
  onViewHistory: () => void;
}

const INSTRUMENT_ICONS: Record<string, IconName> = {
  piano: 'piano',
  guitar: 'guitar',
  violin: 'violin',
  flute: 'flute',
  saxophone: 'sax',
  trumpet: 'trumpet',
  voice: 'voice',
  other: 'other',
};

export function HomeScreen({ config, history, onStartTraining, onRunWizard, onViewHistory }: Props) {
  const { theme, toggleTheme } = useTheme();

  const stats = useMemo(() => {
    if (history.length === 0) {
      return { sessions: 0, avgAccuracy: 0, avgTime: 0, bestAccuracy: 0 };
    }
    const avgAcc = history.reduce((a, h) => a + h.accuracy, 0) / history.length;
    const avgTime = history.reduce((a, h) => a + h.averageResponseTimeMs, 0) / history.length;
    const best = Math.max(...history.map((h) => h.accuracy));
    return {
      sessions: history.length,
      avgAccuracy: Math.round(avgAcc),
      avgTime: Math.round(avgTime),
      bestAccuracy: best,
    };
  }, [history]);

  const instrumentLabel = config?.instrument ? config.instrument.charAt(0).toUpperCase() + config.instrument.slice(1) : 'Não configurado';
  const instrumentIcon = (config?.instrument && INSTRUMENT_ICONS[config.instrument]) || 'other';
  const lastSession = history[0];

  return (
    <div className="min-h-screen bg-surface-900">
      {/* Top bar */}
      <header className="sticky top-0 z-40 glass border-b border-surface">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold gradient-text">
            <Icon name="music" size={26} />
            MusicTrainer
          </div>
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-surface-700 border border-surface hover:border-gray-400 transition-all hover:-translate-y-px"
            aria-label="Alternar tema"
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Hero / Status */}
        <AnimatedSection type="slide-up">
          <Card className="p-8 text-center bg-gradient-to-br from-surface-800 to-surface-700 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-neon-purple/20 blur-3xl animate-float" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-neon-cyan/20 blur-3xl animate-float" style={{ animationDelay: '-2s' }} />

            <div className="relative">
              <div className="text-5xl mb-4 flex justify-center animate-pulse-glow">
                <Icon name={config ? instrumentIcon : 'music'} size={52} className="text-neon-cyan" />
              </div>
              <h1 className="text-3xl font-bold mb-2">
                {config ? `Treinar ${instrumentLabel}` : 'Bem-vindo ao MusicTrainer'}
              </h1>
              <p className="text-secondary mb-6 max-w-md mx-auto">
                {config
                  ? `Clave de ${config.clef === 'treble' ? 'Sol' : 'Fá'} · A4 = ${config.a4Frequency}Hz · Tolerância ${config.toleranceCents} cents`
                  : 'Configure o app para calibrar seu instrumento e ambiente.'}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="primary" size="lg" icon="play" onClick={onStartTraining}>
                  Iniciar Treinamento
                </Button>
                <Button variant="secondary" size="lg" icon="wizard" onClick={onRunWizard}>
                  {config ? 'Reconfigurar' : 'Configurar'}
                </Button>
              </div>
            </div>
          </Card>
        </AnimatedSection>

        {/* Stats */}
        {history.length > 0 && (
          <AnimatedSection type="slide-up" delay={100}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Sessões" value={String(stats.sessions)} icon="chart" />
              <StatCard label="Precisão Média" value={`${stats.avgAccuracy}%`} icon="target" color="text-neon-emerald" />
              <StatCard label="Tempo Médio" value={`${stats.avgTime}ms`} icon="clock" color="text-neon-purple" />
              <StatCard label="Melhor" value={`${stats.bestAccuracy}%`} icon="check" color="text-neon-amber" />
            </div>
          </AnimatedSection>
        )}

        {/* Quick actions */}
        <AnimatedSection type="slide-up" delay={150}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card animated className="p-6 flex items-start gap-4" onClick={onViewHistory}>
              <div className="p-3 rounded-xl bg-neon-purple/15 text-neon-purple">
                <Icon name="history" size={24} />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Histórico</h3>
                <p className="text-sm text-secondary">
                  {history.length > 0
                    ? `Última sessão: ${history.length} treinos registrados`
                    : 'Nenhum treino registrado ainda'}
                </p>
              </div>
              <Icon name="chevron-right" size={20} className="ml-auto text-muted" />
            </Card>

            <Card animated className="p-6 flex items-start gap-4" onClick={onRunWizard}>
              <div className="p-3 rounded-xl bg-neon-cyan/15 text-neon-cyan">
                <Icon name="settings" size={24} />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Configuração</h3>
                <p className="text-sm text-secondary">Calibrar microfone, instrumento e ambiente</p>
              </div>
              <Icon name="chevron-right" size={20} className="ml-auto text-muted" />
            </Card>
          </div>
        </AnimatedSection>

        {/* Last session summary */}
        {lastSession && (
          <AnimatedSection type="slide-up" delay={200}>
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="clock" size={18} className="text-neon-cyan" />
                <h3 className="font-semibold">Última Sessão</h3>
                <span className="text-xs text-muted ml-auto">
                  {new Date(lastSession.timestamp).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Precisão" value={`${lastSession.accuracy}%`} color="text-neon-emerald" />
                <StatCard label="Acertos" value={`${lastSession.correctNotes}/${lastSession.totalNotes}`} color="text-neon-cyan" />
                <StatCard label="Tempo" value={`${lastSession.averageResponseTimeMs}ms`} color="text-neon-purple" />
              </div>
            </Card>
          </AnimatedSection>
        )}
      </main>
    </div>
  );
}
