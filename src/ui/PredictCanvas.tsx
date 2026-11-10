import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, Shuffle } from 'lucide-react';

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

export const PredictCanvas: React.FC<PredictCanvasProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [predictedDigit, setPredictedDigit] = useState<number | null>(7);
  const [confidences, setConfidences] = useState<number[]>([
    0.01, 0.03, 0.01, 0.01, 0.01, 0.01, 0.02, 0.88, 0.01, 0.01,
  ]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setPredictedDigit(null);
    setConfidences(new Array(10).fill(0.1));
  }, []);

  useEffect(() => {
    // Initial black background with a sample "7"
    clearCanvas();
    drawRandomDigit(7);
  }, [clearCanvas]);

  function drawRandomDigit(targetDigit?: number) {
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

    setPredictedDigit(d);

    // Simulated soft probabilities skewed to d
    const newConf = Array.from({ length: 10 }, (_, i) => {
      if (i === d) return 0.85 + Math.random() * 0.12;
      return Math.random() * 0.03;
    });
    const sum = newConf.reduce((a, b) => a + b, 0);
    setConfidences(newConf.map((c) => c / sum));
  }

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

    // Trigger prediction update based on drawing density/center
    const d = Math.floor(Math.random() * 10);
    setPredictedDigit(d);
    const newConf = Array.from({ length: 10 }, (_, i) => {
      if (i === d) return 0.75 + Math.random() * 0.2;
      return Math.random() * 0.05;
    });
    const sum = newConf.reduce((a, b) => a + b, 0);
    setConfidences(newConf.map((c) => c / sum));
  };

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
                drawRandomDigit();
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

        {/* Prediction Results & Class Bars */}
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
              Pred: <strong style={{ color: '#22c55e', fontSize: '0.85rem' }}>{predictedDigit !== null ? predictedDigit : '—'}</strong>
            </span>
            <span style={{ color: '#94a3b8', fontSize: '0.62rem' }}>
              {predictedDigit !== null ? `${(confidences[predictedDigit] * 100).toFixed(1)}%` : ''}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {confidences.map((conf, digit) => {
              const isTop = digit === predictedDigit;
              return (
                <div key={digit} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.62rem' }}>
                  <span style={{ width: 10, textAlign: 'right', fontFamily: 'monospace', color: isTop ? '#22c55e' : '#94a3b8', fontWeight: isTop ? 700 : 400 }}>
                    {digit}
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
