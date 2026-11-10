import React, { useState, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Editor } from './ui/Editor';
import { NodePalette } from './ui/NodePalette';
import { JsonInspector } from './ui/JsonInspector';
import { DebugPanel } from './ui/DebugPanel';
import { TrainingPanel } from './ui/TrainingPanel';
import { GlossaryPanel } from './ui/GlossaryPanel';
import { TemplateGalleryModal, TemplateItem } from './ui/TemplateGalleryModal';
import { OnboardingTour } from './ui/OnboardingTour';
import { TrainingProvider, useTraining } from './backends/tfjs/TrainingContext';
import { useGraphStore } from './core/store';
import { RotateCcw, Sparkles, Bug, BookOpen, HelpCircle } from 'lucide-react';

const MainApp: React.FC = () => {
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  const resetGraph = useGraphStore((state) => state.resetGraph);
  const loadGraph = useGraphStore((state) => state.loadGraph);
  const training = useTraining();

  // Check first-time visitor onboarding
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('noodle_onboarded');
    if (!hasSeenTour) {
      setIsTourOpen(true);
    }
  }, []);

  // Global Keyboard shortcuts: 'D' for debug, 'G' for glossary, 'T' for templates, '?' for guide
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
      } else if (e.key === 'g' || e.key === 'G') {
        setIsGlossaryOpen((prev) => !prev);
      } else if (e.key === 't' || e.key === 'T') {
        setIsGalleryOpen((prev) => !prev);
      } else if (e.key === '?') {
        setIsTourOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectTemplate = (template: TemplateItem) => {
    loadGraph(template.graph);
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Templates & Guided Labs Gallery (Proposal 1) */}
          <button
            onClick={() => setIsGalleryOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              backgroundColor: '#1e1b4b',
              border: '1px solid #6366f1',
              borderRadius: '6px',
              color: '#c7d2fe',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#312e81';
              e.currentTarget.style.borderColor = '#818cf8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1e1b4b';
              e.currentTarget.style.borderColor = '#6366f1';
            }}
          >
            <Sparkles size={14} color="#818cf8" />
            <span>Templates &amp; Labs (T)</span>
          </button>

          {/* Deep Learning Field Guide / Glossary (Proposal 7) */}
          <button
            onClick={() => setIsGlossaryOpen((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              backgroundColor: isGlossaryOpen ? '#082f49' : '#1e293b',
              border: isGlossaryOpen ? '1px solid #38bdf8' : '1px solid #334155',
              borderRadius: '6px',
              color: isGlossaryOpen ? '#38bdf8' : '#cbd5e1',
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <BookOpen size={13} color="#38bdf8" />
            <span>Field Guide (G)</span>
          </button>

          {/* Guided Tour (Proposal 6) */}
          <button
            onClick={() => setIsTourOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 9px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#cbd5e1',
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <HelpCircle size={13} color="#34d399" />
            <span>Tour (?)</span>
          </button>

          {/* Debug Panel Toggle */}
          <button
            onClick={() => setIsDebugOpen((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
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
            <span>Debug (D)</span>
          </button>

          {/* Clear Canvas */}
          <button
            onClick={resetGraph}
            title="Clear canvas"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 8px',
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
              borderRadius: 9999,
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

      {/* Beginner UX Modals & Panels (v1 UX Improvements) */}
      <GlossaryPanel isOpen={isGlossaryOpen} onClose={() => setIsGlossaryOpen(false)} />
      <TemplateGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />
      <OnboardingTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onOpenTemplates={() => setIsGalleryOpen(true)}
      />
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
