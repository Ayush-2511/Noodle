import React, { useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from '@xyflow/react';
import { AlertCircle, Info } from 'lucide-react';
import { WireStatus } from '../core/validator';

export interface CustomEdgeData {
  status: WireStatus; // 'valid', 'error', 'unknown'
  shape: string; // e.g. "[B, 128]" or "unknown"
  dataType?: 'dataset' | 'model' | 'metrics' | 'tensor' | 'scalar' | 'optimizer';
  message?: string;
  fixHint?: string;
}

export const CustomEdge: React.FC<EdgeProps> = React.memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const [hovered, setHovered] = useState(false);
  const edgeData = (data as unknown as CustomEdgeData) || {
    status: 'valid',
    shape: 'unknown',
  };

  // Wire styling by data type and validity status:
  let strokeColor = '#0078d4'; // Fluent blue (default)
  let badgeBg = '#1e1e1e';
  let badgeBorder = '#333333';
  let badgeText = '#cccccc';

  if (edgeData.status === 'error') {
    strokeColor = '#a80000'; // crimson
    badgeBg = '#2a1a1a';
    badgeBorder = '#552222';
    badgeText = '#ff8888';
  } else if (edgeData.status === 'unknown') {
    strokeColor = '#555555'; // grey
    badgeBg = '#181818';
    badgeBorder = '#2d2d2d';
    badgeText = '#888888';
  } else if (edgeData.dataType === 'dataset') {
    strokeColor = '#0078d4'; // Blue
    badgeBg = '#1e1e1e';
    badgeBorder = '#005a9e';
    badgeText = '#80c0ff';
  } else if (edgeData.dataType === 'model') {
    strokeColor = '#886ce4'; // Muted violet
    badgeBg = '#1e1e1e';
    badgeBorder = '#554488';
    badgeText = '#d0c4f8';
  } else if (edgeData.dataType === 'metrics') {
    strokeColor = '#107c41'; // Green
    badgeBg = '#1e1e1e';
    badgeBorder = '#1c663a';
    badgeText = '#70d090';
  }

  const isError = edgeData.status === 'error';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: isError ? 3 : 2,
          strokeDasharray: isError ? '5,5' : undefined,
          transition: 'stroke 0.2s ease',
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            zIndex: 10,
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Wire Shape Badge (Section 9.2) */}
          <div
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: badgeBg,
              border: `1px solid ${badgeBorder}`,
              color: badgeText,
              fontSize: '0.68rem',
              fontWeight: 600,
              fontFamily: 'monospace',
              letterSpacing: '0.02em',
              boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
              cursor: isError ? 'help' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {isError && <AlertCircle size={11} color="#f48771" />}
            <span>{isError ? 'Shape Mismatch' : edgeData.shape || '[B]'}</span>
          </div>

          {/* Hover Error Tooltip */}
          {isError && hovered && edgeData.message && (
            <div
              style={{
                position: 'absolute',
                top: '120%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 240,
                backgroundColor: '#252526',
                border: '1px solid #f48771',
                borderRadius: 4,
                padding: '8px 10px',
                color: '#cccccc',
                fontSize: '0.72rem',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
                zIndex: 20,
                pointerEvents: 'none',
              }}
            >
              <div style={{ fontWeight: 600, color: '#f48771', marginBottom: 4 }}>
                {edgeData.message}
              </div>
              {edgeData.fixHint && (
                <div style={{ color: '#888888', fontSize: '0.68rem', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                  <Info size={12} color="#0078d4" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{edgeData.fixHint}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
