/**
 * App — root component for MusicTrainer.
 *
 * @module App
 */

import { useState, useCallback } from 'react';
import { SetupWizard } from './components/SetupWizard';
import { ExerciseScreen } from './components/ExerciseScreen';
import type { WizardConfig } from './types/wizard';

export default function App() {
  const [wizardConfig, setWizardConfig] = useState<WizardConfig | null>(null);

  const handleWizardComplete = useCallback((config: WizardConfig) => {
    setWizardConfig(config);
  }, []);

  const handleBackToWizard = useCallback(() => {
    setWizardConfig(null);
  }, []);

  return (
    <main className="min-h-screen bg-surface-900">
      {!wizardConfig ? (
        <SetupWizard onComplete={handleWizardComplete} />
      ) : (
        <div>
          <ExerciseScreen wizardConfig={wizardConfig} />
          <button
            onClick={handleBackToWizard}
            className="fixed top-4 right-4 z-50 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-700/80 backdrop-blur border border-surface-600 text-gray-400 hover:text-white hover:border-gray-500 transition-all"
          >
            ⚙ Reconfigurar
          </button>
        </div>
      )}
    </main>
  );
}
