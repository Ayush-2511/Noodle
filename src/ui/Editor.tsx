import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  Node,
  Edge,
} from '@xyflow/react';

export interface EditorProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
}

export const Editor: React.FC<EditorProps> = ({
  initialNodes = [],
  initialEdges = [],
}) => {
  const nodes = useMemo(() => initialNodes, [initialNodes]);
  const edges = useMemo(() => initialEdges, [initialEdges]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
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
