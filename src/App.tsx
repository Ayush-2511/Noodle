import React, { useState, useEffect, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Editor } from './ui/Editor';
import { NodePalette } from './ui/NodePalette';
import { InspectorPanel } from './ui/InspectorPanel';
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
  PanelRight,
} from 'lucide-react';

const MainApp: React.FC = () => {
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const activeTab = useGraphStore((state) => state.activeWorkspaceTab);
  const setActiveTab = useGraphStore((state) => state.setActiveWorkspaceTab);
  const resetGraph = useGraphStore((state) => state.resetGraph);
  const loadGraph = useGraphStore((state) => state.loadGraph);
  const training = useTraining();

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSaveProject = useCallback(async () => {
    const currentGraph = useGraphStore.getState().graph;
    const res = await saveNoodleProjectNative(currentGraph, 'pipeline.noodle');
    if (res.success) {
      const fileName = res.filePath ? res.filePath.split(/[\\/]/).pop() : 'pipeline.noodle';
      showToast(`Saved: ${fileName}`);
    } else if (res.error) {
      showToast(`Save error: ${res.error}`);
    }
  }, []);

  const handleOpenProject = useCallback(async () => {
    const res = await openNoodleProjectNative();
    if (res.graph) {
      loadGraph(res.graph);
      showToast(`Opened: ${res.title || 'Project'}`);
    } else if (res.error) {
      showToast(`Open error: ${res.error}`);
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

      // Hotkey: Ctrl+B (Toggle inspector)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setIsInspectorOpen((prev) => !prev);
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#181818',
        fontFamily: '"Segoe UI Variable Text", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
        color: '#e1e1e1',
      }}
    >
      {/* Windows Application Header Bar */}
      <header
        style={{
          height: '40px',
          backgroundColor: '#1e1e1e',
          borderBottom: '1px solid #2d2d2d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          zIndex: 10,
          userSelect: 'none',
        }}
      >
        {/* Left: Branding & Windows App Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Logo Glyph */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0078d4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="12" r="3" />
              <line x1="9" y1="6" x2="15" y2="10" />
              <line x1="9" y1="18" x2="15" y2="14" />
            </svg>
            <span style={{ fontWeight: 700, fontSize: '0.86rem', letterSpacing: '0.04em', color: '#ffffff' }}>
              NOODLE
            </span>
            <span style={{ fontSize: '0.68rem', color: '#777777', fontWeight: 500 }}>
              Studio
            </span>
          </div>

          <div style={{ width: '1px', height: '18px', backgroundColor: '#333333' }} />

          {/* Standard Desktop Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={handleOpenProject}
              title="Open Project File (Ctrl+O)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 8px',
                backgroundColor: 'transparent',
                border: '1px solid transparent',
                borderRadius: 3,
                color: '#cccccc',
                fontSize: '0.74rem',
                cursor: 'pointer',
                transition: 'background-color 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2a2d2e';
                e.currentTarget.style.borderColor = '#383838';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <FolderOpen size={13} color="#a6a6a6" />
              <span>Open</span>
            </button>

            <button
              onClick={handleSaveProject}
              title="Save Project File (Ctrl+S)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 8px',
                backgroundColor: 'transparent',
                border: '1px solid transparent',
                borderRadius: 3,
                color: '#cccccc',
                fontSize: '0.74rem',
                cursor: 'pointer',
                transition: 'background-color 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2a2d2e';
                e.currentTarget.style.borderColor = '#383838';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <Save size={13} color="#a6a6a6" />
              <span>Save</span>
            </button>

            {toastMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: '#1b2d1f',
                  color: '#4ade80',
                  border: '1px solid #276235',
                  padding: '2px 8px',
                  borderRadius: 3,
                  fontSize: '0.68rem',
                  fontWeight: 500,
                  marginLeft: 4,
                }}
              >
                <Check size={11} />
                <span>{toastMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Windows Segmented Workspace Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#141414',
            padding: '2px',
            borderRadius: 4,
            border: '1px solid #2d2d2d',
            gap: 2,
          }}
        >
          <button
            onClick={() => setActiveTab('canvas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 12px',
              borderRadius: 3,
              backgroundColor: activeTab === 'canvas' ? '#252526' : 'transparent',
              color: activeTab === 'canvas' ? '#ffffff' : '#888888',
              fontWeight: activeTab === 'canvas' ? 600 : 400,
              border: activeTab === 'canvas' ? '1px solid #383838' : '1px solid transparent',
              fontSize: '0.74rem',
              cursor: 'pointer',
              transition: 'all 0.1s ease',
            }}
          >
            <Network size={12} color={activeTab === 'canvas' ? '#0078d4' : '#666666'} />
            <span>Network Canvas</span>
            <span style={{ fontSize: '0.62rem', color: '#666666', marginLeft: 2 }}>Ctrl+1</span>
          </button>

          <button
            onClick={() => setActiveTab('dataset')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 12px',
              borderRadius: 3,
              backgroundColor: activeTab === 'dataset' ? '#252526' : 'transparent',
              color: activeTab === 'dataset' ? '#ffffff' : '#888888',
              fontWeight: activeTab === 'dataset' ? 600 : 400,
              border: activeTab === 'dataset' ? '1px solid #383838' : '1px solid transparent',
              fontSize: '0.74rem',
              cursor: 'pointer',
              transition: 'all 0.1s ease',
            }}
          >
            <Database size={12} color={activeTab === 'dataset' ? '#0078d4' : '#666666'} />
            <span>Dataset Inspector</span>
            <span style={{ fontSize: '0.62rem', color: '#666666', marginLeft: 2 }}>Ctrl+2</span>
          </button>
        </div>

        {/* Right: Studio Tools & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Templates Gallery */}
          <button
            onClick={() => setIsGalleryOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 9px',
              backgroundColor: '#252526',
              border: '1px solid #383838',
              borderRadius: 3,
              color: '#d4d4d4',
              fontSize: '0.72rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.1s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2d2d30')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#252526')}
          >
            <Sparkles size={12} color="#0078d4" />
            <span>Templates (T)</span>
          </button>

          {/* Neural Network Field Guide */}
          <button
            onClick={() => setIsGlossaryOpen((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 9px',
              backgroundColor: isGlossaryOpen ? '#2a2d2e' : '#252526',
              border: isGlossaryOpen ? '1px solid #0078d4' : '1px solid #383838',
              borderRadius: 3,
              color: isGlossaryOpen ? '#ffffff' : '#d4d4d4',
              fontSize: '0.72rem',
              cursor: 'pointer',
            }}
          >
            <BookOpen size={12} color={isGlossaryOpen ? '#0078d4' : '#999999'} />
            <span>Guide (G)</span>
          </button>

          {/* Quick Tour */}
          <button
            onClick={() => setIsTourOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 8px',
              backgroundColor: '#252526',
              border: '1px solid #383838',
              borderRadius: 3,
              color: '#cccccc',
              fontSize: '0.72rem',
              cursor: 'pointer',
            }}
          >
            <HelpCircle size={12} color="#999999" />
            <span>Tour (?)</span>
          </button>

          {/* Toggle Inspector Panel */}
          <button
            onClick={() => setIsInspectorOpen((prev) => !prev)}
            title="Toggle Properties Inspector (Ctrl+B)"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '4px 7px',
              backgroundColor: isInspectorOpen ? '#2a2d2e' : '#252526',
              border: isInspectorOpen ? '1px solid #0078d4' : '1px solid #383838',
              borderRadius: 3,
              color: isInspectorOpen ? '#0078d4' : '#999999',
              fontSize: '0.72rem',
              cursor: 'pointer',
            }}
          >
            <PanelRight size={13} />
          </button>

          {/* Debug Panel Toggle */}
          <button
            onClick={() => setIsDebugOpen((prev) => !prev)}
            title="Debug Diagnostics (D)"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '4px 7px',
              backgroundColor: isDebugOpen ? '#2a2d2e' : '#252526',
              border: isDebugOpen ? '1px solid #0078d4' : '1px solid #383838',
              borderRadius: 3,
              color: isDebugOpen ? '#0078d4' : '#999999',
              fontSize: '0.72rem',
              cursor: 'pointer',
            }}
          >
            <Bug size={13} />
          </button>

          {/* Clear Canvas */}
          <button
            onClick={resetGraph}
            title="Clear canvas"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '4px 7px',
              backgroundColor: '#252526',
              border: '1px solid #383838',
              borderRadius: 3,
              color: '#888888',
              fontSize: '0.72rem',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ff6b6b')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#888888')}
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </header>

      {/* Main Studio Workspace: Switches between Canvas & Dataset Inspector */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {activeTab === 'canvas' ? (
          <>
            <NodePalette />
            <main style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#141414' }}>
              <ReactFlowProvider>
                <Editor />
              </ReactFlowProvider>
              <DebugPanel isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} />
            </main>
            {isInspectorOpen && <InspectorPanel />}
          </>
        ) : (
          <DatasetInspector onReturnToCanvas={() => setActiveTab('canvas')} />
        )}
      </div>

      {/* Professional Windows Desktop Status Bar */}
      <TrainingPanel training={training} />

      {/* Guided Labs & Modals */}
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
