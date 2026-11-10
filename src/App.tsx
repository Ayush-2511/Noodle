import React, { useState, useEffect, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Editor } from './ui/Editor';
import { NodePalette } from './ui/NodePalette';
import { JsonInspector } from './ui/JsonInspector';
import { DebugPanel } from './ui/DebugPanel';
import { TrainingPanel } from './ui/TrainingPanel';
import { GlossaryPanel } from './ui/GlossaryPanel';
import { TemplateGalleryModal, TemplateItem, TEMPLATES } from './ui/TemplateGalleryModal';
import { OnboardingTour } from './ui/OnboardingTour';
import { DatasetInspector } from './ui/DatasetInspector/DatasetInspector';
import { TrainingProvider, useTraining } from './backends/tfjs/TrainingContext';
import { useGraphStore } from './core/store';
import { saveNoodleProjectNative, openNoodleProjectNative } from './core/projectFile';
import {
  RotateCcw,
  Sparkles,
  Bug,
  BookOpen,
  HelpCircle,
  FolderOpen,
  Save,
  Network,
  Database,
  Check,
} from 'lucide-react';

const MainApp: React.FC = () => {
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const activeTab = useGraphStore((state) => state.activeWorkspaceTab);
  const setActiveTab = useGraphStore((state) => state.setActiveWorkspaceTab);
  const resetGraph = useGraphStore((state) => state.resetGraph);
  const loadGraph = useGraphStore((state) => state.loadGraph);
  const training = useTraining();

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSaveProject = useCallback(async () => {
    const currentGraph = useGraphStore.getState().graph;
    const res = await saveNoodleProjectNative(currentGraph, 'pipeline.noodle');
    if (res.success) {
      const fileName = res.filePath ? res.filePath.split(/[\\/]/).pop() : 'pipeline.noodle';
      showToast(`✓ Project saved: ${fileName}`);
    } else if (res.error) {
      showToast(`Save failed: ${res.error}`);
    }
  }, []);

  const handleOpenProject = useCallback(async () => {
    const res = await openNoodleProjectNative();
    if (res.graph) {
      loadGraph(res.graph);
      showToast(`✓ Loaded project: ${res.title || 'pipeline.noodle'}`);
    } else if (res.error) {
      showToast(`Open failed: ${res.error}`);
    }
  }, [loadGraph]);

  // Check first-time visitor onboarding
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('noodle_onboarded');
    if (!hasSeenTour) {
      setIsTourOpen(true);
    }

    // Default to the v2 CNN Pipeline template if graph is empty
    const currentNodes = useGraphStore.getState().graph.nodes;
    if (currentNodes.length === 0) {
      const defaultTemplate = TEMPLATES.find((t) => t.id === 'v2-cnn') || TEMPLATES[0];
      loadGraph(defaultTemplate.graph);
    }
  }, [loadGraph]);

  // Global Keyboard shortcuts
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

      // Hotkey: Ctrl+S / Cmd+S (Save .noodle)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSaveProject();
        return;
      }

      // Hotkey: Ctrl+O / Cmd+O (Open .noodle)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        handleOpenProject();
        return;
      }

      // Hotkey: Ctrl+1 (Canvas tab)
      if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        setActiveTab('canvas');
        return;
      }

      // Hotkey: Ctrl+2 (Dataset Inspector tab)
      if ((e.ctrlKey || e.metaKey) && e.key === '2') {
        e.preventDefault();
        setActiveTab('dataset');
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
  }, [handleSaveProject, handleOpenProject, setActiveTab]);

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
        {/* Left Section: Branding & Native File Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>🍜</span>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.02em', color: '#f8fafc' }}>
              Noodle
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                backgroundColor: '#1e293b',
                color: '#38bdf8',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 600,
                border: '1px solid #0284c7',
              }}
            >
              Desktop
            </span>
          </div>

          <div style={{ width: '1px', height: '20px', backgroundColor: '#1e293b' }} />

          {/* Project File Operations (.noodle) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={handleOpenProject}
              title="Open .noodle Project (Ctrl+O)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 9px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#cbd5e1',
                fontSize: '0.74rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
            >
              <FolderOpen size={13} color="#38bdf8" />
              <span>Open</span>
            </button>

            <button
              onClick={handleSaveProject}
              title="Save .noodle Project (Ctrl+S)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 9px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#cbd5e1',
                fontSize: '0.74rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
            >
              <Save size={13} color="#34d399" />
              <span>Save</span>
            </button>

            {toastMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#064e3b',
                  color: '#6ee7b7',
                  border: '1px solid #059669',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 500,
                }}
              >
                <Check size={12} />
                <span>{toastMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Center Section: In-App Workspace Tab Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#020617',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #1e293b',
            gap: '3px',
          }}
        >
          <button
            onClick={() => setActiveTab('canvas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 14px',
              borderRadius: '6px',
              backgroundColor: activeTab === 'canvas' ? '#1e293b' : 'transparent',
              color: activeTab === 'canvas' ? '#38bdf8' : '#94a3b8',
              fontWeight: activeTab === 'canvas' ? 600 : 500,
              border: activeTab === 'canvas' ? '1px solid #0284c7' : '1px solid transparent',
              fontSize: '0.78rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Network size={14} color={activeTab === 'canvas' ? '#38bdf8' : '#64748b'} />
            <span>Network Canvas</span>
            <span style={{ fontSize: '0.62rem', opacity: 0.6, marginLeft: '2px' }}>Ctrl+1</span>
          </button>

          <button
            onClick={() => setActiveTab('dataset')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 14px',
              borderRadius: '6px',
              backgroundColor: activeTab === 'dataset' ? '#1e293b' : 'transparent',
              color: activeTab === 'dataset' ? '#a855f7' : '#94a3b8',
              fontWeight: activeTab === 'dataset' ? 600 : 500,
              border: activeTab === 'dataset' ? '1px solid #9333ea' : '1px solid transparent',
              fontSize: '0.78rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Database size={14} color={activeTab === 'dataset' ? '#c084fc' : '#64748b'} />
            <span>Dataset Inspector</span>
            <span style={{ fontSize: '0.62rem', opacity: 0.6, marginLeft: '2px' }}>Ctrl+2</span>
          </button>
        </div>

        {/* Right Section: Tools, Help & Diagnostics */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Templates & Guided Labs Gallery */}
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
            <span>Templates (T)</span>
          </button>

          {/* Field Guide */}
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
            <span>Guide (G)</span>
          </button>

          {/* Tour */}
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
        </div>
      </header>

      {/* Main Workspace Layout: Switches between Canvas & Dataset Inspector */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {activeTab === 'canvas' ? (
          <>
            <NodePalette />
            <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              <ReactFlowProvider>
                <Editor />
              </ReactFlowProvider>
              <DebugPanel isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} />
            </main>
            <JsonInspector />
          </>
        ) : (
          <DatasetInspector onReturnToCanvas={() => setActiveTab('canvas')} />
        )}
      </div>

      {/* Live Training Sanity Panel (Active during Canvas mode) */}
      {activeTab === 'canvas' && <TrainingPanel training={training} />}

      {/* Modals & Panels */}
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
