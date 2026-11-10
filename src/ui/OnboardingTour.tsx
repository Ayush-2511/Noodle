import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, BookOpen, Layers, PlayCircle, CheckCircle2 } from 'lucide-react';

interface Step {
  title: string;
  badge: string;
  content: string;
  tip: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Noodle 🍜',
    badge: 'Introduction',
    content:
      'Noodle is an interactive deep learning workshop where every layer of a neural network is a visual node on your canvas. You can build, wire, inspect tensor shapes, and train real models on your device in real time.',
    tip: 'No cloud GPUs or installations required — everything runs in your browser via Web Workers and TensorFlow.js.',
    icon: <Sparkles size={24} color="#38bdf8" />,
  },
  {
    title: 'Your Building Blocks (Left Palette)',
    badge: 'The Layers',
    content:
      'On the left is the Layer Palette. Click any layer (e.g. Dataset, Conv2D, Linear, Activation) to place it on the canvas. Use the search bar at the top to filter layers instantly by name or function.',
    tip: 'Start every vision network with a Dataset node (MNIST), or use Input for custom tensor dimensions.',
    icon: <Layers size={24} color="#34d399" />,
  },
  {
    title: 'Sockets, Wires & Live Shapes',
    badge: 'The Pipeline',
    content:
      'Connect layers by dragging wires between handles. Wires are color-coded: 🟢 Green means shapes are mathematically compatible, 🔴 Red flags mismatches with an actionable fix hint, and ⚪ Grey indicates upstream errors.',
    tip: 'Look at the shape badges on wires (e.g. [B, 8, 28, 28]) to watch data transform as it travels through layers.',
    icon: <Sparkles size={24} color="#f59e0b" />,
  },
  {
    title: 'Self-Documenting Nodes',
    badge: 'Learning Tool',
    content:
      'Every node features an ⓘ info button in its header. Click it to read a plain-English explanation of what the layer does. Hover over any parameter name to see what that hyperparameter controls.',
    tip: 'You do not need to memorize layer math — Noodle computes spatial formulas (H\', W\') and parameters automatically.',
    icon: <BookOpen size={24} color="#a855f7" />,
  },
  {
    title: 'Training & Live Telemetry',
    badge: 'Execution',
    content:
      'Wire Loss and Optimizer into the Train node, then connect Train to Metrics. Hit "Run Training Loop" to train in a background Web Worker — watch loss drop and accuracy rise on the live SVG chart!',
    tip: 'Try loading "Your First Neural Network" or "Residual Skip Connection" from the Templates menu in the header.',
    icon: <PlayCircle size={24} color="#ec4899" />,
  },
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTemplates: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  onOpenTemplates,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  const handleFinish = () => {
    localStorage.setItem('noodle_onboarded', 'true');
    onClose();
  };

  const handleOpenTemplatesAndFinish = () => {
    handleFinish();
    onOpenTemplates();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '560px',
          maxWidth: '92vw',
          backgroundColor: '#0f172a',
          borderRadius: 12,
          border: '1px solid #334155',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 9999,
                backgroundColor: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #0284c7',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>• {step.badge}</span>
          </div>

          <button
            onClick={handleFinish}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 4,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div
              style={{
                padding: 10,
                backgroundColor: '#1e293b',
                borderRadius: 10,
                border: '1px solid #334155',
                flexShrink: 0,
              }}
            >
              {step.icon}
            </div>
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                {step.title}
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.5, color: '#cbd5e1' }}>
                {step.content}
              </p>
            </div>
          </div>

          {/* Tip Callout */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#090d16',
              borderRadius: 8,
              borderLeft: '3px solid #38bdf8',
              fontSize: '0.74rem',
              lineHeight: 1.45,
              color: '#94a3b8',
            }}
          >
            <strong style={{ color: '#38bdf8' }}>Pro-tip: </strong>
            {step.tip}
          </div>

          {/* Dots Indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, paddingTop: 4 }}>
            {STEPS.map((_, idx) => (
              <span
                key={idx}
                onClick={() => setCurrentStep(idx)}
                style={{
                  width: idx === currentStep ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: idx === currentStep ? '#38bdf8' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 6,
              color: currentStep === 0 ? '#475569' : '#cbd5e1',
              fontSize: '0.75rem',
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft size={14} />
            <span>Previous</span>
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {!isLast ? (
              <button
                onClick={() => setCurrentStep((prev) => Math.min(STEPS.length - 1, prev + 1))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 14px',
                  backgroundColor: '#0284c7',
                  border: 'none',
                  borderRadius: 6,
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              <>
                <button
                  onClick={handleFinish}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    color: '#cbd5e1',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  <CheckCircle2 size={14} color="#34d399" />
                  <span>Start Exploring</span>
                </button>

                <button
                  onClick={handleOpenTemplatesAndFinish}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 14px',
                    backgroundColor: '#a855f7',
                    border: 'none',
                    borderRadius: 6,
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={14} />
                  <span>Open Templates Gallery</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

