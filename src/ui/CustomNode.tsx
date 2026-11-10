import React, { useCallback, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Trash2, Play, Square, Info, BarChart2, Loader2, Check } from 'lucide-react';
import { getNodeDefinition } from '../nodes/registry';
import { useGraphStore } from '../core/store';
import { formatShape, TensorShape } from '../core/shapeEngine';
import { useTrainingSafe } from '../backends/tfjs/TrainingContext';
import { MetricsChart } from './MetricsChart';
import { LayerStack } from './LayerStack';
import { PredictCanvas } from './PredictCanvas';

export interface CustomNodeData {
  type: string;
  params: Record<string, any>;
  status?: 'ok' | 'warning' | 'error';
  outputShapes?: Record<string, TensorShape>;
  paramCount?: number;
  problemMessage?: string;
  fixHint?: string;
  [key: string]: unknown;
}

export const CustomNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as CustomNodeData;
  const def = getNodeDefinition(nodeData.type);
  const graph = useGraphStore((state) => state.graph);
  const updateNodeParams = useGraphStore((state) => state.updateNodeParams);
  const removeNode = useGraphStore((state) => state.removeNode);
  const training = useTrainingSafe();
  const [showInfo, setShowInfo] = useState(false);
  const [isEvaluatingLocal, setIsEvaluatingLocal] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [lastEvalTime, setLastEvalTime] = useState<string | null>(null);

  const graphNode = graph.nodes.find((n) => n.id === id);

  const handleParamChange = useCallback(
    (key: string, value: any) => {
      updateNodeParams(id, { [key]: value });
    },
    [id, updateNodeParams]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      removeNode(id);
    },
    [id, removeNode]
  );

  // Status dot & border color determination
  const status = nodeData.status || 'ok';
  let statusDot = '🟢';
  let borderColor = '#334155';
  let glowShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.3)';

  if (status === 'error') {
    statusDot = '🔴';
    borderColor = '#ef4444';
  } else if (status === 'warning') {
    statusDot = '🟡';
    borderColor = '#eab308';
  }

  // Active / Selected state visual priority
  if (selected) {
    borderColor = '#38bdf8'; // Bright Cyan
    glowShadow = '0 0 0 3px rgba(56, 189, 248, 0.45), 0 10px 25px -3px rgba(0, 0, 0, 0.6)';
  }

  // Primary output shape
  const outShape = nodeData.outputShapes?.['out'] || nodeData.outputShapes?.['images'] || nodeData.outputShapes?.['data'] || 'unknown';
  const formattedOutShape = formatShape(outShape);
  const paramCount = nodeData.paramCount || 0;

  const isBuilder = nodeData.type === 'FeatureExtractor' || nodeData.type === 'Classifier';
  const nodeWidth = isBuilder ? 340 : nodeData.type === 'Predict' ? 310 : (nodeData.type === 'LoadDataset' || nodeData.type === 'TrainTestSplit') ? 250 : 230;

  return (
    <div
      style={{
        width: nodeWidth,
        backgroundColor: '#1e293b',
        borderRadius: 8,
        border: `2px solid ${borderColor}`,
        boxShadow: glowShadow,
        color: '#f8fafc',
        fontSize: '0.8rem',
        overflow: 'visible', // Ensure handles and glow rings are fully visible
        position: 'relative',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      {/* Node Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 12px',
          backgroundColor: selected ? '#1e293b' : '#0f172a',
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
          borderBottom: selected ? '1px solid #38bdf8' : '1px solid #334155',
          transition: 'background-color 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.7rem' }}>{statusDot}</span>
          <span style={{ fontWeight: 600, color: selected ? '#38bdf8' : '#f1f5f9' }}>
            {def.label}
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              backgroundColor: '#334155',
              padding: '1px 5px',
              borderRadius: 4,
              color: '#94a3b8',
              fontFamily: 'monospace',
            }}
          >
            {id}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {def.description && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowInfo((prev) => !prev);
              }}
              title="Learn about this layer (concept & parameters)"
              style={{
                background: 'transparent',
                border: 'none',
                color: showInfo ? '#38bdf8' : '#64748b',
                cursor: 'pointer',
                padding: 2,
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
              onMouseLeave={(e) => {
                if (!showInfo) e.currentTarget.style.color = '#64748b';
              }}
            >
              <Info size={13} />
            </button>
          )}

          <button
            onClick={handleDelete}
            title="Delete Node"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Explanatory Concept Card (Beginner UX / Proposal 2) */}
      {showInfo && def.description && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#090d16',
            borderBottom: '1px solid #1e293b',
            borderLeft: '3px solid #38bdf8',
            fontSize: '0.69rem',
            lineHeight: 1.4,
            color: '#cbd5e1',
          }}
        >
          <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>💡</span>
            <span>{def.summary || def.label}</span>
          </div>
          <div style={{ color: '#94a3b8' }}>
            {def.description}
          </div>
        </div>
      )}

      {/* Sockets and Body */}
      <div style={{ padding: '10px 12px' }}>
        {/* Input Sockets */}
        {def.inputs.map((input) => (
          <div
            key={input.id}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <Handle
              type="target"
              position={Position.Left}
              id={input.id}
              style={{
                left: -19, // Centers 14px handle nicely over node border
              }}
            />
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', marginLeft: 2 }}>
              {input.label}
            </span>
          </div>
        ))}

        {/* Output Sockets */}
        {def.outputs.map((output) => (
          <div
            key={output.id}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', marginRight: 2 }}>
              {output.label}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={output.id}
              style={{
                right: -19, // Centers 14px handle nicely over node border
              }}
            />
          </div>
        ))}

        {/* LoadDataset Visual Preview */}
        {nodeData.type === 'LoadDataset' && (
          <div style={{ marginTop: 6, padding: '6px 8px', backgroundColor: '#0f172a', borderRadius: 4, border: '1px solid #334155' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 6 }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <div key={num} style={{ aspectRatio: '1', backgroundColor: '#1e293b', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  {num}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94a3b8' }}>
              <span>60,000 samples</span>
              <span>28×28 grayscale</span>
            </div>
          </div>
        )}

        {/* TrainTestSplit Visual Bar */}
        {nodeData.type === 'TrainTestSplit' && (
          <div style={{ marginTop: 6, padding: '6px 8px', backgroundColor: '#0f172a', borderRadius: 4, border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem' }}>
              <span style={{ color: '#22c55e' }}>Train: {nodeData.params.train_pct ?? 80}% ({Math.round(60000 * ((Number(nodeData.params.train_pct) || 80) / 100)).toLocaleString()})</span>
              <span style={{ color: '#38bdf8' }}>Test: {100 - (Number(nodeData.params.train_pct) || 80)}% ({Math.round(60000 * (1 - (Number(nodeData.params.train_pct) || 80) / 100)).toLocaleString()})</span>
            </div>
            <div style={{ height: 6, width: '100%', backgroundColor: '#1e293b', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${nodeData.params.train_pct ?? 80}%`, backgroundColor: '#22c55e' }} />
              <div style={{ width: `${100 - (Number(nodeData.params.train_pct) || 80)}%`, backgroundColor: '#38bdf8' }} />
            </div>
          </div>
        )}

        {/* Builder Node Layer Stack Component */}
        {isBuilder && (
          <LayerStack
            nodeId={id}
            builderType={nodeData.type as any}
            layers={graphNode?.layers || []}
            inputShape={nodeData.outputShapes?.['in'] || (nodeData.type === 'FeatureExtractor' ? ['B', 1, 28, 28] : ['B', 784])}
          />
        )}

        {/* Predict Canvas Hero Node */}
        {nodeData.type === 'Predict' && (
          <PredictCanvas nodeId={id} />
        )}

        {/* Evaluate Node UI */}
        {nodeData.type === 'Evaluate' && (
          <div style={{ marginTop: 6, padding: '6px 8px', backgroundColor: '#0f172a', borderRadius: 4, border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
              <span style={{ color: '#94a3b8' }}>Test Accuracy:</span>
              <strong style={{ color: '#22c55e' }}>
                {training?.evalResult
                  ? `${(training.evalResult.accuracy * 100).toFixed(1)}%`
                  : training?.latestAccuracy !== null && training?.latestAccuracy !== undefined
                  ? `${(training.latestAccuracy * 100).toFixed(1)}%`
                  : '—'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
              <span style={{ color: '#94a3b8' }}>Test Loss:</span>
              <strong style={{ color: '#f59e0b' }}>
                {training?.evalResult
                  ? training.evalResult.loss.toFixed(3)
                  : training?.latestLoss !== null && training?.latestLoss !== undefined
                  ? training.latestLoss.toFixed(3)
                  : '—'}
              </strong>
            </div>

            {/* Test Split Telemetry & Status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.62rem',
                color: '#64748b',
                fontFamily: 'monospace',
                paddingTop: 2,
                borderTop: '1px dashed #1e293b',
              }}
            >
              <span>
                {training?.evalResult?.sampleCount
                  ? `${training.evalResult.sampleCount} test samples`
                  : 'Held-out test split'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                {isEvaluatingLocal || training?.isEvaluating ? (
                  <>
                    <Loader2 size={10} style={{ color: '#38bdf8', animation: 'spin 1s linear infinite' }} />
                    <span style={{ color: '#38bdf8' }}>Evaluating...</span>
                  </>
                ) : lastEvalTime || training?.evalResult?.evaluatedAt ? (
                  <>
                    <Check size={10} style={{ color: '#22c55e' }} />
                    <span style={{ color: '#22c55e' }}>{lastEvalTime || training?.evalResult?.evaluatedAt}</span>
                  </>
                ) : (
                  <span>Ready</span>
                )}
              </span>
            </div>

            {/* Error Message if Evaluation Fails */}
            {evalError && (
              <div
                style={{
                  padding: '4px 6px',
                  backgroundColor: '#450a0a',
                  border: '1px solid #b91c1c',
                  borderRadius: 4,
                  color: '#fca5a5',
                  fontSize: '0.62rem',
                }}
              >
                ⚠️ {evalError}
              </div>
            )}

            <button
              disabled={isEvaluatingLocal || training?.isEvaluating}
              onClick={async (e) => {
                e.stopPropagation();
                if (!training) return;
                setIsEvaluatingLocal(true);
                setEvalError(null);
                try {
                  const res = await training.runEvaluation(graph);
                  setLastEvalTime(res.evaluatedAt || new Date().toLocaleTimeString());
                } catch (err: any) {
                  console.error('Real evaluation failed:', err);
                  setEvalError(err?.message || 'Evaluation failed. Make sure model is connected.');
                } finally {
                  setIsEvaluatingLocal(false);
                }
              }}
              style={{
                width: '100%',
                padding: '5px',
                backgroundColor: '#1e293b',
                border: '1px solid #38bdf8',
                borderRadius: 4,
                color: '#38bdf8',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: (isEvaluatingLocal || training?.isEvaluating) ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                opacity: (isEvaluatingLocal || training?.isEvaluating) ? 0.6 : 1,
              }}
            >
              {isEvaluatingLocal || training?.isEvaluating ? (
                <>
                  <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Evaluating Model...</span>
                </>
              ) : (
                <>
                  <BarChart2 size={12} />
                  <span>
                    {(training?.evalResult || lastEvalTime)
                      ? 'Re-run Evaluation'
                      : 'Run Evaluation'}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Parameter Fields */}
        {def.paramFields.length > 0 && (
          <div
            style={{
              marginTop: 6,
              paddingTop: 8,
              borderTop: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {def.paramFields.map((field) => {
              const currentValue = nodeData.params[field.key] ?? def.defaultParams[field.key];

              if (field.type === 'number') {
                return (
                  <div
                    key={field.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <label
                      title={field.help}
                      style={{
                        fontSize: '0.72rem',
                        color: '#cbd5e1',
                        cursor: field.help ? 'help' : 'default',
                        borderBottom: field.help ? '1px dotted #64748b' : 'none',
                      }}
                    >
                      {field.label}:
                    </label>
                    <input
                      type="number"
                      value={currentValue ?? ''}
                      min={field.min}
                      max={field.max}
                      step={field.step ?? 1}
                      onChange={(e) =>
                        handleParamChange(field.key, Number(e.target.value))
                      }
                      style={{
                        width: '80px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #475569',
                        borderRadius: 4,
                        color: '#f8fafc',
                        padding: '3px 6px',
                        fontSize: '0.75rem',
                        textAlign: 'right',
                      }}
                    />
                  </div>
                );
              }

              if (field.type === 'select') {
                return (
                  <div
                    key={field.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <label
                      title={field.help}
                      style={{
                        fontSize: '0.72rem',
                        color: '#cbd5e1',
                        cursor: field.help ? 'help' : 'default',
                        borderBottom: field.help ? '1px dotted #64748b' : 'none',
                      }}
                    >
                      {field.label}:
                    </label>
                    <select
                      value={currentValue ?? ''}
                      onChange={(e) => handleParamChange(field.key, e.target.value)}
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #475569',
                        borderRadius: 4,
                        color: '#f8fafc',
                        padding: '3px 6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <div
                  key={field.key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  <label
                    title={field.help}
                    style={{
                      fontSize: '0.72rem',
                      color: '#cbd5e1',
                      cursor: field.help ? 'help' : 'default',
                      borderBottom: field.help ? '1px dotted #64748b' : 'none',
                    }}
                  >
                    {field.label}:
                  </label>
                  <input
                    type="text"
                    value={currentValue ?? ''}
                    placeholder={field.placeholder}
                    onChange={(e) => handleParamChange(field.key, e.target.value)}
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: 4,
                      color: '#f8fafc',
                      padding: '3px 6px',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Node Info Strip (Section 9.3) */}
        {!isBuilder && nodeData.type !== 'Predict' && (
          <div
            style={{
              marginTop: 8,
              paddingTop: 6,
              borderTop: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.68rem',
              color: '#94a3b8',
              fontFamily: 'monospace',
            }}
          >
            <span>out: <strong style={{ color: formattedOutShape === 'unknown' ? '#64748b' : '#38bdf8' }}>{formattedOutShape}</strong></span>
            <span>params: <strong style={{ color: '#cbd5e1' }}>{paramCount.toLocaleString()}</strong></span>
          </div>
        )}

        {/* Train Node Interactive Controls (Milestone 5) */}
        {nodeData.type === 'Train' && training && (
          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {training.status === 'training' ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  training.stopTraining();
                }}
                style={{
                  width: '100%',
                  padding: '6px',
                  backgroundColor: '#ef4444',
                  border: 'none',
                  borderRadius: 4,
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Square size={12} fill="#ffffff" />
                <span>Stop Training</span>
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  training.startTraining(graph, {
                    epochs: Number(nodeData.params.epochs) || 3,
                    batchSize: Number(nodeData.params.batch_size) || 32,
                  });
                }}
                style={{
                  width: '100%',
                  padding: '6px',
                  backgroundColor: '#22c55e',
                  border: 'none',
                  borderRadius: 4,
                  color: '#052e16',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Play size={12} fill="#052e16" />
                <span>Run Training Loop</span>
              </button>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.68rem',
                color: '#94a3b8',
                fontFamily: 'monospace',
              }}
            >
              <span>Status: <strong style={{ color: training.status === 'training' ? '#38bdf8' : training.status === 'completed' ? '#22c55e' : training.status === 'error' ? '#ef4444' : '#cbd5e1' }}>{training.status.toUpperCase()}</strong></span>
              {training.status === 'training' && <span>Ep {training.currentEpoch}/{training.totalEpochs}</span>}
            </div>
          </div>
        )}

        {/* Metrics Telemetry Chart (Milestone 5) */}
        {nodeData.type === 'Metrics' && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #334155' }}>
            <MetricsChart history={training?.history || []} />
          </div>
        )}

        {/* Problem Error / Warning Message */}
        {nodeData.problemMessage && (
          <div
            style={{
              marginTop: 6,
              padding: '6px 8px',
              borderRadius: 4,
              backgroundColor: status === 'error' ? '#450a0a' : '#422006',
              border: `1px solid ${status === 'error' ? '#b91c1c' : '#a16207'}`,
              color: status === 'error' ? '#fca5a5' : '#fef08a',
              fontSize: '0.68rem',
              lineHeight: 1.35,
            }}
          >
            <div style={{ fontWeight: 600 }}>{nodeData.problemMessage}</div>
            {nodeData.fixHint && (
              <div
                style={{
                  marginTop: 4,
                  paddingTop: 4,
                  borderTop: `1px dashed ${status === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                  color: status === 'error' ? '#fed7aa' : '#fef9c3',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 4,
                }}
              >
                <span style={{ fontWeight: 700, flexShrink: 0 }}>💡 Fix:</span>
                <span>{nodeData.fixHint}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
