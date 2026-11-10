import React, { useState } from 'react';
import { X, AlertCircle, AlertTriangle, CheckCircle, Table, ListOrdered, Code } from 'lucide-react';
import { useGraphStore } from '../core/store';
import { validate } from '../core/validator';
import { formatShape } from '../core/shapeEngine';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'validation' | 'shapes' | 'topo' | 'json'>('validation');
  const graph = useGraphStore((state) => state.graph);
  const validation = validate(graph);
  const jsonString = useGraphStore((state) => state.getCanonicalJson());

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(90vw, 800px)',
        height: '320px',
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: 8,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          height: 40,
          backgroundColor: '#1e293b',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
        }}
      >
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', marginRight: 8 }}>
            Debug Panel (D)
          </span>

          <button
            onClick={() => setActiveTab('validation')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: activeTab === 'validation' ? '#334155' : 'transparent',
              color: activeTab === 'validation' ? '#38bdf8' : '#94a3b8',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <AlertCircle size={13} />
            <span>Validation ({validation.problems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('shapes')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: activeTab === 'shapes' ? '#334155' : 'transparent',
              color: activeTab === 'shapes' ? '#38bdf8' : '#94a3b8',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <Table size={13} />
            <span>Shape Table</span>
          </button>

          <button
            onClick={() => setActiveTab('topo')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: activeTab === 'topo' ? '#334155' : 'transparent',
              color: activeTab === 'topo' ? '#38bdf8' : '#94a3b8',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <ListOrdered size={13} />
            <span>Execution Order</span>
          </button>

          <button
            onClick={() => setActiveTab('json')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: activeTab === 'json' ? '#334155' : 'transparent',
              color: activeTab === 'json' ? '#38bdf8' : '#94a3b8',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <Code size={13} />
            <span>JSON</span>
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: 4,
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', fontSize: '0.75rem' }}>
        {activeTab === 'validation' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {validation.problems.length === 0 ? (
              <div style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={14} />
                <span>No problems detected. Graph is healthy.</span>
              </div>
            ) : (
              validation.problems.map((p, idx) => {
                const isErr = p.severity === 'error';
                const isWarn = p.severity === 'warning';
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 6,
                      backgroundColor: isErr ? '#450a0a' : isWarn ? '#422006' : '#064e3b',
                      border: `1px solid ${isErr ? '#ef4444' : isWarn ? '#eab308' : '#22c55e'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isErr && <AlertCircle size={14} color="#f87171" />}
                      {isWarn && <AlertTriangle size={14} color="#facc15" />}
                      {!isErr && !isWarn && <CheckCircle size={14} color="#4ade80" />}
                      <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                        {p.nodeId ? `[Node ${p.nodeId}] ` : ''}
                        {p.message}
                      </span>
                    </div>
                    {p.fixHint && (
                      <div style={{ color: '#888888', fontSize: '0.7rem', paddingLeft: 20 }}>
                        Hint: {p.fixHint}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'shapes' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'monospace' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '6px' }}>Node ID</th>
                <th style={{ padding: '6px' }}>Type</th>
                <th style={{ padding: '6px' }}>Output Shape</th>
                <th style={{ padding: '6px' }}>Parameters</th>
                <th style={{ padding: '6px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {graph.nodes.map((n) => {
                const status = validation.nodeStatuses.get(n.id);
                const outShape = status?.outputShapes['out'] || status?.outputShapes['images'] || 'unknown';
                return (
                  <tr key={n.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '6px', color: '#38bdf8' }}>{n.id}</td>
                    <td style={{ padding: '6px', color: '#f1f5f9' }}>{n.type}</td>
                    <td style={{ padding: '6px', color: '#22c55e' }}>{formatShape(outShape)}</td>
                    <td style={{ padding: '6px', color: '#cbd5e1' }}>{(status?.paramCount || 0).toLocaleString()}</td>
                    <td style={{ padding: '6px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          borderRadius: 3,
                          fontSize: '0.68rem',
                          backgroundColor:
                            status?.status === 'ok'
                              ? 'rgba(16, 124, 65, 0.2)'
                              : status?.status === 'warning'
                              ? 'rgba(216, 59, 1, 0.2)'
                              : 'rgba(232, 17, 35, 0.2)',
                          color:
                            status?.status === 'ok'
                              ? '#107c41'
                              : status?.status === 'warning'
                              ? '#d83b01'
                              : '#f48771',
                          fontWeight: 600,
                        }}
                      >
                        {status?.status === 'ok' ? 'OK' : status?.status === 'warning' ? 'Warning' : 'Error'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {activeTab === 'topo' && (
          <div>
            <div style={{ color: '#94a3b8', marginBottom: 8 }}>
              Topological execution sequence (left-to-right forward pass):
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {validation.executionOrder.map((nodeId, idx) => (
                <div key={nodeId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      padding: '4px 10px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 4,
                      fontFamily: 'monospace',
                      color: '#38bdf8',
                    }}
                  >
                    {idx + 1}. {nodeId}
                  </div>
                  {idx < validation.executionOrder.length - 1 && <span style={{ color: '#64748b' }}>→</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'json' && (
          <pre
            style={{
              margin: 0,
              fontFamily: 'monospace',
              fontSize: '0.72rem',
              color: '#94a3b8',
              whiteSpace: 'pre-wrap',
            }}
          >
            {jsonString}
          </pre>
        )}
      </div>
    </div>
  );
};

