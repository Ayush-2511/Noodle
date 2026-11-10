import React, { useState, useEffect, useRef } from 'react';
import { getAuthenticSample, TabularDataset } from '../../core/authenticDatasets';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageGalleryViewProps {
  datasetId: string;
  classes: string[];
  totalSamples: number;
  customDataset?: TabularDataset | null;
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
  customDataset,
}) => {
  const [selectedClass, setSelectedClass] = useState<number | 'all'>('all');
  const [page, setPage] = useState(0);
  const pageSize = 36;
  const [inspectDetail, setInspectDetail] = useState<SelectedSampleDetail | null>(null);

  // Filter sample indices matching selected class
  const classFilteredIndices = React.useMemo(() => {
    const indices: number[] = [];
    const limit = customDataset ? customDataset.rows.length : Math.min(totalSamples, 5000);
    const targetIdx = customDataset ? customDataset.headers.indexOf(customDataset.targetColumn) : -1;

    for (let i = 0; i < limit; i++) {
      let label = 0;
      if (customDataset && customDataset.rows[i]) {
        const row = customDataset.rows[i];
        const lIdx = targetIdx >= 0 ? targetIdx : row.length - 1;
        const num = Number(row[lIdx]);
        label = isNaN(num) ? 0 : num;
      } else {
        label = i % classes.length;
      }

      if (selectedClass === 'all' || selectedClass === label) {
        indices.push(i);
      }
    }
    return indices;
  }, [selectedClass, classes.length, totalSamples, customDataset]);

  const maxPages = Math.max(1, Math.ceil(classFilteredIndices.length / pageSize));
  const currentIndices = classFilteredIndices.slice(page * pageSize, (page + 1) * pageSize);

  const handlePrevPage = () => setPage((p) => Math.max(0, p - 1));
  const handleNextPage = () => setPage((p) => Math.min(maxPages - 1, p + 1));

  useEffect(() => {
    setPage(0);
  }, [selectedClass]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
      {/* Class Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'wrap',
          backgroundColor: '#1e1e1e',
          padding: '8px 12px',
          borderRadius: '4px',
          border: '1px solid #2d2d2d',
        }}
      >
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          Class Filter:
        </span>
        <button
          onClick={() => setSelectedClass('all')}
          style={{
            padding: '3px 9px',
            fontSize: '0.7rem',
            borderRadius: '3px',
            backgroundColor: selectedClass === 'all' ? '#0078d4' : '#252526',
            color: selectedClass === 'all' ? '#ffffff' : '#cccccc',
            fontWeight: selectedClass === 'all' ? 600 : 400,
            border: selectedClass === 'all' ? '1px solid #005a9e' : '1px solid #333333',
            cursor: 'pointer',
            transition: 'background-color 0.1s ease',
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
                padding: '3px 8px',
                fontSize: '0.7rem',
                borderRadius: '3px',
                backgroundColor: isActive ? '#0078d4' : '#252526',
                color: isActive ? '#ffffff' : '#a6a6a6',
                fontWeight: isActive ? 600 : 400,
                border: isActive ? '1px solid #005a9e' : '1px solid #333333',
                cursor: 'pointer',
                transition: 'background-color 0.1s ease',
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '10px',
          paddingRight: '4px',
        }}
      >
        {currentIndices.map((sampleIdx) => (
          <SampleCard
            key={sampleIdx}
            datasetId={datasetId}
            sampleIndex={sampleIdx}
            isSelected={inspectDetail?.index === sampleIdx}
            onInspect={(detail) => setInspectDetail(detail)}
            customDataset={customDataset}
          />
        ))}
      </div>

      {/* Bottom Pagination & Inspector Tray */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          backgroundColor: '#1e1e1e',
          borderRadius: '4px',
          border: '1px solid #2d2d2d',
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
              padding: '3px 8px',
              borderRadius: '3px',
              backgroundColor: '#252526',
              color: page === 0 ? '#555555' : '#cccccc',
              border: '1px solid #333337',
              fontSize: '0.72rem',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft size={13} />
            Prev
          </button>
          <span style={{ fontSize: '0.72rem', color: '#888888' }}>
            Page <strong style={{ color: '#ffffff' }}>{page + 1}</strong> of {maxPages} (
            {classFilteredIndices.length} filtered items)
          </span>
          <button
            onClick={handleNextPage}
            disabled={page >= maxPages - 1}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '3px',
              backgroundColor: '#252526',
              color: page >= maxPages - 1 ? '#555555' : '#cccccc',
              border: '1px solid #333337',
              fontSize: '0.72rem',
              cursor: page >= maxPages - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Next
            <ChevronRight size={13} />
          </button>
        </div>

        {inspectDetail && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.72rem' }}>
            <span style={{ color: '#0078d4', fontWeight: 600 }}>
              Inspecting #{inspectDetail.index} [{inspectDetail.className}]
            </span>
            <span style={{ color: '#888888' }}>
              Shape: <strong style={{ color: '#cccccc' }}>[1, 28, 28]</strong>
            </span>
            <span style={{ color: '#888888' }}>
              Range: [{inspectDetail.min.toFixed(2)}, {inspectDetail.max.toFixed(2)}]
            </span>
            <span style={{ color: '#888888' }}>
              Mean: <strong style={{ color: '#cccccc' }}>{inspectDetail.mean.toFixed(3)}</strong>
            </span>
            <button
              onClick={() => setInspectDetail(null)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#666666',
                cursor: 'pointer',
                fontSize: '0.75rem',
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
  customDataset?: TabularDataset | null;
}

const SampleCard: React.FC<SampleCardProps> = ({
  datasetId,
  sampleIndex,
  isSelected,
  onInspect,
  customDataset,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sample = React.useMemo(() => {
    if (customDataset && customDataset.rows[sampleIndex]) {
      const row = customDataset.rows[sampleIndex];
      const targetIdx = customDataset.headers.indexOf(customDataset.targetColumn);
      const labelIdx = targetIdx >= 0 ? targetIdx : row.length - 1;
      const rawLabel = Number(row[labelIdx]);
      const label = isNaN(rawLabel) ? 0 : rawLabel;

      const pixels = new Float32Array(784);
      let pIdx = 0;
      for (let c = 0; c < row.length && pIdx < 784; c++) {
        if (c !== labelIdx) {
          pixels[pIdx++] = Number(row[c]) || 0;
        }
      }

      return {
        pixels,
        label,
        className: String(label),
      };
    }
    return getAuthenticSample(datasetId, sampleIndex);
  }, [customDataset, datasetId, sampleIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(28, 28);
    for (let i = 0; i < 784; i++) {
      const val = Math.floor(sample.pixels[i] * 255);
      imgData.data[i * 4 + 0] = val;
      imgData.data[i * 4 + 1] = val;
      imgData.data[i * 4 + 2] = val;
      imgData.data[i * 4 + 3] = 255;
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
        padding: '6px',
        backgroundColor: isSelected ? '#252526' : '#1e1e1e',
        borderRadius: '3px',
        border: isSelected ? '1px solid #0078d4' : '1px solid #2d2d2d',
        cursor: 'pointer',
        transition: 'border-color 0.1s ease',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = '#444444';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = '#2d2d2d';
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '1',
          backgroundColor: '#141414',
          borderRadius: '2px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #282828',
          marginBottom: '5px',
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
          fontSize: '0.68rem',
        }}
      >
        <span style={{ color: '#666666', fontFamily: 'Consolas, monospace' }}>#{sampleIndex}</span>
        <span
          style={{
            backgroundColor: '#252526',
            color: '#b0b0b0',
            padding: '1px 5px',
            borderRadius: '2px',
            fontWeight: 500,
            border: '1px solid #333333',
          }}
        >
          {sample.className}
        </span>
      </div>
    </div>
  );
};
