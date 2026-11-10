import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Database,
  Cpu,
  Layers,
  Sparkles,
  GitFork,
  Activity,
  Sliders,
  Plus,
  LucideIcon,
} from 'lucide-react';
import { useGraphStore } from '../core/store';
import { getAllNodeDefinitions } from '../nodes/registry';
import { NodeDefinition } from '../nodes/types';

const CATEGORY_META: Record<string, { label: string; icon: LucideIcon }> = {
  Data: { label: 'Data Input', icon: Database },
  Pipeline: { label: 'Preprocessing', icon: Sliders },
  Model: { label: 'Model Architecture', icon: Cpu },
  Layers: { label: 'Neural Layers', icon: Layers },
  Activation: { label: 'Activations', icon: Sparkles },
  Combine: { label: 'Combine & Merge', icon: GitFork },
  Training: { label: 'Training & Eval', icon: Activity },
};

const CATEGORY_ORDER = ['Data', 'Pipeline', 'Model', 'Layers', 'Activation', 'Combine', 'Training'];
const ALL_NODE_DEFINITIONS = getAllNodeDefinitions();

export const NodePalette: React.FC = () => {
  const [search, setSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const addNode = useGraphStore((state) => state.addNode);
  const existingNodes = useGraphStore((state) => state.graph.nodes);
  const definitions = ALL_NODE_DEFINITIONS;

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const handleAddNode = (def: NodeDefinition) => {
    const count = existingNodes.length;
    const x = 140 + (count % 4) * 35;
    const y = 100 + (count % 5) * 45;
    addNode(def.type, def.defaultParams, { x, y });
  };

  const filteredDefs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return definitions;
    return definitions.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        d.group.toLowerCase().includes(q) ||
        d.summary?.toLowerCase().includes(q)
    );
  }, [definitions, search]);

  const groups = useMemo(() => {
    return filteredDefs.reduce<Record<string, NodeDefinition[]>>((acc, def) => {
      const g = def.group || 'Other';
      if (!acc[g]) acc[g] = [];
      acc[g].push(def);
      return acc;
    }, {});
  }, [filteredDefs]);

  return (
    <aside
      style={{
        width: '240px',
        backgroundColor: '#1e1e1e',
        borderRight: '1px solid #2d2d2d',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        zIndex: 5,
      }}
    >
      {/* Sidebar Header & Search */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #2d2d2d',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          backgroundColor: '#1f1f1f',
        }}
      >
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            color: '#a6a6a6',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Node Library</span>
          <span style={{ fontSize: '0.65rem', color: '#6e6e6e' }}>
            {definitions.length} nodes
          </span>
        </div>

        {/* Search input */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            size={12}
            color="#6e6e6e"
            style={{ position: 'absolute', left: 8, pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder="Filter nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#141414',
              border: '1px solid #333333',
              borderRadius: '4px',
              padding: '5px 8px 5px 26px',
              fontSize: '0.74rem',
              color: '#e1e1e1',
              outline: 'none',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#0078d4')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#333333')}
          />
        </div>
      </div>

      {/* Accordion List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {CATEGORY_ORDER.map((groupKey) => {
          const items = groups[groupKey];
          if (!items || items.length === 0) return null;

          const meta = CATEGORY_META[groupKey] || { label: groupKey, icon: Layers };
          const IconComp = meta.icon;
          const isCollapsed = collapsedGroups[groupKey];

          return (
            <div key={groupKey} style={{ marginBottom: '2px' }}>
              {/* Category Header */}
              <div
                onClick={() => toggleGroup(groupKey)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 12px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: '#8c8c8c',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  backgroundColor: '#1b1b1b',
                  borderTop: '1px solid #262626',
                  borderBottom: '1px solid #262626',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isCollapsed ? <ChevronRight size={11} color="#6e6e6e" /> : <ChevronDown size={11} color="#6e6e6e" />}
                  <IconComp size={12} color="#8c8c8c" />
                  <span>{meta.label}</span>
                </div>
                <span style={{ fontSize: '0.62rem', color: '#555555' }}>{items.length}</span>
              </div>

              {/* Items Tree */}
              {!isCollapsed && (
                <div style={{ padding: '2px 6px' }}>
                  {items.map((def) => (
                    <div
                      key={def.type}
                      onClick={() => handleAddNode(def)}
                      title={def.description || def.summary}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '5px 8px',
                        margin: '1px 0',
                        borderRadius: '3px',
                        fontSize: '0.75rem',
                        color: '#d4d4d4',
                        cursor: 'pointer',
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#2a2d2e';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#d4d4d4';
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{def.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            backgroundColor: '#262626',
                            color: '#808080',
                            border: '1px solid #333333',
                            fontFamily: 'Consolas, monospace',
                          }}
                        >
                          {def.type}
                        </span>
                        <Plus size={11} color="#6e6e6e" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
