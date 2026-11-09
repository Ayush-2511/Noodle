import React, { useState, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Editor } from './ui/Editor';
import { NodePalette } from './ui/NodePalette';
import { JsonInspector } from './ui/JsonInspector';
import { DebugPanel } from './ui/DebugPanel';
import { useGraphStore } from './core/store';
import { RotateCcw, Sparkles, Bug } from 'lucide-react';

export const App: React.FC = () => {
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const resetGraph = useGraphStore((state) => state.resetGraph);
  const loadGraph = useGraphStore((state) => state.loadGraph);

  // Keyboard shortcut: 'D' to toggle Debug panel (Section 9.4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or select
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === 'd' || e.key === 'D') {
        setIsDebugOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLoadSample = () => {
    loadGraph({
      version: 1,
      nodes: [
        { id: 'n1', type: 'Input', params: { shape: '[B, 784]' }, position: { x: 80, y: 140 } },
        { id: 'n2', type: 'Linear', params: { out_features: 128 }, position: { x: 380, y: 140 } },
        { id: 'n3', type: 'Activation', params: { fn: 'relu' }, position: { x: 680, y: 140 } },
      ],
      edges: [
        { from: 'n1.out', to: 'n2.in' },
        { from: 'n2.out', to: 'n3.in' },
      ],
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', backgroundColor: '#0f172a' }}>
      {/* Top Application Bar */}
      <header
        style={{
          height: '48px',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.25rem' }}>🍜</span>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '0.02em', color: '#f8fafc' }}>
            Noodle
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Node-Based Deep Learning Builder
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsDebugOpen((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              backgroundColor: isDebugOpen ? '#334155' : '#1e293b',
              border: isDebugOpen ? '1px solid #38bdf8' : '1px solid #334155',
              borderRadius: '6px',
              color: isDebugOpen ? '#38bdf8' : '#cbd5e1',
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Bug size={13} />
            <span>Debug Panel (D)</span>
          </button>

          <button
            onClick={handleLoadSample}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#cbd5e1',
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#38bdf8')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#334155')}
          >
            <Sparkles size={13} color="#38bdf8" />
            <span>Load Sample</span>
          </button>

          <button
            onClick={resetGraph}
            title="Clear canvas"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#94a3b8',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            <RotateCcw size={13} />
            <span>Clear</span>
          </button>

          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: '#1e293b',
              color: '#22c55e',
              border: '1px solid #16a34a',
            }}
          >
            M2: Shape Engine & Wire Badges
          </span>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        <NodePalette />
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <ReactFlowProvider>
            <Editor />
          </ReactFlowProvider>
          <DebugPanel isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} />
        </main>
        <JsonInspector />
      </div>
    </div>
  );
};

export default App;
