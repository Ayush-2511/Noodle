import React from 'react';
import { X, Sparkles, ArrowRight, Layers, Cpu, GitFork, Workflow } from 'lucide-react';
import { Graph } from '../core/graph';

export interface TemplateItem {
  id: string;
  title: string;
  difficulty: '⭐ Beginner' | '⭐⭐ Intermediate' | '⭐⭐⭐ Advanced' | '⭐⭐⭐⭐ Expert';
  difficultyColor: string;
  icon: React.ReactNode;
  summary: string;
  whatYouLearn: string;
  nodeCount: number;
  graph: Graph;
}

export const TEMPLATES: TemplateItem[] = [
  {
    id: 'mlp-first',
    title: 'Your First Neural Network (MLP)',
    difficulty: '⭐ Beginner',
    difficultyColor: '#34d399',
    icon: <Cpu size={20} color="#34d399" />,
    summary: 'A classic 2-layer Multi-Layer Perceptron trained on MNIST digit classification.',
    whatYouLearn:
      'How to flatten 28x28 image grids into a 784-dim vector, pass through a hidden layer with ReLU non-linearity, and project to 10 digit classes.',
    nodeCount: 9,
    graph: {
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
    },
  },
  {
    id: 'cnn-vision',
    title: 'See with Convolutions (CNN)',
    difficulty: '⭐⭐ Intermediate',
    difficultyColor: '#38bdf8',
    icon: <Layers size={20} color="#38bdf8" />,
    summary: 'A 2-stage Convolutional Neural Network with 3x3 filters and 2x2 pooling.',
    whatYouLearn:
      'How Conv2D filters scan visual features preserving 2D spatial layouts, MaxPool compresses dimensions, and features feed into the final classifier.',
    nodeCount: 10,
    graph: {
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
    },
  },
  {
    id: 'resnet-skip',
    title: 'Residual Skip Connection (ResNet)',
    difficulty: '⭐⭐⭐ Advanced',
    difficultyColor: '#f59e0b',
    icon: <GitFork size={20} color="#f59e0b" />,
    summary: 'A residual block where identity bypasses convolution and merges with Add.',
    whatYouLearn:
      'Why deep networks do not suffer from vanishing gradients: the skip wire allows uninterrupted gradient flow through identity additions.',
    nodeCount: 9,
    graph: {
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
    },
  },
  {
    id: 'concat-merge',
    title: 'Multi-Branch Concat (Inception Style)',
    difficulty: '⭐⭐⭐⭐ Expert',
    difficultyColor: '#a855f7',
    icon: <Workflow size={20} color="#a855f7" />,
    summary: 'Two parallel feature extractor branches merged along the channel axis.',
    whatYouLearn:
      'How to extract multiple multi-scale features in parallel and stack their channel depths into a single rich representation tensor.',
    nodeCount: 9,
    graph: {
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
    },
  },
];

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TemplateItem) => void;
}

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '760px',
          maxWidth: '96vw',
          maxHeight: '90vh',
          backgroundColor: '#0f172a',
          borderRadius: 12,
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={20} color="#a855f7" />
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                Architecture &amp; Guided Lab Gallery
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              Load a battle-tested deep learning architecture, inspect its shape flow, and train it on-device.
            </p>
          </div>
          <button
            onClick={onClose}
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
            <X size={20} />
          </button>
        </div>

        {/* Templates Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 10,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = tmpl.difficultyColor;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(0, 0, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#334155';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onClick={() => {
                onSelectTemplate(tmpl);
                onClose();
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ padding: 6, backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #334155' }}>
                      {tmpl.icon}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f8fafc' }}>
                      {tmpl.title}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      backgroundColor: '#0f172a',
                      color: tmpl.difficultyColor,
                      border: `1px solid ${tmpl.difficultyColor}40`,
                    }}
                  >
                    {tmpl.difficulty}
                  </span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 500,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      backgroundColor: '#0f172a',
                      color: '#94a3b8',
                      border: '1px solid #334155',
                    }}
                  >
                    {tmpl.nodeCount} nodes
                  </span>
                </div>

                <p style={{ margin: '0 0 10px', fontSize: '0.75rem', lineHeight: 1.45, color: '#cbd5e1' }}>
                  {tmpl.summary}
                </p>

                <div
                  style={{
                    padding: '8px 10px',
                    backgroundColor: '#0f172a',
                    borderRadius: 6,
                    borderLeft: `3px solid ${tmpl.difficultyColor}`,
                    fontSize: '0.7rem',
                    lineHeight: 1.4,
                    color: '#94a3b8',
                  }}
                >
                  <strong style={{ color: '#f1f5f9', display: 'block', marginBottom: 2 }}>
                    What this teaches:
                  </strong>
                  {tmpl.whatYouLearn}
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  paddingTop: 10,
                  borderTop: '1px solid #334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 6,
                  color: tmpl.difficultyColor,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                <span>Load Architecture</span>
                <ArrowRight size={14} />
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #1e293b',
            backgroundColor: '#090d16',
            fontSize: '0.72rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>All templates load complete, pre-validated graphs with zero errors.</span>
          <button
            onClick={onClose}
            style={{
              padding: '5px 12px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 6,
              color: '#cbd5e1',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

