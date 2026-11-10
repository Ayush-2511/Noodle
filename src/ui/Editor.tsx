import React, { useMemo, useCallback, useState, useEffect } from 'react';
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
  applyNodeChanges,
  applyEdgeChanges,
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

  // Structural fingerprint: excludes node positions so dragging never triggers graph re-validation
  const structuralKey = useMemo(() => {
    return JSON.stringify({
      nodes: graph.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        params: n.params,
        layers: n.layers,
      })),
      edges: graph.edges,
    });
  }, [graph.nodes, graph.edges]);

  // Run pure validator only when topology, params, or layers actually change
  const validationResult = useMemo(() => {
    return validate(graph);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structuralKey]);

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
          layers: n.layers,
          status: nodeStatus?.status || 'ok',
          outputShapes: nodeStatus?.outputShapes || {},
          paramCount: nodeStatus?.paramCount || 0,
          problemMessage: nodeStatus?.problemMessage,
          fixHint: nodeStatus?.fixHint,
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
          dataType: wireValidation?.dataType,
          message: wireValidation?.message,
          fixHint: wireValidation?.fixHint,
        },
      };
    });
  }, [graph.edges, validationResult]);

  // Local React Flow state for buttery 120fps hardware-accelerated dragging
  const [nodes, setNodes] = useState<Node[]>(rfNodes);
  const [edges, setEdges] = useState<Edge[]>(rfEdges);

  // Synchronize when canonical structure changes (nodes added/removed, params edited, selection)
  useEffect(() => {
    setNodes(rfNodes);
  }, [rfNodes]);

  useEffect(() => {
    setEdges(rfEdges);
  }, [rfEdges]);

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

  // Handle local node drag without polluting the global store on every single frame
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));

      for (const change of changes) {
        if (change.type === 'remove' && change.id) {
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
    [removeNodeFromStore, setSelectedNodeId, selectedNodeId]
  );

  // Commit the final position to persistent Zustand store only when dragging concludes!
  const handleNodeDragStop = useCallback(
    (_: any, node: Node) => {
      updateNodePosition(node.id, node.position);
    },
    [updateNodePosition]
  );

  // Handle edge deletions
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));

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
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onConnect={handleConnect}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeDragStop={handleNodeDragStop}
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
          size={1.2}
          color="#262626"
        />
        <Controls position="bottom-right" showInteractive={false} />
      </ReactFlow>
    </div>
  );
};
