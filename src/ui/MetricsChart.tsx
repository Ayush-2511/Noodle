import React from 'react';
import { EpochLog } from '../backends/tfjs/useTrainingWorker';

interface MetricsChartProps {
  history: EpochLog[];
}

export const MetricsChart: React.FC<MetricsChartProps> = ({ history }) => {
  const width = 206;
  const height = 90;
  const padLeft = 24;
  const padRight = 10;
  const padTop = 14;
  const padBottom = 16;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  if (!history || history.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height,
          backgroundColor: '#090d16',
          borderRadius: 4,
          border: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          color: '#64748b',
          fontSize: '0.68rem',
          fontFamily: 'monospace',
        }}
      >
        <span style={{ color: '#475569' }}>[ Telemetry Plot ]</span>
        <span>Awaiting training...</span>
      </div>
    );
  }

  // Calculate coordinates
  const losses = history.map((h) => h.loss);

  const maxLoss = Math.max(...losses, 1.0);
  const minLoss = Math.min(...losses, 0.0);
  const lossSpan = maxLoss - minLoss || 1.0;

  const getX = (idx: number) => {
    if (history.length === 1) return padLeft + plotWidth / 2;
    return padLeft + (idx / (history.length - 1)) * plotWidth;
  };

  const getLossY = (val: number) => {
    const norm = (val - minLoss) / lossSpan;
    return padTop + plotHeight - norm * plotHeight;
  };

  const getAccY = (val: number) => {
    // Accuracy 0..1
    const clamped = Math.max(0, Math.min(1, val));
    return padTop + plotHeight - clamped * plotHeight;
  };

  const lossPoints = history.map((h, i) => `${getX(i)},${getLossY(h.loss)}`).join(' ');
  const accPoints = history.map((h, i) => `${getX(i)},${getAccY(h.accuracy)}`).join(' ');

  const latest = history[history.length - 1];

  return (
    <div style={{ backgroundColor: '#090d16', borderRadius: 4, border: '1px solid #1e293b', padding: '4px 0' }}>
      <svg width={width} height={height} style={{ overflow: 'visible', display: 'block' }}>
        {/* Background Grid Lines */}
        <line
          x1={padLeft}
          y1={padTop}
          x2={width - padRight}
          y2={padTop}
          stroke="#1e293b"
          strokeDasharray="2,2"
        />
        <line
          x1={padLeft}
          y1={padTop + plotHeight / 2}
          x2={width - padRight}
          y2={padTop + plotHeight / 2}
          stroke="#1e293b"
          strokeDasharray="2,2"
        />
        <line
          x1={padLeft}
          y1={padTop + plotHeight}
          x2={width - padRight}
          y2={padTop + plotHeight}
          stroke="#334155"
        />

        {/* Y Axis Reference */}
        <text x={padLeft - 4} y={padTop + 4} fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">
          {maxLoss > 10 ? maxLoss.toFixed(0) : maxLoss.toFixed(1)}
        </text>
        <text x={padLeft - 4} y={padTop + plotHeight} fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">
          0.0
        </text>

        {/* Loss Curve (Orange) */}
        {history.length > 1 ? (
          <polyline fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={lossPoints} />
        ) : null}
        {history.map((h, i) => (
          <circle key={`l-${i}`} cx={getX(i)} cy={getLossY(h.loss)} r="3" fill="#f97316" />
        ))}

        {/* Accuracy Curve (Green) */}
        {history.length > 1 ? (
          <polyline fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={accPoints} />
        ) : null}
        {history.map((h, i) => (
          <circle key={`a-${i}`} cx={getX(i)} cy={getAccY(h.accuracy)} r="3" fill="#22c55e" />
        ))}

        {/* X Axis Epoch Markers */}
        {history.map((h, i) => {
          const shouldShowLabel =
            history.length <= 8 ||
            i === 0 ||
            i === history.length - 1 ||
            i % Math.ceil(history.length / 5) === 0;

          if (!shouldShowLabel) return null;

          return (
            <text
              key={`x-${i}`}
              x={getX(i)}
              y={height - 2}
              fill="#64748b"
              fontSize="8"
              textAnchor="middle"
              fontFamily="monospace"
            >
              e{h.epoch}
            </text>
          );
        })}
      </svg>

      {/* Legend & Latest Values */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px 0 8px',
          borderTop: '1px solid #1e293b',
          fontSize: '0.68rem',
          fontFamily: 'monospace',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#f97316' }} />
          <span style={{ color: '#f97316' }}>Loss: {latest.loss.toFixed(3)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e' }} />
          <span style={{ color: '#22c55e' }}>Acc: {(latest.accuracy * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};

