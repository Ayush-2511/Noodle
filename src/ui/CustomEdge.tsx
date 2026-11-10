import React, { useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from '@xyflow/react';
import { WireStatus } from '../core/validator';

export interface CustomEdgeData {
  status: WireStatus; // 'valid', 'error', 'unknown'
  shape: string; // e.g. "[B, 128]" or "unknown"
  dataType?: 'dataset' | 'model' | 'metrics' | 'tensor' | 'scalar' | 'optimizer';
  message?: string;
  fixHint?: string;
}

export const CustomEdge: React.FC<EdgeProps> = ({
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
  // - dataset: 🔵 Blue (#38bdf8)
  // - model: 🟣 Purple (#a855f7)
  // - metrics: 🟠 Orange (#f59e0b)
  // - tensor / scalar: ⚪ White/Slate (#94a3b8) or Green (#22c55e)
  // - error: 🔴 Red (#ef4444)
  // - unknown: ⚪ Muted Grey (#64748b)
  let strokeColor = '#22c55e'; // green (default valid)
  let badgeBg = '#14532d';
  let badgeBorder = '#22c55e';
  let badgeText = '#86efac';

  if (edgeData.status === 'error') {
    strokeColor = '#ef4444'; // red
    badgeBg = '#7f1d1d';
    badgeBorder = '#ef4444';
    badgeText = '#fca5a5';
  } else if (edgeData.status === 'unknown') {
    strokeColor = '#64748b'; // grey
    badgeBg = '#1e293b';
    badgeBorder = '#475569';
    badgeText = '#94a3b8';
  } else if (edgeData.dataType === 'dataset') {
    strokeColor = '#38bdf8'; // Blue
    badgeBg = '#0c4a6e';
    badgeBorder = '#38bdf8';
    badgeText = '#7dd3fc';
  } else if (edgeData.dataType === 'model') {
    strokeColor = '#c084fc'; // Purple
    badgeBg = '#581c87';
    badgeBorder = '#c084fc';
    badgeText = '#f3e8ff';
  } else if (edgeData.dataType === 'metrics') {
    strokeColor = '#f59e0b'; // Orange
    badgeBg = '#78350f';
    badgeBorder = '#f59e0b';
    badgeText = '#fef3c7';
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
            {isError && <span>🔴</span>}
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
                backgroundColor: '#1e293b',
                border: '1px solid #ef4444',
                borderRadius: 6,
                padding: '8px 10px',
                color: '#f8fafc',
                fontSize: '0.72rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                zIndex: 20,
                pointerEvents: 'none',
              }}
            >
              <div style={{ fontWeight: 600, color: '#f87171', marginBottom: 4 }}>
                {edgeData.message}
              </div>
              {edgeData.fixHint && (
                <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>
                  💡 {edgeData.fixHint}
                </div>
              )}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
