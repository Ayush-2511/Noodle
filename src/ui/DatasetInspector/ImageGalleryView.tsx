import React, { useState, useEffect, useRef } from 'react';
import { getAuthenticSample } from '../../core/authenticDatasets';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageGalleryViewProps {
  datasetId: string;
  classes: string[];
  totalSamples: number;
}

interface SelectedSampleDetail {
  index: number;
  label: number;
  className: string;
  pixels: Float32Array;
  min: number;
  max: number;
  mean: number;
}

export const ImageGalleryView: React.FC<ImageGalleryViewProps> = ({
  datasetId,
  classes,
  totalSamples,
}) => {
  const [selectedClass, setSelectedClass] = useState<number | 'all'>('all');
  const [page, setPage] = useState(0);
  const pageSize = 36;
  const [inspectDetail, setInspectDetail] = useState<SelectedSampleDetail | null>(null);

  // Filter sample indices matching selected class
  const classFilteredIndices = React.useMemo(() => {
    const indices: number[] = [];
    const limit = Math.min(totalSamples, 2000); // Pool of samples to paginate through
    for (let i = 0; i < limit; i++) {
      const label = i % classes.length;
      if (selectedClass === 'all' || selectedClass === label) {
        indices.push(i);
      }
    }
    return indices;
  }, [selectedClass, classes.length, totalSamples]);

  const maxPages = Math.max(1, Math.ceil(classFilteredIndices.length / pageSize));
  const currentIndices = classFilteredIndices.slice(page * pageSize, (page + 1) * pageSize);

  const handlePrevPage = () => setPage((p) => Math.max(0, p - 1));
  const handleNextPage = () => setPage((p) => Math.min(maxPages - 1, p + 1));

  // Reset page when filter changes
  useEffect(() => {
    setPage(0);
  }, [selectedClass]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      {/* Class Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          backgroundColor: '#0f172a',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid #1e293b',
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
          Filter Class:
        </span>
        <button
          onClick={() => setSelectedClass('all')}
          style={{
            padding: '4px 10px',
            fontSize: '0.72rem',
            borderRadius: '6px',
            backgroundColor: selectedClass === 'all' ? '#38bdf8' : '#1e293b',
            color: selectedClass === 'all' ? '#0f172a' : '#cbd5e1',
            fontWeight: selectedClass === 'all' ? 700 : 500,
            border: '1px solid #334155',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          All Classes ({totalSamples.toLocaleString()})
        </button>

        {classes.map((cls, idx) => {
          const isActive = selectedClass === idx;
          return (
            <button
              key={idx}
              onClick={() => setSelectedClass(idx)}
              style={{
                padding: '4px 9px',
                fontSize: '0.72rem',
                borderRadius: '6px',
                backgroundColor: isActive ? '#6366f1' : '#1e293b',
                color: isActive ? '#ffffff' : '#94a3b8',
                fontWeight: isActive ? 600 : 400,
                border: isActive ? '1px solid #818cf8' : '1px solid #334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {idx}: {cls}
            </button>
          );
        })}
      </div>

      {/* Main Grid View */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '12px',
          paddingRight: '6px',
        }}
      >
        {currentIndices.map((sampleIdx) => (
          <SampleCard
            key={sampleIdx}
            datasetId={datasetId}
            sampleIndex={sampleIdx}
            isSelected={inspectDetail?.index === sampleIdx}
            onInspect={(detail) => setInspectDetail(detail)}
          />
        ))}
      </div>

      {/* Bottom Pagination & Inspector Tray */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: '#0f172a',
          borderRadius: '8px',
          border: '1px solid #1e293b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handlePrevPage}
            disabled={page === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: '#1e293b',
              color: page === 0 ? '#475569' : '#cbd5e1',
              border: '1px solid #334155',
              fontSize: '0.75rem',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft size={14} />
            Prev
          </button>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Page <strong style={{ color: '#f8fafc' }}>{page + 1}</strong> of {maxPages} (
            {classFilteredIndices.length} filtered items)
          </span>
          <button
            onClick={handleNextPage}
            disabled={page >= maxPages - 1}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: '#1e293b',
              color: page >= maxPages - 1 ? '#475569' : '#cbd5e1',
              border: '1px solid #334155',
              fontSize: '0.75rem',
              cursor: page >= maxPages - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>

        {inspectDetail && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.75rem' }}>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>
              Inspecting #{inspectDetail.index} [{inspectDetail.className}]
            </span>
            <span style={{ color: '#94a3b8' }}>
              Shape: <strong>[1, 28, 28]</strong>
            </span>
            <span style={{ color: '#94a3b8' }}>
              Intensity Range: [{inspectDetail.min.toFixed(2)}, {inspectDetail.max.toFixed(2)}]
            </span>
            <span style={{ color: '#94a3b8' }}>
              Mean: <strong>{inspectDetail.mean.toFixed(3)}</strong>
            </span>
            <button
              onClick={() => setInspectDetail(null)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface SampleCardProps {
  datasetId: string;
  sampleIndex: number;
  isSelected: boolean;
  onInspect: (detail: SelectedSampleDetail) => void;
}

const SampleCard: React.FC<SampleCardProps> = ({
  datasetId,
  sampleIndex,
  isSelected,
  onInspect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sample = React.useMemo(
    () => getAuthenticSample(datasetId, sampleIndex),
    [datasetId, sampleIndex]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(28, 28);
    for (let i = 0; i < 784; i++) {
      const val = Math.floor(sample.pixels[i] * 255);
      imgData.data[i * 4 + 0] = val; // R
      imgData.data[i * 4 + 1] = val; // G
      imgData.data[i * 4 + 2] = val; // B
      imgData.data[i * 4 + 3] = 255; // A
    }
    ctx.putImageData(imgData, 0, 0);
  }, [sample]);

  const handleCardClick = () => {
    let min = 1.0;
    let max = 0.0;
    let sum = 0;
    for (let i = 0; i < sample.pixels.length; i++) {
      const val = sample.pixels[i];
      if (val < min) min = val;
      if (val > max) max = val;
      sum += val;
    }
    const mean = sum / sample.pixels.length;

    onInspect({
      index: sampleIndex,
      label: sample.label,
      className: sample.className,
      pixels: sample.pixels,
      min,
      max,
      mean,
    });
  };

  return (
    <div
      onClick={handleCardClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px',
        backgroundColor: isSelected ? '#1e293b' : '#0f172a',
        borderRadius: '8px',
        border: isSelected ? '2px solid #38bdf8' : '1px solid #1e293b',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: isSelected ? '0 0 10px rgba(56, 189, 248, 0.3)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = '#475569';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = '#1e293b';
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '1',
          backgroundColor: '#000000',
          borderRadius: '6px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #334155',
          marginBottom: '6px',
        }}
      >
        <canvas
          ref={canvasRef}
          width={28}
          height={28}
          style={{
            width: '100%',
            height: '100%',
            imageRendering: 'pixelated',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          fontSize: '0.7rem',
        }}
      >
        <span style={{ color: '#64748b', fontFamily: 'monospace' }}>#{sampleIndex}</span>
        <span
          style={{
            backgroundColor: '#1e1b4b',
            color: '#a5b4fc',
            padding: '1px 6px',
            borderRadius: '4px',
            fontWeight: 600,
            border: '1px solid #4338ca',
          }}
        >
          {sample.className}
        </span>
      </div>
    </div>
  );
};
