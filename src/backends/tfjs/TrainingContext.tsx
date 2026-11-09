import React, { createContext, useContext } from 'react';
import { TrainingWorkerState, useTrainingWorker } from './useTrainingWorker';

const TrainingContext = createContext<TrainingWorkerState | null>(null);

export const TrainingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const training = useTrainingWorker();
  return (
    <TrainingContext.Provider value={training}>
      {children}
    </TrainingContext.Provider>
  );
};

export function useTraining(): TrainingWorkerState {
  const context = useContext(TrainingContext);
  if (!context) {
    throw new Error('useTraining must be used within a TrainingProvider');
  }
  return context;
}

export function useTrainingSafe(): TrainingWorkerState | null {
  return useContext(TrainingContext);
}
