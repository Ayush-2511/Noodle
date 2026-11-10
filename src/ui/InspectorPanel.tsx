import React, { useState } from 'react';
import {
  Sliders,
  Code,
  Copy,
  Check,
  Trash2,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { useGraphStore } from '../core/store';
import { getNodeDefinition } from '../nodes/registry';

export const InspectorPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'properties' | 'json'>('properties');
  const [copied, setCopied] = useState(false);

  const graph = useGraphStore((state) => state.graph);
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const updateNodeParams = useGraphStore((state) => state.updateNodeParams);
  const removeNode = useGraphStore((state) => state.removeNode);
  const jsonString = useGraphStore((state) => state.getCanonicalJson());

  const selectedNode = graph.nodes.find((n) => n.id === selectedNodeId);
  const selectedDef = selectedNode ? getNodeDefinition(selectedNode.type) : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  };

  const handleParamChange = (key: string, value: any) => {
    if (selectedNode) {
      updateNodeParams(selectedNode.id, { [key]: value });
    }
  };

  return (
    <aside
      style={{
        width: '300px',
        backgroundColor: '#1e1e1e',
        borderLeft: '1px solid #2d2d2d',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 5,
        userSelect: 'none',
      }}
    >
      {/* Top Header Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#1f1f1f',
          borderBottom: '1px solid #2d2d2d',
          padding: '0 8px',
          height: '36px',
        }}
      >
        <button
          onClick={() => setActiveTab('properties')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            backgroundColor: activeTab === 'properties' ? '#252526' : 'transparent',
            color: activeTab === 'properties' ? '#ffffff' : '#888888',
            border: 'none',
            borderBottom: activeTab === 'properties' ? '2px solid #0078d4' : '2px solid transparent',
            fontSize: '0.74rem',
            fontWeight: activeTab === 'properties' ? 600 : 400,
            cursor: 'pointer',
            height: '100%',
          }}
        >
          <Sliders size={13} color={activeTab === 'properties' ? '#0078d4' : '#888888'} />
          <span>Properties</span>
        </button>

        <button
          onClick={() => setActiveTab('json')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            backgroundColor: activeTab === 'json' ? '#252526' : 'transparent',
            color: activeTab === 'json' ? '#ffffff' : '#888888',
            border: 'none',
            borderBottom: activeTab === 'json' ? '2px solid #0078d4' : '2px solid transparent',
            fontSize: '0.74rem',
            fontWeight: activeTab === 'json' ? 600 : 400,
            cursor: 'pointer',
            height: '100%',
          }}
        >
          <Code size={13} color={activeTab === 'json' ? '#0078d4' : '#888888'} />
          <span>Graph JSON</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'properties' ? (
          selectedNode && selectedDef ? (
            /* Selected Node Inspector */
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Node Title & Identity */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 10,
                  borderBottom: '1px solid #2d2d2d',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
                    {selectedDef.label}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#888888', marginTop: 2 }}>
                    ID: <strong style={{ color: '#0078d4', fontFamily: 'Consolas, monospace' }}>{selectedNode.id}</strong> • Group: {selectedDef.group}
                  </div>
                </div>

                <button
                  onClick={() => removeNode(selectedNode.id)}
                  title="Delete node from graph"
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#2a2020',
                    border: '1px solid #4a2828',
                    borderRadius: 4,
                    color: '#ff6b6b',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#5c1d1d')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2a2020')}
                >
                  <Trash2 size={11} />
                  <span>Delete</span>
                </button>
              </div>

              {/* Summary Description */}
              {selectedDef.description && (
                <div
                  style={{
                    padding: '8px 10px',
                    backgroundColor: '#181818',
                    border: '1px solid #2d2d2d',
                    borderRadius: 4,
                    fontSize: '0.7rem',
                    color: '#a6a6a6',
                    lineHeight: 1.4,
                  }}
                >
                  {selectedDef.description}
                </div>
              )}

              {/* Parameter Controls */}
              {selectedDef.paramFields && selectedDef.paramFields.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Parameters
                  </div>

                  {selectedDef.paramFields.map((field) => {
                    const val = selectedNode.params[field.key] ?? '';
                    return (
                      <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#cccccc' }}>
                          <span>{field.label}</span>
                          <span style={{ color: '#666666', fontFamily: 'Consolas, monospace', fontSize: '0.65rem' }}>
                            {field.key}
                          </span>
                        </div>

                        {field.type === 'select' ? (
                          <select
                            value={String(val)}
                            onChange={(e) => handleParamChange(field.key, e.target.value)}
                            style={{
                              backgroundColor: '#141414',
                              border: '1px solid #333333',
                              borderRadius: 4,
                              padding: '5px 8px',
                              color: '#ffffff',
                              fontSize: '0.74rem',
                              outline: 'none',
                            }}
                          >
                            {field.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : field.type === 'number' ? (
                          <input
                            type="number"
                            min={field.min}
                            max={field.max}
                            step={field.step || 1}
                            value={typeof val === 'number' ? val : Number(val) || 0}
                            onChange={(e) => handleParamChange(field.key, Number(e.target.value))}
                            style={{
                              backgroundColor: '#141414',
                              border: '1px solid #333333',
                              borderRadius: 4,
                              padding: '5px 8px',
                              color: '#ffffff',
                              fontSize: '0.74rem',
                              outline: 'none',
                            }}
                          />
                        ) : (
                          <input
                            type="text"
                            value={String(val)}
                            onChange={(e) => handleParamChange(field.key, e.target.value)}
                            style={{
                              backgroundColor: '#141414',
                              border: '1px solid #333333',
                              borderRadius: 4,
                              padding: '5px 8px',
                              color: '#ffffff',
                              fontSize: '0.74rem',
                              outline: 'none',
                            }}
                          />
                        )}

                        {field.help && (
                          <span style={{ fontSize: '0.64rem', color: '#666666' }}>{field.help}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Layer Stack info if builder */}
              {selectedNode.layers && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Layer Stack ({selectedNode.layers.length} layers)
                  </div>
                  <div style={{ backgroundColor: '#141414', border: '1px solid #2d2d2d', borderRadius: 4, padding: '6px' }}>
                    {selectedNode.layers.map((layer, idx) => (
                      <div
                        key={layer.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '3px 6px',
                          fontSize: '0.7rem',
                          color: '#b0b0b0',
                          borderBottom: idx < (selectedNode.layers?.length || 0) - 1 ? '1px solid #222222' : 'none',
                        }}
                      >
                        <span style={{ fontWeight: 500, color: '#ffffff' }}>{layer.type}</span>
                        <span style={{ fontFamily: 'Consolas, monospace', fontSize: '0.62rem', color: '#666666' }}>
                          {JSON.stringify(layer.params)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* No Node Selected -> Project Overview */
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>
                  Project Overview
                </div>
                <div style={{ fontSize: '0.7rem', color: '#888888', marginTop: 2 }}>
                  Noodle Deep Learning Pipeline
                </div>
              </div>

              {/* Topology Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ backgroundColor: '#141414', border: '1px solid #2d2d2d', padding: '8px 10px', borderRadius: 4 }}>
                  <div style={{ fontSize: '0.65rem', color: '#888888', textTransform: 'uppercase' }}>Nodes</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0078d4', marginTop: 2 }}>
                    {graph.nodes.length}
                  </div>
                </div>
                <div style={{ backgroundColor: '#141414', border: '1px solid #2d2d2d', padding: '8px 10px', borderRadius: 4 }}>
                  <div style={{ fontSize: '0.65rem', color: '#888888', textTransform: 'uppercase' }}>Connections</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#107c41', marginTop: 2 }}>
                    {graph.edges.length}
                  </div>
                </div>
              </div>

              {/* System Specifications */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Execution Environment
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: '#cccccc' }}>
                  <Cpu size={14} color="#0078d4" />
                  <span>Engine: <strong>TensorFlow.js (WebGL / CPU)</strong></span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: '#cccccc' }}>
                  <ShieldCheck size={14} color="#107c41" />
                  <span>Security: <strong>100% On-Device, Air-Gapped</strong></span>
                </div>
              </div>

              {/* Usage Hint */}
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: '#181818',
                  border: '1px solid #2d2d2d',
                  borderRadius: 4,
                  fontSize: '0.7rem',
                  color: '#888888',
                  lineHeight: 1.45,
                }}
              >
                Select any node on the canvas to configure its parameters, inspect tensor dimensions, or manage layer stacks.
              </div>
            </div>
          )
        ) : (
          /* Tab 2: Graph JSON Viewer */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                backgroundColor: '#1a1a1a',
                borderBottom: '1px solid #2d2d2d',
              }}
            >
              <span style={{ fontSize: '0.68rem', color: '#888888' }}>
                Pipeline Graph JSON
              </span>
              <button
                onClick={handleCopy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  backgroundColor: copied ? '#143820' : '#262626',
                  border: '1px solid #383838',
                  borderRadius: 3,
                  color: copied ? '#4ade80' : '#cccccc',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                }}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
              <pre
                style={{
                  margin: 0,
                  fontSize: '0.72rem',
                  lineHeight: 1.4,
                  color: '#9cdcfe',
                  fontFamily: 'Consolas, "Cascadia Code", monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {jsonString}
              </pre>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
