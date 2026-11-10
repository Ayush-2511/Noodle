import React, { useState, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Editor } from './ui/Editor';
import { NodePalette } from './ui/NodePalette';
import { JsonInspector } from './ui/JsonInspector';
import { DebugPanel } from './ui/DebugPanel';
import { TrainingPanel } from './ui/TrainingPanel';
import { TrainingProvider, useTraining } from './backends/tfjs/TrainingContext';
import { useGraphStore } from './core/store';
import { RotateCcw, Sparkles, Bug, PlayCircle } from 'lucide-react';

const MainApp: React.FC = () => {
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const resetGraph = useGraphStore((state) => state.resetGraph);
  const loadGraph = useGraphStore((state) => state.loadGraph);
  const training = useTraining();

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

  const handleLoadMlpSample = () => {
    loadGraph({
      version: 1,
      nodes: [
        { id: 'n1', type: 'Dataset', params: { name: 'mnist' }, position: { x: 80, y: 140 } },
        { id: 'n2', type: 'Flatten', params: {}, position: { x: 360, y: 140 } },
        { id: 'n3', type: 'Linear', params: { out_features: 128 }, position: { x: 640, y: 140 } },
        { id: 'n4', type: 'Activation', params: { fn: 'relu' }, position: { x: 920, y: 140 } },
        { id: 'n5', type: 'Linear', params: { out_features: 10 }, position: { x: 1200, y: 140 } },
        { id: 'n6', type: 'Loss', params: { fn: 'cross_entropy' }, position: { x: 1480, y: 140 } },
      ],
      edges: [
        { from: 'n1.images', to: 'n2.in' },
        { from: 'n2.out', to: 'n3.in' },
        { from: 'n3.out', to: 'n4.in' },
        { from: 'n4.out', to: 'n5.in' },
        { from: 'n5.out', to: 'n6.logits' },
        { from: 'n1.labels', to: 'n6.target' },
      ],
    });
  };

  const handleLoadCnnSample = () => {
    loadGraph({
      version: 1,
      nodes: [
        { id: 'n1', type: 'Dataset', params: { name: 'mnist' }, position: { x: 40, y: 120 } },
        { id: 'n2', type: 'Conv2D', params: { out_channels: 8, kernel: 3, padding: 1, stride: 1 }, position: { x: 310, y: 120 } },
        { id: 'n3', type: 'Activation', params: { fn: 'relu' }, position: { x: 580, y: 120 } },
        { id: 'n4', type: 'MaxPool2D', params: { kernel: 2, stride: 2 }, position: { x: 850, y: 120 } },
        { id: 'n5', type: 'Conv2D', params: { out_channels: 16, kernel: 3, padding: 1, stride: 1 }, position: { x: 1120, y: 120 } },
        { id: 'n6', type: 'Activation', params: { fn: 'relu' }, position: { x: 1390, y: 120 } },
        { id: 'n7', type: 'MaxPool2D', params: { kernel: 2, stride: 2 }, position: { x: 1660, y: 120 } },
        { id: 'n8', type: 'Flatten', params: {}, position: { x: 1930, y: 120 } },
        { id: 'n9', type: 'Linear', params: { out_features: 10 }, position: { x: 2200, y: 120 } },
        { id: 'n10', type: 'Loss', params: { fn: 'cross_entropy' }, position: { x: 2470, y: 120 } },
      ],
      edges: [
        { from: 'n1.images', to: 'n2.in' },
        { from: 'n2.out', to: 'n3.in' },
        { from: 'n3.out', to: 'n4.in' },
        { from: 'n4.out', to: 'n5.in' },
        { from: 'n5.out', to: 'n6.in' },
        { from: 'n6.out', to: 'n7.in' },
        { from: 'n7.out', to: 'n8.in' },
        { from: 'n8.out', to: 'n9.in' },
        { from: 'n9.out', to: 'n10.logits' },
        { from: 'n1.labels', to: 'n10.target' },
      ],
    });
  };

  const handleLoadResidualSample = () => {
    loadGraph({
      version: 1,
      nodes: [
        { id: 'n1', type: 'Dataset', params: { name: 'mnist' }, position: { x: 40, y: 140 } },
        { id: 'n2', type: 'Conv2D', params: { out_channels: 8, kernel: 3, padding: 1, stride: 1 }, position: { x: 300, y: 140 } },
        { id: 'n3', type: 'Activation', params: { fn: 'relu' }, position: { x: 560, y: 80 } },
        { id: 'n4', type: 'Conv2D', params: { out_channels: 8, kernel: 3, padding: 1, stride: 1 }, position: { x: 820, y: 80 } },
        { id: 'n5', type: 'Add', params: {}, position: { x: 1080, y: 140 } },
        { id: 'n6', type: 'Activation', params: { fn: 'relu' }, position: { x: 1340, y: 140 } },
        { id: 'n7', type: 'Flatten', params: {}, position: { x: 1600, y: 140 } },
        { id: 'n8', type: 'Linear', params: { out_features: 10 }, position: { x: 1860, y: 140 } },
        { id: 'n9', type: 'Loss', params: { fn: 'cross_entropy' }, position: { x: 2120, y: 140 } },
      ],
      edges: [
        { from: 'n1.images', to: 'n2.in' },
        { from: 'n2.out', to: 'n3.in' },
        { from: 'n3.out', to: 'n4.in' },
        { from: 'n4.out', to: 'n5.a' },
        { from: 'n2.out', to: 'n5.b' },
        { from: 'n5.out', to: 'n6.in' },
        { from: 'n6.out', to: 'n7.in' },
        { from: 'n7.out', to: 'n8.in' },
        { from: 'n8.out', to: 'n9.logits' },
        { from: 'n1.labels', to: 'n9.target' },
      ],
    });
  };

  const handleLoadConcatSample = () => {
    loadGraph({
      version: 1,
      nodes: [
        { id: 'n1', type: 'Dataset', params: { name: 'mnist' }, position: { x: 40, y: 140 } },
        { id: 'n2', type: 'Conv2D', params: { out_channels: 8, kernel: 3, padding: 1, stride: 1 }, position: { x: 300, y: 60 } },
        { id: 'n3', type: 'Activation', params: { fn: 'relu' }, position: { x: 560, y: 60 } },
        { id: 'n4', type: 'Conv2D', params: { out_channels: 16, kernel: 3, padding: 1, stride: 1 }, position: { x: 300, y: 260 } },
        { id: 'n5', type: 'Activation', params: { fn: 'relu' }, position: { x: 560, y: 260 } },
        { id: 'n6', type: 'Concat', params: { axis: 1 }, position: { x: 820, y: 140 } },
        { id: 'n7', type: 'Flatten', params: {}, position: { x: 1080, y: 140 } },
        { id: 'n8', type: 'Linear', params: { out_features: 10 }, position: { x: 1340, y: 140 } },
        { id: 'n9', type: 'Loss', params: { fn: 'cross_entropy' }, position: { x: 1600, y: 140 } },
      ],
      edges: [
        { from: 'n1.images', to: 'n2.in' },
        { from: 'n2.out', to: 'n3.in' },
        { from: 'n1.images', to: 'n4.in' },
        { from: 'n4.out', to: 'n5.in' },
        { from: 'n3.out', to: 'n6.a' },
        { from: 'n5.out', to: 'n6.b' },
        { from: 'n6.out', to: 'n7.in' },
        { from: 'n7.out', to: 'n8.in' },
        { from: 'n8.out', to: 'n9.logits' },
        { from: 'n1.labels', to: 'n9.target' },
      ],
    });
  };

  const handleLoadFullPipeline = () => {
    loadGraph({
      version: 1,
      nodes: [
        { id: 'n1', type: 'Dataset', params: { name: 'mnist' }, position: { x: 40, y: 100 } },
        { id: 'n2', type: 'Flatten', params: {}, position: { x: 300, y: 100 } },
        { id: 'n3', type: 'Linear', params: { out_features: 128 }, position: { x: 560, y: 100 } },
        { id: 'n4', type: 'Activation', params: { fn: 'relu' }, position: { x: 820, y: 100 } },
        { id: 'n5', type: 'Linear', params: { out_features: 10 }, position: { x: 1080, y: 100 } },
        { id: 'n6', type: 'Loss', params: { fn: 'cross_entropy' }, position: { x: 1340, y: 100 } },
        { id: 'n7', type: 'Optimizer', params: { algo: 'adam', lr: 0.005 }, position: { x: 1340, y: 340 } },
        { id: 'n8', type: 'Train', params: { epochs: 3, batch_size: 32 }, position: { x: 1610, y: 200 } },
        { id: 'n9', type: 'Metrics', params: {}, position: { x: 1880, y: 200 } },
      ],
      edges: [
        { from: 'n1.images', to: 'n2.in' },
        { from: 'n2.out', to: 'n3.in' },
        { from: 'n3.out', to: 'n4.in' },
        { from: 'n4.out', to: 'n5.in' },
        { from: 'n5.out', to: 'n6.logits' },
        { from: 'n1.labels', to: 'n6.target' },
        { from: 'n6.out', to: 'n8.loss' },
        { from: 'n7.opt', to: 'n8.opt' },
        { from: 'n8.metrics', to: 'n9.metrics' },
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
            onClick={handleLoadFullPipeline}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              backgroundColor: '#1e293b',
              border: '1px solid #a855f7',
              borderRadius: '6px',
              color: '#d8b4fe',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3b0764')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
          >
            <PlayCircle size={13} color="#c084fc" />
            <span>Full Pipeline (M5)</span>
          </button>

          <button
            onClick={handleLoadMlpSample}
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
            <span>Load T1 (MLP)</span>
          </button>

          <button
            onClick={handleLoadCnnSample}
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
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#22c55e')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#334155')}
          >
            <Sparkles size={13} color="#22c55e" />
            <span>Load T2 (CNN)</span>
          </button>

          <button
            onClick={handleLoadResidualSample}
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
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#f59e0b')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#334155')}
          >
            <Sparkles size={13} color="#f59e0b" />
            <span>Load T3 (Residual)</span>
          </button>

          <button
            onClick={handleLoadConcatSample}
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
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#06b6d4')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#334155')}
          >
            <Sparkles size={13} color="#06b6d4" />
            <span>Load T4 (Concat)</span>
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
              color: '#a855f7',
              border: '1px solid #7e22ce',
            }}
          >
            M7: Multi-Branch & Merge
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

      {/* Live Training Sanity Panel (Section 9.6) */}
      <TrainingPanel training={training} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <TrainingProvider>
      <MainApp />
    </TrainingProvider>
  );
};

export default App;
