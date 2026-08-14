/**
 * HistoryScreen — shows past training sessions.
 *
 * @module components/HistoryScreen
 */

import { Icon } from './Icon';
import { Button, Card, AnimatedSection } from './ui';
import { AppLayout } from './AppLayout';
import { DIFFICULTY_LABELS } from '../exercise/curriculum';
import type { HistoryEntry } from '../storage/storage';

interface Props {
  history: HistoryEntry[];
  onBack: () => void;
  onClear: () => void;
}

export function HistoryScreen({ history, onBack, onClear }: Props) {
  return (
    <AppLayout
      title="Histórico de Sessões"
      subtitle={history.length > 0 ? `${history.length} treinos registrados` : undefined}
      onBack={onBack}
      headerAction={
        history.length > 0 ? (
          <button
            onClick={onClear}
            className="px-3 py-2 rounded-lg text-xs text-neon-rose border border-surface hover:opacity-80 transition-opacity bg-surface-700"
          >
            Limpar
          </button>
        ) : undefined
      }
    >
      <div className="space-y-3">
        {history.length === 0 ? (
          <AnimatedSection type="scale-in">
            <Card className="p-12 text-center">
              <div className="flex justify-center text-muted mb-4">
                <Icon name="history" size={48} />
              </div>
              <h2 className="font-semibold mb-1">Nenhuma sessão ainda</h2>
              <p className="text-sm text-secondary mb-6">Complete um treino para ver suas estatísticas aqui.</p>
              <Button variant="primary" icon="play" onClick={onBack}>
                Começar a treinar
              </Button>
            </Card>
          </AnimatedSection>
        ) : (
          history.map((h, i) => (
            <AnimatedSection key={h.id} type="slide-up" delay={i * 40}>
              <Card animated className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-surface-700 accent-text">
                    <Icon name="music" size={18} />
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {h.levelName}
                      {h.passed && (
                        <span className="px-1.5 py-0.5 rounded-full bg-neon-emerald/15 text-neon-emerald text-[9px] font-bold flex items-center gap-0.5">
                          <Icon name="check" size={9} /> Aprovado
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted">
                      {(h.difficulty && DIFFICULTY_LABELS[h.difficulty]) ?? ''}{h.difficulty ? ' · ' : ''}{h.clef === 'treble' ? 'Clave de Sol' : 'Clave de Fá'} · {h.instrument} ·{' '}
                      {new Date(h.timestamp).toLocaleString('pt-BR')}
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className={`text-2xl font-bold ${h.accuracy >= 80 ? 'text-neon-emerald' : h.accuracy >= 60 ? 'text-neon-amber' : 'text-neon-rose'}`}>
                      {h.accuracy}%
                    </div>
                    <div className="text-[10px] text-muted">precisão</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-surface-700 rounded-lg p-2">
                    <div className="text-sm font-bold">{h.correctNotes}/{h.totalNotes}</div>
                    <div className="text-[10px] text-muted">Acertos</div>
                  </div>
                  <div className="bg-surface-700 rounded-lg p-2">
                    <div className="text-sm font-bold">{h.averageResponseTimeMs}ms</div>
                    <div className="text-[10px] text-muted">Tempo</div>
                  </div>
                  <div className="bg-surface-700 rounded-lg p-2">
                    <div className="text-sm font-bold">{h.averageCentsOffset}¢</div>
                    <div className="text-[10px] text-muted">Desvio</div>
                  </div>
                </div>
              </Card>
            </AnimatedSection>
          ))
        )}
      </div>
    </AppLayout>
  );
}
