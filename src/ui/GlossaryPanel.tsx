import React, { useState, useMemo } from 'react';
import { X, Search, BookOpen } from 'lucide-react';

interface GlossaryTerm {
  term: string;
  category: 'Fundamentals' | 'Layers' | 'Training' | 'Optimization';
  definition: string;
  inNoodle: string;
}

const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: 'Neural Network',
    category: 'Fundamentals',
    definition:
      'A computational function made of interconnected layers that learns patterns from data by progressively adjusting internal numeric weights.',
    inNoodle: 'Built on canvas by connecting layers from Dataset to Loss.',
  },
  {
    term: 'Tensor & Shape',
    category: 'Fundamentals',
    definition:
      'A multi-dimensional array of numbers. Shape [B, C, H, W] represents Batch size, Channels, Height, and Width. Wires display live tensor shapes.',
    inNoodle: 'Hover over wires to see real-time shape badges like [B, 8, 28, 28].',
  },
  {
    term: 'Epoch',
    category: 'Training',
    definition:
      'One complete pass where the learning algorithm processes the entire training dataset once.',
    inNoodle: 'Configured on the Train node (e.g. 3 or 5 epochs).',
  },
  {
    term: 'Batch Size',
    category: 'Training',
    definition:
      'The number of training examples evaluated together before weights are updated once. Small batch = noisy updates; large batch = smoother but heavier.',
    inNoodle: 'Configured on the Train node (e.g. 32 samples per step).',
  },
  {
    term: 'Loss Function',
    category: 'Training',
    definition:
      'A numeric score calculating how wrong the network predictions are. Training works by using gradients to push this number toward zero.',
    inNoodle: 'Represented by the Loss node. Use CrossEntropy for MNIST digits.',
  },
  {
    term: 'Optimizer & Gradient Descent',
    category: 'Optimization',
    definition:
      'The mathematical algorithm calculating which direction and how much to nudge model weights to decrease the loss.',
    inNoodle: 'Set via Optimizer node. Adam adapts automatically; SGD uses fixed steps.',
  },
  {
    term: 'Learning Rate (lr)',
    category: 'Optimization',
    definition:
      'The step size taken along the gradient. Too high overshoots the minimum and explodes; too low learns painfully slowly. 0.001 to 0.005 is ideal for Adam.',
    inNoodle: 'Configured on the Optimizer node.',
  },
  {
    term: 'Convolution (Conv2D)',
    category: 'Layers',
    definition:
      'Slides small spatial filters (kernels) across images to detect local patterns like edges, lines, corners, and textures regardless of where they appear.',
    inNoodle: 'Conv2D node. Takes [B, C, H, W] and outputs transformed feature maps.',
  },
  {
    term: 'Max Pooling (MaxPool2D)',
    category: 'Layers',
    definition:
      'Downsamples feature maps by taking the largest value in small grid windows (e.g. 2x2). Reduces computational size and gives shift tolerance.',
    inNoodle: 'MaxPool2D node. Halves spatial dimensions when stride is 2.',
  },
  {
    term: 'Activation & ReLU',
    category: 'Layers',
    definition:
      'Non-linear functions applied after linear transforms. Without them, deep networks reduce to a single flat equation. ReLU (max(0, x)) is standard.',
    inNoodle: 'Activation node. Set to ReLU between Conv or Linear layers.',
  },
  {
    term: 'Flatten',
    category: 'Layers',
    definition:
      'Unrolls multi-dimensional 2D/3D feature grids into a single 1D row vector. Bridge needed before feeding visual features to Linear decision layers.',
    inNoodle: 'Flatten node. Converts [B, 16, 7, 7] into [B, 784].',
  },
  {
    term: 'Dropout & Overfitting',
    category: 'Layers',
    definition:
      'Overfitting occurs when a network memorizes training samples instead of general rules. Dropout randomly turns off neurons during training to prevent memorization.',
    inNoodle: 'Dropout node. Sets probability p (e.g. 0.2 to 0.5) of disabling neurons.',
  },
  {
    term: 'Residual Skip Connection',
    category: 'Layers',
    definition:
      'An architecture trick (used in ResNets) where an earlier layer output bypasses intermediate layers and is added directly downstream using the Add node.',
    inNoodle: 'Wire branch around layers into Add.a and Add.b. Try preset T3.',
  },
  {
    term: 'Logits vs. Softmax',
    category: 'Fundamentals',
    definition:
      'Logits are raw, unconstrained output scores from a Linear layer. Softmax converts them into probabilities summing to 100%. CrossEntropy takes logits directly.',
    inNoodle: 'Leave final Linear layer without Softmax if feeding into CrossEntropy.',
  },
];

interface GlossaryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlossaryPanel: React.FC<GlossaryPanelProps> = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredTerms = useMemo(() => {
    return GLOSSARY_TERMS.filter((t) => {
      const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
      const matchesSearch =
        t.term.toLowerCase().includes(search.toLowerCase()) ||
        t.definition.toLowerCase().includes(search.toLowerCase()) ||
        t.inNoodle.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 50,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '460px',
          maxWidth: '92vw',
          height: '100vh',
          backgroundColor: '#0f172a',
          borderLeft: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 25px rgba(0, 0, 0, 0.5)',
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
            <BookOpen size={18} color="#38bdf8" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
              Deep Learning Glossary &amp; Field Guide
            </span>
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
            <X size={18} />
          </button>
        </div>

        {/* Search & Filters */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 6,
            }}
          >
            <Search size={14} color="#64748b" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search concepts (Conv, Loss, Batch Size...)"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f8fafc',
                fontSize: '0.8rem',
                width: '100%',
              }}
            />
          </div>

          {/* Category Pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['All', 'Fundamentals', 'Layers', 'Training', 'Optimization'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 9999,
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: selectedCategory === cat ? '1px solid #38bdf8' : '1px solid #334155',
                  backgroundColor: selectedCategory === cat ? '#082f49' : '#1e293b',
                  color: selectedCategory === cat ? '#38bdf8' : '#94a3b8',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Terms List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredTerms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '0.85rem' }}>
              No terms matching your search query.
            </div>
          ) : (
            filteredTerms.map((t) => (
              <div
                key={t.term}
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#1e293b',
                  borderRadius: 8,
                  border: '1px solid #334155',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f8fafc' }}>
                    {t.term}
                  </span>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 4,
                      backgroundColor: '#0f172a',
                      color: '#38bdf8',
                      border: '1px solid #334155',
                    }}
                  >
                    {t.category}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.45, color: '#cbd5e1' }}>
                  {t.definition}
                </p>

                <div
                  style={{
                    marginTop: 4,
                    padding: '5px 8px',
                    borderRadius: 5,
                    backgroundColor: '#0f172a',
                    borderLeft: '2px solid #38bdf8',
                    fontSize: '0.7rem',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>In Noodle:</span>
                  <span>{t.inNoodle}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #1e293b',
            fontSize: '0.7rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Press <kbd style={{ padding: '1px 5px', backgroundColor: '#334155', borderRadius: 4, color: '#f8fafc' }}>G</kbd> anytime to toggle</span>
          <span>Noodle v1 Field Guide</span>
        </div>
      </div>
    </div>
  );
};
