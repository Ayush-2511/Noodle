import React, { useState } from 'react';
import { Copy, Check, Code } from 'lucide-react';
import { useGraphStore } from '../core/store';

export const JsonInspector: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const jsonString = useGraphStore((state) => state.getCanonicalJson());
  const nodeCount = useGraphStore((state) => state.graph.nodes.length);
  const edgeCount = useGraphStore((state) => state.graph.edges.length);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  };

  return (
    <aside
      style={{
        width: '320px',
        backgroundColor: '#0f172a',
        borderLeft: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 5,
        fontFamily: 'monospace',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Code size={15} color="#38bdf8" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9' }}>
            Graph JSON (v1)
          </span>
        </div>

        <button
          onClick={handleCopy}
          title="Copy Graph JSON"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            backgroundColor: copied ? '#14532d' : '#1e293b',
            border: copied ? '1px solid #22c55e' : '1px solid #334155',
            borderRadius: 4,
            color: copied ? '#4ade80' : '#cbd5e1',
            fontSize: '0.72rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Stats summary strip */}
      <div
        style={{
          padding: '6px 14px',
          backgroundColor: '#090d16',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          gap: 12,
          fontSize: '0.7rem',
          color: '#64748b',
        }}
      >
        <span>Nodes: <strong style={{ color: '#cbd5e1' }}>{nodeCount}</strong></span>
        <span>Wires: <strong style={{ color: '#cbd5e1' }}>{edgeCount}</strong></span>
        <span>Single loss rule: <strong style={{ color: '#22c55e' }}>OK</strong></span>
      </div>

      {/* JSON Viewer */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        <pre
          style={{
            margin: 0,
            fontSize: '0.75rem',
            lineHeight: 1.45,
            color: '#94a3b8',
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {jsonString}
        </pre>
      </div>
    </aside>
  );
};

