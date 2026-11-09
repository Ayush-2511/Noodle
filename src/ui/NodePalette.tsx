import React from 'react';
import { Plus } from 'lucide-react';
import { useGraphStore } from '../core/store';
import { getAllNodeDefinitions } from '../nodes/registry';
import { NodeDefinition } from '../nodes/types';

export const NodePalette: React.FC = () => {
  const addNode = useGraphStore((state) => state.addNode);
  const existingNodes = useGraphStore((state) => state.graph.nodes);
  const definitions = getAllNodeDefinitions();

  const handleAddNode = (def: NodeDefinition) => {
    // Offset new node positions based on count so they don't land directly on top of each other
    const count = existingNodes.length;
    const x = 120 + (count % 4) * 40;
    const y = 100 + (count % 5) * 50;

    addNode(def.type, def.defaultParams, { x, y });
  };

  // Group definitions by category
  const groups = definitions.reduce<Record<string, NodeDefinition[]>>((acc, def) => {
    if (!acc[def.group]) {
      acc[def.group] = [];
    }
    acc[def.group].push(def);
    return acc;
  }, {});

  return (
    <aside
      style={{
        width: '210px',
        backgroundColor: '#0f172a',
        borderRight: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        zIndex: 5,
      }}
    >
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid #1e293b',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#cbd5e1',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Node Palette
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
        {Object.entries(groups).map(([groupName, defs]) => (
          <div key={groupName} style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 6,
                paddingLeft: 4,
              }}
            >
              {groupName}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {defs.map((def) => (
                <button
                  key={def.type}
                  onClick={() => handleAddNode(def)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    color: '#f8fafc',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#334155';
                    e.currentTarget.style.borderColor = '#38bdf8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#1e293b';
                    e.currentTarget.style.borderColor = '#334155';
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{def.label}</span>
                  <Plus size={14} color="#38bdf8" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
