import React, { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { useGraphStore } from '../core/store';
import { getAllNodeDefinitions } from '../nodes/registry';
import { NodeDefinition } from '../nodes/types';

const GROUP_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Data: { bg: '#082f49', text: '#38bdf8', dot: '#38bdf8' },
  Layers: { bg: '#064e3b', text: '#34d399', dot: '#10b981' },
  Activation: { bg: '#1e1b4b', text: '#818cf8', dot: '#6366f1' },
  Combine: { bg: '#451a03', text: '#fbbf24', dot: '#f59e0b' },
  Training: { bg: '#3b0764', text: '#d8b4fe', dot: '#c084fc' },
  Utility: { bg: '#1e293b', text: '#94a3b8', dot: '#64748b' },
};

export const NodePalette: React.FC = () => {
  const [search, setSearch] = useState('');
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

  // Filter definitions based on search query
  const filteredDefs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return definitions;
    return definitions.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        d.group.toLowerCase().includes(q) ||
        d.summary?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q)
    );
  }, [definitions, search]);

  // Group definitions by category
  const groups = useMemo(() => {
    return filteredDefs.reduce<Record<string, NodeDefinition[]>>((acc, def) => {
      if (!acc[def.group]) {
        acc[def.group] = [];
      }
      acc[def.group].push(def);
      return acc;
    }, {});
  }, [filteredDefs]);

  return (
    <aside
      style={{
        width: '235px',
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
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#cbd5e1',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Layer Palette</span>
          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500 }}>
            {filteredDefs.length} types
          </span>
        </div>

        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 6,
          }}
        >
          <Search size={13} color="#64748b" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search layers (Conv, ReLU...)"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: '0.72rem',
              width: '100%',
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
        {Object.entries(groups).length === 0 ? (
          <div style={{ padding: '20px 10px', textAlign: 'center', color: '#64748b', fontSize: '0.75rem' }}>
            No layers matching &quot;{search}&quot;
          </div>
        ) : (
          Object.entries(groups).map(([groupName, defs]) => {
            const colors = GROUP_COLORS[groupName] || GROUP_COLORS.Utility;

            return (
              <div key={groupName} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: colors.text,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 6,
                    padding: '2px 6px',
                    borderRadius: 4,
                    backgroundColor: colors.bg,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: colors.dot }} />
                  <span>{groupName}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {defs.map((def) => (
                    <button
                      key={def.type}
                      onClick={() => handleAddNode(def)}
                      title={def.description}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '7px 9px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: 6,
                        color: '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'left',
                        gap: 8,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#243247';
                        e.currentTarget.style.borderColor = colors.dot;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#1e293b';
                        e.currentTarget.style.borderColor = '#334155';
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.78rem' }}>{def.label}</span>
                        </div>
                        {def.summary && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              color: '#94a3b8',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginTop: 1,
                            }}
                          >
                            {def.summary}
                          </span>
                        )}
                      </div>
                      <Plus size={13} color={colors.text} style={{ flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
