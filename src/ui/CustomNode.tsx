import React, { useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import { getNodeDefinition } from '../nodes/registry';
import { useGraphStore } from '../core/store';
import { formatShape, TensorShape } from '../core/shapeEngine';

export interface CustomNodeData {
  type: string;
  params: Record<string, any>;
  status?: 'ok' | 'warning' | 'error';
  outputShapes?: Record<string, TensorShape>;
  paramCount?: number;
  problemMessage?: string;
  [key: string]: unknown;
}

export const CustomNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as CustomNodeData;
  const def = getNodeDefinition(nodeData.type);
  const updateNodeParams = useGraphStore((state) => state.updateNodeParams);
  const removeNode = useGraphStore((state) => state.removeNode);

  const handleParamChange = useCallback(
    (key: string, value: any) => {
      updateNodeParams(id, { [key]: value });
    },
    [id, updateNodeParams]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      removeNode(id);
    },
    [id, removeNode]
  );

  // Status dot & border color determination
  const status = nodeData.status || 'ok';
  let statusDot = '🟢';
  let borderColor = '#334155';
  let glowShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.3)';

  if (status === 'error') {
    statusDot = '🔴';
    borderColor = '#ef4444';
  } else if (status === 'warning') {
    statusDot = '🟡';
    borderColor = '#eab308';
  }

  // Active / Selected state visual priority
  if (selected) {
    borderColor = '#38bdf8'; // Bright Cyan
    glowShadow = '0 0 0 3px rgba(56, 189, 248, 0.45), 0 10px 25px -3px rgba(0, 0, 0, 0.6)';
  }

  // Primary output shape
  const outShape = nodeData.outputShapes?.['out'] || nodeData.outputShapes?.['images'] || 'unknown';
  const formattedOutShape = formatShape(outShape);
  const paramCount = nodeData.paramCount || 0;

  return (
    <div
      style={{
        width: 230,
        backgroundColor: '#1e293b',
        borderRadius: 8,
        border: `2px solid ${borderColor}`,
        boxShadow: glowShadow,
        color: '#f8fafc',
        fontSize: '0.8rem',
        overflow: 'visible', // Ensure handles and glow rings are fully visible
        position: 'relative',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      {/* Node Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 12px',
          backgroundColor: selected ? '#1e293b' : '#0f172a',
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
          borderBottom: selected ? '1px solid #38bdf8' : '1px solid #334155',
          transition: 'background-color 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.7rem' }}>{statusDot}</span>
          <span style={{ fontWeight: 600, color: selected ? '#38bdf8' : '#f1f5f9' }}>
            {def.label}
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              backgroundColor: '#334155',
              padding: '1px 5px',
              borderRadius: 4,
              color: '#94a3b8',
              fontFamily: 'monospace',
            }}
          >
            {id}
          </span>
        </div>

        <button
          onClick={handleDelete}
          title="Delete Node"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Sockets and Body */}
      <div style={{ padding: '10px 12px' }}>
        {/* Input Sockets */}
        {def.inputs.map((input) => (
          <div
            key={input.id}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <Handle
              type="target"
              position={Position.Left}
              id={input.id}
              style={{
                left: -19, // Centers 14px handle nicely over node border
              }}
            />
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', marginLeft: 2 }}>
              {input.label}
            </span>
          </div>
        ))}

        {/* Output Sockets */}
        {def.outputs.map((output) => (
          <div
            key={output.id}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', marginRight: 2 }}>
              {output.label}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={output.id}
              style={{
                right: -19, // Centers 14px handle nicely over node border
              }}
            />
          </div>
        ))}

        {/* Parameter Fields */}
        {def.paramFields.length > 0 && (
          <div
            style={{
              marginTop: 6,
              paddingTop: 8,
              borderTop: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {def.paramFields.map((field) => {
              const currentValue = nodeData.params[field.key] ?? def.defaultParams[field.key];

              if (field.type === 'number') {
                return (
                  <div
                    key={field.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                      {field.label}:
                    </label>
                    <input
                      type="number"
                      value={currentValue ?? ''}
                      min={field.min}
                      max={field.max}
                      step={field.step ?? 1}
                      onChange={(e) =>
                        handleParamChange(field.key, Number(e.target.value))
                      }
                      style={{
                        width: '80px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #475569',
                        borderRadius: 4,
                        color: '#f8fafc',
                        padding: '3px 6px',
                        fontSize: '0.75rem',
                        textAlign: 'right',
                      }}
                    />
                  </div>
                );
              }

              if (field.type === 'select') {
                return (
                  <div
                    key={field.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                      {field.label}:
                    </label>
                    <select
                      value={currentValue ?? ''}
                      onChange={(e) => handleParamChange(field.key, e.target.value)}
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #475569',
                        borderRadius: 4,
                        color: '#f8fafc',
                        padding: '3px 6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <div
                  key={field.key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                    {field.label}:
                  </label>
                  <input
                    type="text"
                    value={currentValue ?? ''}
                    placeholder={field.placeholder}
                    onChange={(e) => handleParamChange(field.key, e.target.value)}
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: 4,
                      color: '#f8fafc',
                      padding: '3px 6px',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Node Info Strip (Section 9.3) */}
        <div
          style={{
            marginTop: 8,
            paddingTop: 6,
            borderTop: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.68rem',
            color: '#94a3b8',
            fontFamily: 'monospace',
          }}
        >
          <span>out: <strong style={{ color: formattedOutShape === 'unknown' ? '#64748b' : '#38bdf8' }}>{formattedOutShape}</strong></span>
          <span>params: <strong style={{ color: '#cbd5e1' }}>{paramCount.toLocaleString()}</strong></span>
        </div>

        {/* Problem Error / Warning Message */}
        {nodeData.problemMessage && (
          <div
            style={{
              marginTop: 6,
              padding: '4px 6px',
              borderRadius: 4,
              backgroundColor: status === 'error' ? '#450a0a' : '#422006',
              border: `1px solid ${status === 'error' ? '#b91c1c' : '#a16207'}`,
              color: status === 'error' ? '#fca5a5' : '#fef08a',
              fontSize: '0.68rem',
              lineHeight: 1.3,
            }}
          >
            {nodeData.problemMessage}
          </div>
        )}
      </div>
    </div>
  );
};
