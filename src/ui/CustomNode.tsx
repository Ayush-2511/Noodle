import React, { useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import { getNodeDefinition } from '../nodes/registry';
import { useGraphStore } from '../core/store';

export interface CustomNodeData {
  type: string;
  params: Record<string, any>;
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

  return (
    <div
      style={{
        width: 220,
        backgroundColor: '#1e293b',
        borderRadius: 8,
        border: selected ? '2px solid #38bdf8' : '1px solid #334155',
        boxShadow: selected
          ? '0 0 15px rgba(56, 189, 248, 0.35)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        color: '#f8fafc',
        fontSize: '0.8rem',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Node Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #334155',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.65rem' }}>🟢</span>
          <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{def.label}</span>
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
      <div style={{ padding: '8px 10px' }}>
        {/* Input Sockets */}
        {def.inputs.map((input) => (
          <div
            key={input.id}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <Handle
              type="target"
              position={Position.Left}
              id={input.id}
              style={{
                left: -15,
                width: 10,
                height: 10,
                backgroundColor: '#38bdf8',
                border: '2px solid #0f172a',
              }}
            />
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 2 }}>
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
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginRight: 2 }}>
              {output.label}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={output.id}
              style={{
                right: -15,
                width: 10,
                height: 10,
                backgroundColor: '#22c55e',
                border: '2px solid #0f172a',
              }}
            />
          </div>
        ))}

        {/* Parameter Fields */}
        {def.paramFields.length > 0 && (
          <div
            style={{
              marginTop: 6,
              paddingTop: 6,
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
                        width: '75px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #475569',
                        borderRadius: 4,
                        color: '#f8fafc',
                        padding: '2px 6px',
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
                        padding: '2px 4px',
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
                      padding: '2px 6px',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
