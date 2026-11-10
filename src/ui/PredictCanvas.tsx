import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, Shuffle } from 'lucide-react';
import { useTrainingSafe } from '../backends/tfjs/TrainingContext';
import { useGraphStore } from '../core/store';
import { getDatasetMeta } from '../core/datasets';

interface PredictCanvasProps {
  nodeId: string;
}

// Sample 28x28 digit prototypes for the [Random] button
const SAMPLE_DIGITS: Record<number, number[][]> = {
  0: [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 0, 0],
    [0, 1, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  1: [
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  3: [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 1, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  7: [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  8: [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 0, 0],
    [0, 1, 0, 0, 1, 0, 0],
    [0, 0, 1, 1, 0, 0, 0],
    [0, 1, 0, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
};

function extractCanvasPixels(canvas: HTMLCanvasElement): number[] {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 28;
  tempCanvas.height = 28;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return new Array(784).fill(0);

  tempCtx.drawImage(canvas, 0, 0, 28, 28);
  const imgData = tempCtx.getImageData(0, 0, 28, 28);
  const pixels: number[] = [];

  for (let i = 0; i < imgData.data.length; i += 4) {
    const r = imgData.data[i];
    const g = imgData.data[i + 1];
    const b = imgData.data[i + 2];
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    pixels.push(brightness);
  }

  return pixels;
}

export const PredictCanvas: React.FC<PredictCanvasProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [predictedIndex, setPredictedIndex] = useState<number | null>(null);
  const [confidences, setConfidences] = useState<number[]>([]);

  const training = useTrainingSafe();
  const graph = useGraphStore((state) => state.graph);

  const trainingRef = useRef(training);
  trainingRef.current = training;
  const graphRef = useRef(graph);
  graphRef.current = graph;

  // Extract active dataset metadata to retrieve dynamic classes
  const datasetNode = graph.nodes.find((n) => n.type === 'LoadDataset' || n.type === 'Dataset');
  const datasetId = String(datasetNode?.params.dataset || datasetNode?.params.name || 'mnist');
  const meta = getDatasetMeta(datasetId);
  const classes = meta.classes;

  const triggerRealPrediction = useCallback(
    async (canvas: HTMLCanvasElement) => {
      const activeTraining = trainingRef.current;
      if (!activeTraining) return;
      const pixels = extractCanvasPixels(canvas);

      try {
        const result = await activeTraining.runPrediction(pixels, [1, 28, 28, 1], graphRef.current);
        setPredictedIndex(result.topClass);
        setConfidences(result.probabilities);
      } catch (err) {
        console.warn('Real prediction inference failed:', err);
      }
    },
    []
  );

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setPredictedIndex(null);
    setConfidences([]);
  }, []);

  const drawRandomSample = useCallback(
    (targetDigit?: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const digits = [0, 1, 3, 7, 8];
      const d = targetDigit !== undefined ? targetDigit : digits[Math.floor(Math.random() * digits.length)];
      const proto = SAMPLE_DIGITS[d] || SAMPLE_DIGITS[7];

      ctx.fillStyle = '#f8fafc';
      const cellW = canvas.width / 7;
      const cellH = canvas.height / 7;

      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (proto[r][c] === 1) {
            ctx.beginPath();
            ctx.arc(c * cellW + cellW / 2, r * cellH + cellH / 2, cellW * 0.42, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      triggerRealPrediction(canvas);
    },
    [triggerRealPrediction]
  );

  // Initialize once on mount with sample digit 7
  useEffect(() => {
    drawRandomSample(7);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleStartDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleEndDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.stopPropagation();
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas) {
      triggerRealPrediction(canvas);
    }
  };

  const displayLabel = predictedIndex !== null && classes[predictedIndex] ? classes[predictedIndex] : '—';
  const displayConfidence =
    predictedIndex !== null && confidences[predictedIndex] !== undefined
      ? `${(confidences[predictedIndex] * 100).toFixed(1)}%`
      : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {/* Drawing Canvas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <canvas
            ref={canvasRef}
            width={112}
            height={112}
            onMouseDown={handleStartDraw}
            onMouseMove={handleDraw}
            onMouseUp={handleEndDraw}
            onMouseLeave={handleEndDraw}
            onTouchStart={handleStartDraw}
            onTouchMove={handleDraw}
            onTouchEnd={handleEndDraw}
            style={{
              width: 112,
              height: 112,
              backgroundColor: '#0f172a',
              borderRadius: 6,
              border: '2px solid #38bdf8',
              cursor: 'crosshair',
              touchAction: 'none',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.6)',
            }}
          />
          <div style={{ display: 'flex', gap: 4, width: 112 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearCanvas();
              }}
              style={{
                flex: 1,
                padding: '3px 4px',
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: 3,
                color: '#cbd5e1',
                fontSize: '0.62rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}
            >
              <RotateCcw size={10} />
              <span>Clear</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                drawRandomSample();
              }}
              style={{
                flex: 1,
                padding: '3px 4px',
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: 3,
                color: '#38bdf8',
                fontSize: '0.62rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}
            >
              <Shuffle size={10} />
              <span>Random</span>
            </button>
          </div>
        </div>

        {/* Prediction Results & Dynamic Class Bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div
            style={{
              padding: '3px 6px',
              backgroundColor: '#0f172a',
              borderRadius: 4,
              border: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.7rem',
            }}
          >
            <span>
              Pred: <strong style={{ color: '#22c55e', fontSize: '0.85rem' }}>{displayLabel}</strong>
            </span>
            <span style={{ color: '#94a3b8', fontSize: '0.62rem' }}>
              {displayConfidence}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 115, overflowY: 'auto' }}>
            {classes.map((clsName, idx) => {
              const conf = confidences[idx] ?? (1 / classes.length);
              const isTop = idx === predictedIndex;

              return (
                <div key={clsName} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.62rem' }}>
                  <span
                    title={clsName}
                    style={{
                      width: 42,
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      color: isTop ? '#22c55e' : '#94a3b8',
                      fontWeight: isTop ? 700 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {clsName}
                  </span>
                  <div style={{ flex: 1, height: 5, backgroundColor: '#0f172a', borderRadius: 2, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(2, conf * 100))}%`,
                        height: '100%',
                        backgroundColor: isTop ? '#22c55e' : '#38bdf8',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                  <span style={{ width: 28, textAlign: 'right', fontFamily: 'monospace', color: isTop ? '#22c55e' : '#64748b', fontSize: '0.58rem' }}>
                    {(conf * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

