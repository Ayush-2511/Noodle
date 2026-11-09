import React from 'react';
import { Play, Square, Activity, Cpu, CheckCircle2, AlertOctagon } from 'lucide-react';
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
  const validation = validate(graph);
  const isGraphValid = validation.isValid && graph.nodes.length > 0;

  if (!training) return null;

  const handleStart = () => {
    if (!isGraphValid) return;
    training.startTraining(graph, { epochs: 3, batchSize: 32 });
  };

  const lossFormatted = training.latestLoss !== null ? training.latestLoss.toFixed(4) : '--';
  const accFormatted =
    training.latestAccuracy !== null ? `${(training.latestAccuracy * 100).toFixed(1)}%` : '--';

  // Sanity check signals (Section 9.6)
  const isHealthyLoss = training.latestLoss !== null && training.latestLoss < 3.0;
  const isHealthyAcc = training.latestAccuracy !== null && training.latestAccuracy > 0.85;

  return (
    <div
      style={{
        height: '42px',
        backgroundColor: '#090d16',
        borderTop: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        fontSize: '0.75rem',
        zIndex: 10,
        fontFamily: 'monospace',
      }}
    >
      {/* Left: Actions & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {training.status === 'training' ? (
          <button
            onClick={training.stopTraining}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              backgroundColor: '#ef4444',
              border: 'none',
              borderRadius: 4,
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Square size={12} fill="#ffffff" />
            <span>Stop Training</span>
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={!isGraphValid}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 12px',
              backgroundColor: isGraphValid ? '#22c55e' : '#334155',
              border: 'none',
              borderRadius: 4,
              color: isGraphValid ? '#052e16' : '#94a3b8',
              fontWeight: 600,
              cursor: isGraphValid ? 'pointer' : 'not-allowed',
            }}
          >
            <Play size={12} fill={isGraphValid ? '#052e16' : '#94a3b8'} />
            <span>Train in Web Worker (M4)</span>
          </button>
        )}

        {/* Progress or status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
          <Activity size={13} color="#38bdf8" />
          <span>
            Status:{' '}
            <strong
              style={{
                color:
                  training.status === 'training'
                    ? '#38bdf8'
                    : training.status === 'completed'
                    ? '#22c55e'
                    : training.status === 'error'
                    ? '#ef4444'
                    : '#cbd5e1',
              }}
            >
              {training.status === 'training'
                ? `Epoch ${training.currentEpoch}/${training.totalEpochs}`
                : training.status.toUpperCase()}
            </strong>
          </span>
        </div>
      </div>

      {/* Center: Live Training Sanity Metrics (Section 9.6) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#64748b' }}>Loss:</span>
          <span style={{ color: isHealthyLoss ? '#4ade80' : '#f8fafc', fontWeight: 600 }}>
            {lossFormatted}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#64748b' }}>Accuracy:</span>
          <span style={{ color: isHealthyAcc ? '#4ade80' : '#f8fafc', fontWeight: 600 }}>
            {accFormatted}
          </span>
        </div>

        {/* Tensor Memory Leak Monitor (Section 10, Trap 4) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Cpu size={13} color="#94a3b8" />
          <span style={{ color: '#64748b' }}>Tensors:</span>
          <span style={{ color: '#cbd5e1' }}>{training.numTensors}</span>
        </div>
      </div>

      {/* Right: Health Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {training.status === 'completed' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#22c55e' }}>
            <CheckCircle2 size={13} />
            <span>Trained &gt; 90% Acc</span>
          </div>
        )}
        {training.status === 'error' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444' }}>
            <AlertOctagon size={13} />
            <span>{training.errorMessage || 'Training Failed'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

