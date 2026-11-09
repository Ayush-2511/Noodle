import { useState, useEffect, useRef, useCallback } from 'react';
import { Graph } from '../../core/graph';
import { WorkerTrainingConfig } from './training.worker';

export type TrainingStatus = 'idle' | 'training' | 'completed' | 'error';

export interface EpochLog {
  epoch: number;
  loss: number;
  accuracy: number;
  valLoss: number;
  valAccuracy: number;
  numTensors: number;
}

export interface TrainingWorkerState {
  status: TrainingStatus;
  currentEpoch: number;
  totalEpochs: number;
  latestLoss: number | null;
  latestAccuracy: number | null;
  history: EpochLog[];
  numTensors: number;
  errorMessage: string | null;
  startTraining: (graph: Graph, config?: WorkerTrainingConfig) => void;
  stopTraining: () => void;
  resetTraining: () => void;
}

export function useTrainingWorker(): TrainingWorkerState {
  const [status, setStatus] = useState<TrainingStatus>('idle');
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);
  const [totalEpochs, setTotalEpochs] = useState<number>(3);
  const [latestLoss, setLatestLoss] = useState<number | null>(null);
  const [latestAccuracy, setLatestAccuracy] = useState<number | null>(null);
  const [history, setHistory] = useState<EpochLog[]>([]);
  const [numTensors, setNumTensors] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);

  // Initialize Worker using Vite's standard module worker constructor
  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL('./training.worker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (e: MessageEvent) => {
        const msg = e.data;

        switch (msg.type) {
          case 'TRAINING_STARTED':
            setStatus('training');
            setErrorMessage(null);
            setHistory([]);
            setNumTensors(msg.numTensors || 0);
            break;

          case 'EPOCH_BEGIN':
            setCurrentEpoch(msg.epoch);
            setTotalEpochs(msg.totalEpochs);
            break;

          case 'EPOCH_END':
            setCurrentEpoch(msg.epoch);
            setTotalEpochs(msg.totalEpochs);
            setLatestLoss(msg.loss);
            setLatestAccuracy(msg.accuracy);
            setNumTensors(msg.numTensors || 0);
            setHistory((prev) => [
              ...prev,
              {
                epoch: msg.epoch,
                loss: msg.loss,
                accuracy: msg.accuracy,
                valLoss: msg.valLoss,
                valAccuracy: msg.valAccuracy,
                numTensors: msg.numTensors || 0,
              },
            ]);
            break;

          case 'TRAINING_COMPLETED':
            setStatus('completed');
            setLatestLoss(msg.finalLoss);
            setLatestAccuracy(msg.finalAccuracy);
            setNumTensors(msg.numTensors || 0);
            break;

          case 'TRAINING_STOPPED':
            setStatus('idle');
            break;

          case 'TRAINING_ERROR':
            setStatus('error');
            setErrorMessage(msg.error);
            break;
        }
      };

      workerRef.current.onerror = (err) => {
        console.error('Training worker error:', err);
        setStatus('error');
        setErrorMessage(err.message || 'Worker runtime error');
      };
    } catch (err: any) {
      console.warn('Failed to initialize Web Worker:', err);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const startTraining = useCallback((graph: Graph, config?: WorkerTrainingConfig) => {
    if (!workerRef.current) return;
    setStatus('training');
    setErrorMessage(null);
    setLatestLoss(null);
    setLatestAccuracy(null);
    workerRef.current.postMessage({
      type: 'START_TRAINING',
      graph,
      config,
    });
  }, []);

  const stopTraining = useCallback(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: 'STOP_TRAINING' });
  }, []);

  const resetTraining = useCallback(() => {
    setStatus('idle');
    setCurrentEpoch(0);
    setLatestLoss(null);
    setLatestAccuracy(null);
    setHistory([]);
    setErrorMessage(null);
  }, []);

  return {
    status,
    currentEpoch,
    totalEpochs,
    latestLoss,
    latestAccuracy,
    history,
    numTensors,
    errorMessage,
    startTraining,
    stopTraining,
    resetTraining,
  };
}

