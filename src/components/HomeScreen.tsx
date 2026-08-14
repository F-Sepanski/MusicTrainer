/**
 * HomeScreen — landing screen with options to start training,
 * view history, or re-run the setup wizard.
 *
 * @module components/HomeScreen
 */

import { useMemo, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { Button, Card, AnimatedSection, StatCard } from './ui';
import { AppLayout } from './AppLayout';
import { ThemeSettings } from './ThemeSettings';
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

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Iniciante',
  learner: 'Aprendiz',
  intermediate: 'Intermediário',
  experienced: 'Experiente',
  professional: 'Profissional',
};

export function HomeScreen({ config, history, onStartTraining, onRunWizard, onViewHistory }: Props) {
  const [showTheme, setShowTheme] = useState(false);
  const { config: themeConfig } = useTheme();

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
  const levelLabel = config?.level ? LEVEL_LABELS[config.level] ?? config.level : '';
  const lastSession = history[0];

  return (
    <AppLayout
      title="MusicTrainer"
      subtitle={config ? `Nível ${levelLabel} · ${instrumentLabel}` : 'Configure seu perfil para começar'}
      headerAction={
        <button
          onClick={() => setShowTheme(!showTheme)}
          className="p-2.5 rounded-xl bg-surface-700 border border-surface hover:border-adaptive transition-all"
          aria-label="Temas"
        >
          <Icon name="palette" size={18} />
        </button>
      }
    >
      {/* Theme panel (collapsible) */}
      {showTheme && (
        <AnimatedSection type="slide-down" className="mb-6">
          <Card className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Icon name="palette" size={18} className="accent-text" />
              Personalizar Tema
            </h2>
            <ThemeSettings />
          </Card>
        </AnimatedSection>
      )}

      <div className="space-y-8">
        {/* Hero / Status */}
        <AnimatedSection type="slide-up">
          <Card className="p-8 text-center bg-gradient-to-br from-surface-800 to-surface-700 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-purple-soft blur-3xl animate-float" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-accent-glow blur-3xl animate-float" style={{ animationDelay: '-2s' }} />

            <div className="relative">
              <div className="text-5xl mb-4 flex justify-center animate-pulse-glow">
                <Icon name={config ? instrumentIcon : 'music'} size={52} className="text-neon-cyan" />
              </div>
              <h1 className="text-3xl font-bold mb-2">
                {config ? `Treinar ${instrumentLabel}` : 'Bem-vindo ao MusicTrainer'}
              </h1>
              <p className="text-secondary mb-6 max-w-md mx-auto">
                {config
                  ? `Nível ${levelLabel} · ${config.inputMode === 'mic' ? `A4 = ${config.a4Frequency}Hz` : 'Entrada manual'} · Tolerância ${config.toleranceCents} cents`
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
              <div className="p-3 rounded-xl bg-purple-soft text-neon-purple">
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
              <div className="p-3 rounded-xl bg-accent-soft text-neon-cyan">
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
                <Icon name="clock" size={18} className="accent-text" />
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
      </div>
    </AppLayout>
  );
}
