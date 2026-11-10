import React, { useState } from 'react';
import { Trash2, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { LayerEntry } from '../core/graph';
import { useGraphStore } from '../core/store';
import { inferBuilderShapes, formatShape, TensorShape } from '../core/shapeEngine';

interface LayerStackProps {
  nodeId: string;
  builderType: 'FeatureExtractor' | 'Classifier';
  layers: LayerEntry[];
  inputShape: TensorShape;
}

const FEATURE_EXTRACTOR_LAYERS = [
  { type: 'Conv2D', label: 'Conv2D', desc: 'Scan for spatial patterns (edges, textures)' },
  { type: 'MaxPool2D', label: 'MaxPool2D', desc: 'Shrink feature maps, keep strongest signals' },
  { type: 'BatchNorm', label: 'BatchNorm', desc: 'Stabilize activations with normalization' },
  { type: 'ReLU', label: 'ReLU', desc: 'Let positive activations pass, block negatives' },
  { type: 'Sigmoid', label: 'Sigmoid', desc: 'Smooth 0 to 1 non-linear activation' },
  { type: 'Dropout', label: 'Dropout', desc: 'Randomly disable neurons to prevent overfitting' },
];

const CLASSIFIER_LAYERS = [
  { type: 'Linear', label: 'Linear', desc: 'Dense weighted connections between neurons' },
  { type: 'ReLU', label: 'ReLU', desc: 'Let positive activations pass, block negatives' },
  { type: 'Sigmoid', label: 'Sigmoid', desc: 'Smooth 0 to 1 non-linear activation' },
  { type: 'Dropout', label: 'Dropout', desc: 'Randomly disable neurons to prevent overfitting' },
  { type: 'BatchNorm', label: 'BatchNorm', desc: 'Stabilize activations with normalization' },
];

export const LayerStack: React.FC<LayerStackProps> = ({
  nodeId,
  builderType,
  layers,
  inputShape,
}) => {
  const addLayer = useGraphStore((state) => state.addLayer);
  const removeLayer = useGraphStore((state) => state.removeLayer);
  const reorderLayer = useGraphStore((state) => state.reorderLayer);
  const updateLayerParams = useGraphStore((state) => state.updateLayerParams);

  const [showAddMenu, setShowAddMenu] = useState(false);

  // Compute live shapes for each layer in the stack
  const shapeResult = inferBuilderShapes(layers, inputShape);
  const layerShapeMap = new Map(shapeResult.layerShapes.map((ls) => [ls.layerId, ls]));

  const allowedLayers = builderType === 'FeatureExtractor' ? FEATURE_EXTRACTOR_LAYERS : CLASSIFIER_LAYERS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
      {/* Stack Summary Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.68rem',
          padding: '4px 6px',
          backgroundColor: '#0f172a',
          borderRadius: 4,
          border: '1px solid #334155',
        }}
      >
        <span>
          Input: <strong style={{ color: '#38bdf8' }}>{formatShape(inputShape)}</strong>
        </span>
        <span>
          Output: <strong style={{ color: '#22c55e' }}>{formatShape(shapeResult.finalOutputShape)}</strong>
        </span>
      </div>

      {/* Layer Stack Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {layers.length === 0 ? (
          <div
            style={{
              padding: '12px 8px',
              textAlign: 'center',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderRadius: 4,
              border: '1px dashed #475569',
              color: '#94a3b8',
              fontSize: '0.7rem',
            }}
          >
            No layers added yet. Click <strong>+ Add Layer</strong> below.
          </div>
        ) : (
          layers.map((layer, index) => {
            const shapeInfo = layerShapeMap.get(layer.id);
            const hasError = !!shapeInfo?.error;

            return (
              <div
                key={layer.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '6px 8px',
                  backgroundColor: hasError ? 'rgba(127, 29, 29, 0.4)' : '#0f172a',
                  border: `1px solid ${hasError ? '#ef4444' : '#334155'}`,
                  borderRadius: 4,
                  fontSize: '0.72rem',
                  gap: 4,
                }}
              >
                {/* Layer Main Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <button
                        disabled={index === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          reorderLayer(nodeId, layer.id, index - 1);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: index === 0 ? '#475569' : '#94a3b8',
                          cursor: index === 0 ? 'default' : 'pointer',
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >
                        <ChevronUp size={10} />
                      </button>
                      <button
                        disabled={index === layers.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          reorderLayer(nodeId, layer.id, index + 1);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: index === layers.length - 1 ? '#475569' : '#94a3b8',
                          cursor: index === layers.length - 1 ? 'default' : 'pointer',
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >
                        <ChevronDown size={10} />
                      </button>
                    </div>

                    <span style={{ color: '#64748b', fontFamily: 'monospace', width: 14 }}>
                      {index + 1}.
                    </span>

                    <span
                      style={{
                        fontWeight: 600,
                        color: layer.type === 'Conv2D' || layer.type === 'Linear' ? '#38bdf8' : '#cbd5e1',
                      }}
                    >
                      {layer.type}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        padding: '1px 5px',
                        borderRadius: 3,
                        backgroundColor: '#1e293b',
                        color: shapeInfo?.outputShape === 'unknown' ? '#ef4444' : '#86efac',
                        fontFamily: 'monospace',
                      }}
                    >
                      → {formatShape(shapeInfo?.outputShape || 'unknown')}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLayer(nodeId, layer.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: 2,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Delete layer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Inline Parameters */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', paddingLeft: 22 }}>
                  {layer.type === 'Conv2D' && (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#94a3b8', fontSize: '0.65rem' }}>
                        filters:
                        <input
                          type="number"
                          value={layer.params.filters ?? 8}
                          onChange={(e) => updateLayerParams(nodeId, layer.id, { filters: Number(e.target.value) })}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: 42, padding: '1px 3px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 3, color: '#f8fafc', fontSize: '0.65rem' }}
                        />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#94a3b8', fontSize: '0.65rem' }}>
                        kernel:
                        <input
                          type="number"
                          value={layer.params.kernel ?? 3}
                          onChange={(e) => updateLayerParams(nodeId, layer.id, { kernel: Number(e.target.value) })}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: 34, padding: '1px 3px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 3, color: '#f8fafc', fontSize: '0.65rem' }}
                        />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#94a3b8', fontSize: '0.65rem' }}>
                        pad:
                        <input
                          type="number"
                          value={layer.params.padding ?? layer.params.pad ?? 1}
                          onChange={(e) => updateLayerParams(nodeId, layer.id, { padding: Number(e.target.value), pad: Number(e.target.value) })}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: 32, padding: '1px 3px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 3, color: '#f8fafc', fontSize: '0.65rem' }}
                        />
                      </label>
                    </>
                  )}

                  {layer.type === 'MaxPool2D' && (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#94a3b8', fontSize: '0.65rem' }}>
                        kernel:
                        <input
                          type="number"
                          value={layer.params.kernel ?? 2}
                          onChange={(e) => updateLayerParams(nodeId, layer.id, { kernel: Number(e.target.value) })}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: 34, padding: '1px 3px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 3, color: '#f8fafc', fontSize: '0.65rem' }}
                        />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#94a3b8', fontSize: '0.65rem' }}>
                        stride:
                        <input
                          type="number"
                          value={layer.params.stride ?? 2}
                          onChange={(e) => updateLayerParams(nodeId, layer.id, { stride: Number(e.target.value) })}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: 34, padding: '1px 3px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 3, color: '#f8fafc', fontSize: '0.65rem' }}
                        />
                      </label>
                    </>
                  )}

                  {layer.type === 'Linear' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: '0.65rem' }}>
                      neurons:
                      <input
                        type="number"
                        value={layer.params.neurons ?? 128}
                        onChange={(e) => updateLayerParams(nodeId, layer.id, { neurons: Number(e.target.value) })}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: 52, padding: '1px 3px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 3, color: '#f8fafc', fontSize: '0.65rem' }}
                      />
                    </label>
                  )}

                  {layer.type === 'Dropout' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: '0.65rem' }}>
                      rate:
                      <input
                        type="number"
                        step={0.1}
                        min={0.0}
                        max={0.9}
                        value={layer.params.rate ?? 0.5}
                        onChange={(e) => updateLayerParams(nodeId, layer.id, { rate: Number(e.target.value) })}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: 44, padding: '1px 3px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 3, color: '#f8fafc', fontSize: '0.65rem' }}
                      />
                    </label>
                  )}
                </div>

                {/* Per-layer Error Message */}
                {shapeInfo?.error && (
                  <div
                    style={{
                      padding: '3px 6px',
                      backgroundColor: '#450a0a',
                      borderRadius: 3,
                      color: '#fca5a5',
                      fontSize: '0.65rem',
                    }}
                  >
                    <span>{shapeInfo.error}</span>
                    {shapeInfo.fixHint && (
                      <div style={{ color: '#fed7aa', marginTop: 2 }}>
                        Hint: {shapeInfo.fixHint}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Layer Button & Dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowAddMenu(!showAddMenu);
          }}
          style={{
            width: '100%',
            padding: '5px 8px',
            backgroundColor: '#1e293b',
            border: '1px dashed #64748b',
            borderRadius: 4,
            color: '#38bdf8',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <Plus size={12} />
          <span>+ Add Layer</span>
        </button>

        {showAddMenu && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              backgroundColor: '#0f172a',
              border: '1px solid #475569',
              borderRadius: 6,
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.7)',
              zIndex: 100,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {allowedLayers.map((l) => (
              <button
                key={l.type}
                onClick={(e) => {
                  e.stopPropagation();
                  addLayer(nodeId, l.type);
                  setShowAddMenu(false);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '6px 10px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #1e293b',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div style={{ fontWeight: 600, color: '#38bdf8', fontSize: '0.75rem' }}>{l.label}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.65rem' }}>{l.desc}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.68rem',
          color: '#94a3b8',
          paddingTop: 2,
        }}
      >
        <span>Layers: <strong style={{ color: '#f1f5f9' }}>{layers.length}</strong></span>
        <span>Params: <strong style={{ color: '#cbd5e1' }}>{shapeResult.totalParams.toLocaleString()}</strong></span>
      </div>
    </div>
  );
};
