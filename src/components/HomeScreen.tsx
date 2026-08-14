/**
 * HomeScreen — premium landing screen with a focused "continue training" hero,
 * live statistics, and a summary of the last session.
 *
 * @module components/HomeScreen
 */

import { useMemo, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { Button, Card, AnimatedSection, Modal } from './ui';
import { AppLayout } from './AppLayout';
import { ThemeSettings } from './ThemeSettings';
import { SettingsModal } from './SettingsModal';
import { useTheme } from '../theme/ThemeContext';
import { buildCurriculum } from '../exercise/curriculum';
import type { WizardConfig } from '../types/wizard';
import type { HistoryEntry } from '../storage/storage';

interface Props {
  config: WizardConfig | null;
  history: HistoryEntry[];
  onStartTraining: () => void;
  onRunWizard: () => void;
  onViewHistory: () => void;
  onUpdateConfig: (config: WizardConfig) => void;
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

const MANUAL_LABELS: Record<string, string> = {
  guitar: 'Violão',
  piano: 'Piano',
  circle: 'Círculo de Notas',
};

/** Max chapter index unlocked per level (mirrors ChapterTrainingScreen). */
const LEVEL_UNLOCK: Record<string, number> = {
  beginner: 3,
  learner: 5,
  intermediate: 7,
  experienced: 8,
  professional: 8,
};

/** Number of consecutive days (ending today or yesterday) with a session. */
function computeStreak(history: HistoryEntry[]): number {
  if (history.length === 0) return 0;
  const days = new Set<number>();
  for (const h of history) {
    const d = new Date(h.timestamp);
    days.add(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
  }
  const DAY = 86400000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();
  // Allow the streak to start from today or yesterday.
  const start = days.has(todayTs) ? todayTs : days.has(todayTs - DAY) ? todayTs - DAY : null;
  if (start === null) return 0;
  let streak = 0;
  let cursor = start;
  while (days.has(cursor)) {
    streak++;
    cursor -= DAY;
  }
  return streak;
}

export function HomeScreen({ config, history, onStartTraining, onRunWizard, onViewHistory, onUpdateConfig }: Props) {
  const [showTheme, setShowTheme] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Current chapter / exercise shown in the hero (first unlocked chapter).
  const currentChapter = useMemo(() => {
    if (!config) return null;
    const maxUnlock = LEVEL_UNLOCK[config.level] ?? 8;
    const curriculum = buildCurriculum(config.notationSystem ?? 'letters');
    return curriculum.find((c) => c.index <= maxUnlock) ?? null;
  }, [config]);

  const currentExercise = currentChapter?.exercises[0] ?? null;

  const stats = useMemo(() => {
    if (history.length === 0) {
      return { sessions: 0, avgAccuracy: 0, avgTime: 0, bestAccuracy: 0, streak: 0 };
    }
    const avgAcc = history.reduce((a, h) => a + h.accuracy, 0) / history.length;
    const avgTime = history.reduce((a, h) => a + h.averageResponseTimeMs, 0) / history.length;
    const best = Math.max(...history.map((h) => h.accuracy));
    return {
      sessions: history.length,
      avgAccuracy: Math.round(avgAcc),
      avgTime: Math.round(avgTime),
      bestAccuracy: best,
      streak: computeStreak(history),
    };
  }, [history]);

  const instrumentLabel = config?.instrument ? config.instrument.charAt(0).toUpperCase() + config.instrument.slice(1) : 'Não configurado';
  const instrumentIcon = (config?.instrument && INSTRUMENT_ICONS[config.instrument]) || 'other';
  const levelLabel = config?.level ? LEVEL_LABELS[config.level] ?? config.level : '';

  const inputLabel = useMemo(() => {
    if (!config) return '—';
    if (config.inputMode === 'mic') return `Microfone (${config.toleranceCents} cents)`;
    return MANUAL_LABELS[config.manualType] ?? 'Entrada manual';
  }, [config]);

  const lastSession = history[0];

  return (
    <AppLayout
      title="MusicTrainer"
      subtitle={config ? `${instrumentLabel} · Modo Partitura` : 'Configure seu perfil para começar'}
      headerAction={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2.5 rounded-xl bg-surface-700 border border-surface hover:border-adaptive transition-all"
            aria-label="Configurações"
            disabled={!config}
          >
            <Icon name="settings" size={18} />
          </button>
          <button
            onClick={() => setShowTheme(!showTheme)}
            className="p-2.5 rounded-xl bg-surface-700 border border-surface hover:border-adaptive transition-all"
            aria-label="Temas"
          >
            <Icon name="palette" size={18} />
          </button>
        </div>
      }
    >
      {/* Theme modal */}
      <Modal open={showTheme} onClose={() => setShowTheme(false)} title="Personalizar Tema">
        <ThemeSettings />
      </Modal>

      {/* Settings modal */}
      {config && (
        <SettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          config={config}
          onSave={onUpdateConfig}
          onRunWizard={() => {
            setShowSettings(false);
            onRunWizard();
          }}
        />
      )}

      <div className="space-y-6">
        {/* Hero / Current exercise */}
        <AnimatedSection type="slide-up">
          <Card className="p-6 sm:p-8 bg-gradient-to-br from-surface-800 to-surface-700 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-purple-soft blur-3xl animate-float" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-accent-glow blur-3xl animate-float" style={{ animationDelay: '-2s' }} />

            <div className="relative">
              {config ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-accent-soft-2 border border-accent-soft shrink-0 animate-pulse-glow">
                      <Icon name={instrumentIcon} size={34} className="text-neon-cyan" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wide">
                        <Icon name="music" size={13} className="text-neon-purple" />
                        {currentChapter ? `Capítulo ${currentChapter.index}: ${currentChapter.title}` : 'Treinamento'}
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-bold mt-1 leading-tight">
                        {currentExercise ? `Exercício 1: ${currentExercise.title}` : `Treinar ${instrumentLabel}`}
                      </h1>
                      <p className="text-sm text-secondary mt-1 flex items-center gap-1.5">
                        <Icon name={config.inputMode === 'mic' ? 'mic' : 'keyboard'} size={14} className="text-neon-emerald" />
                        Entrada: {inputLabel}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-7">
                    <Button variant="primary" size="lg" icon="play" onClick={onStartTraining} className="flex-1">
                      Continuar Treino
                    </Button>
                    <Button variant="secondary" size="lg" icon="forward" iconRight="chevron-right" onClick={onStartTraining} className="flex-1">
                      Explorar Capítulos
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="text-5xl mb-4 flex justify-center animate-pulse-glow">
                    <Icon name="music" size={52} className="text-neon-cyan" />
                  </div>
                  <h1 className="text-3xl font-bold mb-2">Bem-vindo ao MusicTrainer</h1>
                  <p className="text-secondary mb-6 max-w-md mx-auto">
                    Configure o app para calibrar seu instrumento e ambiente.
                  </p>
                  <Button variant="primary" size="lg" icon="wizard" onClick={onRunWizard}>
                    Configurar agora
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </AnimatedSection>

        {/* Stats */}
        {history.length > 0 ? (
          <AnimatedSection type="slide-up" delay={100}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-surface-700 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent-soft text-neon-amber shrink-0">
                  <Icon name="sparkles" size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary leading-none">{stats.streak} Dias</div>
                  <div className="text-xs text-muted mt-1">Sequência</div>
                </div>
              </div>
              <div className="bg-surface-700 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent-soft text-neon-emerald shrink-0">
                  <Icon name="target" size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary leading-none">{stats.avgAccuracy}%</div>
                  <div className="text-xs text-muted mt-1">Precisão</div>
                </div>
              </div>
              <div className="bg-surface-700 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent-soft text-neon-cyan shrink-0">
                  <Icon name="clock" size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary leading-none">{stats.avgTime} ms</div>
                  <div className="text-xs text-muted mt-1">Reconhecimento</div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        ) : (
          <AnimatedSection type="slide-up" delay={100}>
            <Card className="p-6 text-center">
              <p className="text-sm text-secondary">
                Nenhum treino registrado ainda — comece sua primeira sessão acima! 🎵
              </p>
            </Card>
          </AnimatedSection>
        )}

        {/* Last session summary */}
        {lastSession && (
          <AnimatedSection type="slide-up" delay={150}>
            <Card animated className="p-6" onClick={onViewHistory}>
              <div className="flex items-center gap-2 mb-3">
                <Icon name="history" size={18} className="text-neon-purple" />
                <h3 className="font-semibold">Última Sessão</h3>
                <span className="text-xs text-muted ml-auto">
                  {new Date(lastSession.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-secondary">
                {lastSession.correctNotes}/{lastSession.totalNotes} Acertos · {lastSession.averageResponseTimeMs}ms médio · {lastSession.accuracy}% Precisão
              </p>
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-accent-soft text-neon-cyan font-medium truncate mt-3 max-w-full">
                {lastSession.levelName}
              </span>
            </Card>
          </AnimatedSection>
        )}
      </div>
    </AppLayout>
  );
}
