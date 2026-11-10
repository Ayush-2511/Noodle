import { useState, useEffect, useRef, useCallback } from 'react';
import { Graph } from '../../core/graph';
import { WorkerTrainingConfig } from './training.worker';
import { useGraphStore } from '../../core/store';

export type TrainingStatus = 'idle' | 'training' | 'completed' | 'error';

export interface EpochLog {
  epoch: number;
  loss: number;
  accuracy: number;
  valLoss: number;
  valAccuracy: number;
  numTensors: number;
}

export interface EvaluationResult {
  loss: number;
  accuracy: number;
  sampleCount?: number;
  evaluatedAt?: string;
}

export interface PredictionResult {
  probabilities: number[];
  topClass: number;
}

export interface TestSample {
  index: number;
  trueClass: number;
  pixels: number[];
}

export interface TrainingWorkerState {
  status: TrainingStatus;
  currentEpoch: number;
  totalEpochs: number;
  latestLoss: number | null;
  latestAccuracy: number | null;
  history: EpochLog[];
  numTensors: number;
  backend: string;
  errorMessage: string | null;
  startTraining: (graph: Graph, config?: WorkerTrainingConfig) => void;
  stopTraining: () => void;
  resetTraining: () => void;

  // Real evaluation & prediction
  evalResult: EvaluationResult | null;
  isEvaluating: boolean;
  runEvaluation: (graph: Graph) => Promise<EvaluationResult>;

  predictResult: PredictionResult | null;
  isPredicting: boolean;
  runPrediction: (inputData: number[], shape?: number[], graph?: Graph) => Promise<PredictionResult>;
  getTestSamples: () => Promise<TestSample[]>;
}

export function useTrainingWorker(): TrainingWorkerState {
  const [status, setStatus] = useState<TrainingStatus>('idle');
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);
  const [totalEpochs, setTotalEpochs] = useState<number>(3);
  const [latestLoss, setLatestLoss] = useState<number | null>(null);
  const [latestAccuracy, setLatestAccuracy] = useState<number | null>(null);
  const [history, setHistory] = useState<EpochLog[]>([]);
  const [numTensors, setNumTensors] = useState<number>(0);
  const [backend, setBackend] = useState<string>('cpu');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [evalResult, setEvalResult] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  const workerRef = useRef<Worker | null>(null);
  const pendingEvaluations = useRef<Map<string, { resolve: (val: EvaluationResult) => void; reject: (err: any) => void }>>(new Map());
  const pendingPredictions = useRef<Map<string, { resolve: (val: PredictionResult) => void; reject: (err: any) => void }>>(new Map());
  const pendingTestSamples = useRef<Map<string, { resolve: (val: TestSample[]) => void; reject: (err: any) => void }>>(new Map());

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
          case 'BACKEND_INITIALIZED':
            if (msg.backend) setBackend(msg.backend);
            break;

          case 'TRAINING_STARTED':
            setStatus('training');
            setErrorMessage(null);
            setHistory([]);
            setNumTensors(msg.numTensors || 0);
            if (msg.backend) setBackend(msg.backend);
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

          case 'TRAINING_COMPLETED': {
            setStatus('completed');
            setLatestLoss(msg.finalLoss);
            setLatestAccuracy(msg.finalAccuracy);
            setNumTensors(msg.numTensors || 0);
            const nowStr = new Date().toLocaleTimeString();
            setEvalResult({
              loss: msg.finalLoss,
              accuracy: msg.finalAccuracy,
              sampleCount: msg.sampleCount || 160,
              evaluatedAt: nowStr,
            });
            break;
          }

          case 'TRAINING_STOPPED':
            setStatus('idle');
            break;

          case 'TRAINING_ERROR':
            setStatus('error');
            setErrorMessage(msg.error);
            break;

          case 'EVALUATION_COMPLETED': {
            setIsEvaluating(false);
            const nowStr = new Date().toLocaleTimeString();
            const result: EvaluationResult = {
              loss: msg.loss,
              accuracy: msg.accuracy,
              sampleCount: msg.sampleCount,
              evaluatedAt: nowStr,
            };
            setEvalResult(result);
            if (msg.id && pendingEvaluations.current.has(msg.id)) {
              pendingEvaluations.current.get(msg.id)!.resolve(result);
              pendingEvaluations.current.delete(msg.id);
            }
            break;
          }

          case 'EVALUATION_ERROR': {
            setIsEvaluating(false);
            if (msg.id && pendingEvaluations.current.has(msg.id)) {
              pendingEvaluations.current.get(msg.id)!.reject(new Error(msg.error));
              pendingEvaluations.current.delete(msg.id);
            }
            break;
          }

          case 'PREDICTION_COMPLETED': {
            if (msg.id && pendingPredictions.current.has(msg.id)) {
              pendingPredictions.current.get(msg.id)!.resolve({
                probabilities: msg.probabilities,
                topClass: msg.topClass,
              });
              pendingPredictions.current.delete(msg.id);
            }
            break;
          }

          case 'PREDICTION_ERROR': {
            if (msg.id && pendingPredictions.current.has(msg.id)) {
              pendingPredictions.current.get(msg.id)!.reject(new Error(msg.error));
              pendingPredictions.current.delete(msg.id);
            }
            break;
          }

          case 'TEST_SAMPLES_COMPLETED': {
            if (msg.id && pendingTestSamples.current.has(msg.id)) {
              pendingTestSamples.current.get(msg.id)!.resolve(msg.samples || []);
              pendingTestSamples.current.delete(msg.id);
            }
            break;
          }

          case 'TEST_SAMPLES_ERROR': {
            if (msg.id && pendingTestSamples.current.has(msg.id)) {
              pendingTestSamples.current.get(msg.id)!.reject(new Error(msg.error));
              pendingTestSamples.current.delete(msg.id);
            }
            break;
          }
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

    const trainNode = graph.nodes.find((n) => n.type === 'Train');
    const deviceParam = (trainNode?.params?.device as any) || 'auto';
    const finalConfig: WorkerTrainingConfig = {
      ...config,
      preferredBackend: config?.preferredBackend || deviceParam,
    };

    const customData = useGraphStore.getState().customDataset;
    workerRef.current.postMessage({
      type: 'START_TRAINING',
      graph,
      config: finalConfig,
      customData,
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
    setEvalResult(null);
  }, []);

  const runEvaluation = useCallback((graph: Graph): Promise<EvaluationResult> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Web Worker not initialized'));
        return;
      }
      setIsEvaluating(true);
      const id = `eval_${Date.now()}_${Math.random()}`;
      pendingEvaluations.current.set(id, { resolve, reject });
      workerRef.current.postMessage({
        type: 'RUN_EVALUATION',
        id,
        graph,
      });
    });
  }, []);

  const runPrediction = useCallback((inputData: number[], shape?: number[], graph?: Graph): Promise<PredictionResult> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Web Worker not initialized'));
        return;
      }
      const id = `pred_${Date.now()}_${Math.random()}`;
      pendingPredictions.current.set(id, { resolve, reject });
      workerRef.current.postMessage({
        type: 'RUN_PREDICTION',
        id,
        inputData,
        shape,
        graph,
      });
    });
  }, []);

  const getTestSamples = useCallback((): Promise<TestSample[]> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Web Worker not initialized'));
        return;
      }
      const id = `samples_${Date.now()}_${Math.random()}`;
      pendingTestSamples.current.set(id, { resolve, reject });
      workerRef.current.postMessage({
        type: 'GET_TEST_SAMPLES',
        id,
      });
    });
  }, []);

  return {
    status,
    currentEpoch,
    totalEpochs,
    latestLoss,
    latestAccuracy,
    history,
    numTensors,
    backend,
    errorMessage,
    startTraining,
    stopTraining,
    resetTraining,
    evalResult,
    isEvaluating,
    runEvaluation,
    predictResult: null,
    isPredicting: false,
    runPrediction,
    getTestSamples,
  };
}

