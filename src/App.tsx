import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Editor } from './ui/Editor';

export const App: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #0284c7',
            }}
          >
            M0: Blank Canvas Ready
          </span>
        </div>
      </header>

      {/* Main Workspace Canvas */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <ReactFlowProvider>
          <Editor />
        </ReactFlowProvider>
      </main>
    </div>
  );
};

export default App;
