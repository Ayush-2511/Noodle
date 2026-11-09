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
import { CustomEdge } from './CustomEdge';
import { useGraphStore } from '../core/store';
import { parseSocketRef } from '../core/graph';
import { validate } from '../core/validator';

const nodeTypes = {
  customNode: CustomNode,
};

const edgeTypes = {
  customEdge: CustomEdge,
};

export const Editor: React.FC = () => {
  const graph = useGraphStore((state) => state.graph);
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useGraphStore((state) => state.setSelectedNodeId);
  const addEdgeToStore = useGraphStore((state) => state.addEdge);
  const removeEdgeFromStore = useGraphStore((state) => state.removeEdge);
  const updateNodePosition = useGraphStore((state) => state.updateNodePosition);
  const removeNodeFromStore = useGraphStore((state) => state.removeNode);

  // Run pure validator on the canonical graph
  const validationResult = useMemo(() => {
    return validate(graph);
  }, [graph]);

  // Convert canonical Graph nodes to React Flow nodes with validation status
  const rfNodes: Node[] = useMemo(() => {
    return graph.nodes.map((n) => {
      const nodeStatus = validationResult.nodeStatuses.get(n.id);
      return {
        id: n.id,
        type: 'customNode',
        position: n.position || { x: 100, y: 100 },
        selected: n.id === selectedNodeId,
        data: {
          type: n.type,
          params: n.params,
          status: nodeStatus?.status || 'ok',
          outputShapes: nodeStatus?.outputShapes || {},
          paramCount: nodeStatus?.paramCount || 0,
          problemMessage: nodeStatus?.problemMessage,
        },
      };
    });
  }, [graph.nodes, selectedNodeId, validationResult]);

  // Convert canonical Graph edges to React Flow edges with shape & color data
  const rfEdges: Edge[] = useMemo(() => {
    return graph.edges.map((e) => {
      const fromRef = parseSocketRef(e.from);
      const toRef = parseSocketRef(e.to);
      const wireKey = `${e.from}->${e.to}`;
      const wireValidation = validationResult.wireStatuses.get(wireKey);

      return {
        id: `e-${e.from}->${e.to}`,
        type: 'customEdge',
        source: fromRef.nodeId,
        sourceHandle: fromRef.socketId,
        target: toRef.nodeId,
        targetHandle: toRef.socketId,
        data: {
          status: wireValidation?.status || 'valid',
          shape: wireValidation?.shape || '[B]',
          message: wireValidation?.message,
          fixHint: wireValidation?.fixHint,
        },
      };
    });
  }, [graph.edges, validationResult]);

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

  // Handle node drag, position update, and selection
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (change.type === 'position' && change.position && change.id) {
          updateNodePosition(change.id, change.position);
        } else if (change.type === 'remove' && change.id) {
          removeNodeFromStore(change.id);
        } else if (change.type === 'select') {
          if (change.selected) {
            setSelectedNodeId(change.id);
          } else if (selectedNodeId === change.id) {
            setSelectedNodeId(null);
          }
        }
      }
    },
    [updateNodePosition, removeNodeFromStore, setSelectedNodeId, selectedNodeId]
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
        edgeTypes={edgeTypes}
        onConnect={handleConnect}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
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
