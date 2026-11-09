import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import { CustomNode } from './CustomNode';
import { useGraphStore } from '../core/store';
import { parseSocketRef } from '../core/graph';

const nodeTypes = {
  customNode: CustomNode,
};

export const Editor: React.FC = () => {
  const graph = useGraphStore((state) => state.graph);
  const addEdgeToStore = useGraphStore((state) => state.addEdge);
  const removeEdgeFromStore = useGraphStore((state) => state.removeEdge);
  const updateNodePosition = useGraphStore((state) => state.updateNodePosition);
  const removeNodeFromStore = useGraphStore((state) => state.removeNode);

  // Convert canonical Graph nodes to React Flow nodes
  const rfNodes: Node[] = useMemo(() => {
    return graph.nodes.map((n) => ({
      id: n.id,
      type: 'customNode',
      position: n.position || { x: 100, y: 100 },
      data: {
        type: n.type,
        params: n.params,
      },
    }));
  }, [graph.nodes]);

  // Convert canonical Graph edges to React Flow edges
  const rfEdges: Edge[] = useMemo(() => {
    return graph.edges.map((e) => {
      const fromRef = parseSocketRef(e.from);
      const toRef = parseSocketRef(e.to);
      return {
        id: `e-${e.from}->${e.to}`,
        source: fromRef.nodeId,
        sourceHandle: fromRef.socketId,
        target: toRef.nodeId,
        targetHandle: toRef.socketId,
        animated: true,
        style: { stroke: '#38bdf8', strokeWidth: 2 },
      };
    });
  }, [graph.edges]);

  // Handle new wire connection
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const sourceHandle = connection.sourceHandle || 'out';
      const targetHandle = connection.targetHandle || 'in';

      const from = `${connection.source}.${sourceHandle}`;
      const to = `${connection.target}.${targetHandle}`;

      addEdgeToStore(from, to);
    },
    [addEdgeToStore]
  );

  // Handle node drag and positioning
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (change.type === 'position' && change.position && change.id) {
          updateNodePosition(change.id, change.position);
        } else if (change.type === 'remove' && change.id) {
          removeNodeFromStore(change.id);
        }
      }
    },
    [updateNodePosition, removeNodeFromStore]
  );

  // Handle edge deletions
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type === 'remove' && change.id) {
          const edge = rfEdges.find((e) => e.id === change.id);
          if (edge && edge.source && edge.target) {
            const from = `${edge.source}.${edge.sourceHandle || 'out'}`;
            const to = `${edge.target}.${edge.targetHandle || 'in'}`;
            removeEdgeFromStore(from, to);
          }
        }
      }
    },
    [rfEdges, removeEdgeFromStore]
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onConnect={handleConnect}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        fitView
        minZoom={0.2}
        maxZoom={2.5}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="#334155"
        />
        <Controls position="bottom-right" showInteractive={false} />
      </ReactFlow>
    </div>
  );
};
