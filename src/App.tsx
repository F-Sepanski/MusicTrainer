/**
 * App — root component. Manages routing between Home, Wizard, Training, and History.
 * Auto-runs wizard on first launch if no config is persisted.
 *
 * @module App
 */

import { useState, useCallback, useEffect } from 'react';
import { SetupWizard } from './components/SetupWizard';
import { ChapterTrainingScreen } from './components/ChapterTrainingScreen';
import { HomeScreen } from './components/HomeScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { ThemeProvider } from './theme/ThemeContext';
import { loadConfig, saveConfig, loadHistory, clearHistory, type HistoryEntry } from './storage/storage';
import type { WizardConfig } from './types/wizard';

type Screen = 'home' | 'wizard' | 'training' | 'history';

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => (loadConfig() ? 'home' : 'wizard'));
  const [config, setConfig] = useState<WizardConfig | null>(() => loadConfig());
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());

  const handleWizardComplete = useCallback((wizardConfig: WizardConfig) => {
    saveConfig(wizardConfig);
    setConfig(wizardConfig);
    setScreen('home');
  }, []);

  const handleUpdateConfig = useCallback((updated: WizardConfig) => {
    saveConfig(updated);
    setConfig(updated);
  }, []);

  const handleStartTraining = useCallback(() => {
    if (!config) {
      setScreen('wizard');
      return;
    }
    setScreen('training');
  }, [config]);

  const handleViewHistory = useCallback(() => setScreen('history'), []);

  const handleClearHistory = useCallback(() => {
    clearHistory();
    setHistory([]);
  }, []);

  const handleExitTraining = useCallback(() => {
    setHistory(loadHistory());
    setScreen('home');
  }, []);

  return (
    <ThemeProvider>
      <main className="min-h-screen bg-surface-900">
        {screen === 'wizard' && (
          <SetupWizard
            onComplete={handleWizardComplete}
            initialConfig={config}
            onCancel={config ? () => setScreen('home') : undefined}
          />
        )}
        {screen === 'home' && (
          <HomeScreen
            config={config}
            history={history}
            onStartTraining={handleStartTraining}
            onRunWizard={() => setScreen('wizard')}
            onViewHistory={handleViewHistory}
            onUpdateConfig={handleUpdateConfig}
          />
        )}
        {screen === 'training' && config && (
          <ChapterTrainingScreen wizardConfig={config} onExit={handleExitTraining} onUpdateConfig={handleUpdateConfig} />
        )}
        {screen === 'history' && (
          <HistoryScreen
            history={history}
            onBack={() => setScreen('home')}
            onClear={handleClearHistory}
          />
        )}
      </main>
    </ThemeProvider>
  );
}
