import React, { useMemo } from 'react';
import { Play, Square, Cpu, ShieldCheck } from 'lucide-react';
import { TrainingWorkerState } from '../backends/tfjs/useTrainingWorker';
import { useTrainingSafe } from '../backends/tfjs/TrainingContext';
import { useGraphStore } from '../core/store';
import { validate } from '../core/validator';

interface TrainingPanelProps {
  training?: TrainingWorkerState;
}

export const TrainingPanel: React.FC<TrainingPanelProps> = ({ training: propTraining }) => {
  const contextTraining = useTrainingSafe();
  const training = propTraining || contextTraining;
  const graph = useGraphStore((state) => state.graph);

  const structuralKey = useMemo(() => {
    return JSON.stringify({
      nodes: graph.nodes.map((n) => ({ id: n.id, type: n.type, params: n.params, layers: n.layers })),
      edges: graph.edges,
    });
  }, [graph.nodes, graph.edges]);

  const validation = useMemo(() => {
    return validate(graph);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structuralKey]);

  const isGraphValid = validation.isValid && graph.nodes.length > 0;

  if (!training) return null;

  const handleStart = () => {
    if (!isGraphValid) return;
    training.startTraining(graph, { epochs: 5, batchSize: 32 });
  };

  const lossFormatted = training.latestLoss !== null ? training.latestLoss.toFixed(4) : '--';
  const accFormatted =
    training.latestAccuracy !== null ? `${(training.latestAccuracy * 100).toFixed(1)}%` : '--';

  return (
    <footer
      style={{
        height: '28px',
        backgroundColor: '#1b1b1b',
        borderTop: '1px solid #2d2d2d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        fontSize: '0.72rem',
        zIndex: 10,
        userSelect: 'none',
      }}
    >
      {/* Left: Execution Controls & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {training.status === 'training' ? (
          <button
            onClick={training.stopTraining}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              backgroundColor: '#a80000',
              border: 'none',
              borderRadius: 3,
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Square size={10} fill="#ffffff" />
            <span>Stop Training</span>
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={!isGraphValid}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              backgroundColor: isGraphValid ? '#107c41' : '#2b2b2b',
              border: 'none',
              borderRadius: 3,
              color: isGraphValid ? '#ffffff' : '#666666',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: isGraphValid ? 'pointer' : 'not-allowed',
            }}
          >
            <Play size={10} fill={isGraphValid ? '#ffffff' : '#666666'} />
            <span>Run Training</span>
          </button>
        )}

        {/* Engine status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#999999' }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor:
                training.status === 'training'
                  ? '#0078d4'
                  : training.status === 'completed'
                  ? '#107c41'
                  : training.status === 'error'
                  ? '#ff4d4f'
                  : '#555555',
            }}
          />
          <span>
            {training.status === 'training'
              ? `Training (Epoch ${training.currentEpoch}/${training.totalEpochs})`
              : training.status === 'completed'
              ? 'Training Completed'
              : training.status === 'error'
              ? `Training Error${training.errorMessage ? `: ${training.errorMessage}` : ''}`
              : 'Engine Ready'}
          </span>
        </div>
      </div>

      {/* Center: Live Training Telemetry */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#888888' }}>
        <span>
          Loss: <strong style={{ color: '#ffffff', fontFamily: 'Consolas, monospace' }}>{lossFormatted}</strong>
        </span>
        <span>
          Accuracy: <strong style={{ color: '#4ade80', fontFamily: 'Consolas, monospace' }}>{accFormatted}</strong>
        </span>
        <span>
          Tensors: <strong style={{ color: '#cccccc', fontFamily: 'Consolas, monospace' }}>{training.numTensors}</strong>
        </span>
      </div>

      {/* Right: Environment & Security Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#666666', fontSize: '0.68rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Cpu size={12} color="#0078d4" />
          <span>TensorFlow.js ({(training.backend || 'cpu').toUpperCase()})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ShieldCheck size={12} color="#107c41" />
          <span>Local On-Device</span>
        </div>
      </div>
    </footer>
  );
};
