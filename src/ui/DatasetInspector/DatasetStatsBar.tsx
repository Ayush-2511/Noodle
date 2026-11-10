import React from 'react';
import { ArrowLeft, Upload, Database, Image as ImageIcon, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

interface DatasetStatsBarProps {
  currentDatasetId: string;
  onSelectDataset: (id: string) => void;
  onImportLocal: () => void;
  onBackToCanvas: () => void;
  modality: 'image' | 'tabular';
  sampleCount: number;
  classCount: number;
}

export const DatasetStatsBar: React.FC<DatasetStatsBarProps> = ({
  currentDatasetId,
  onSelectDataset,
  onImportLocal,
  onBackToCanvas,
  modality,
  sampleCount,
  classCount,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      {/* Left: Back button + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onBackToCanvas}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            backgroundColor: '#1e293b',
            color: '#38bdf8',
            border: '1px solid #0284c7',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0369a1')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
        >
          <ArrowLeft size={14} />
          <span>Canvas (Esc / Ctrl+1)</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={18} color="#a855f7" />
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
            Dataset Inspector
          </span>
        </div>

        {/* Dataset Quick Switcher */}
        <select
          value={currentDatasetId}
          onChange={(e) => onSelectDataset(e.target.value)}
          style={{
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '0.75rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <option value="mnist">MNIST Handwritten Digits (28×28 Grayscale)</option>
          <option value="fashion_mnist">Fashion-MNIST Clothing (28×28 Grayscale)</option>
          <option value="cifar10">CIFAR-10 Benchmark Objects (32×32 Color)</option>
        </select>
      </div>

      {/* Center: Metadata Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '5px',
            backgroundColor: '#1e1b4b',
            border: '1px solid #4338ca',
            color: '#c7d2fe',
            fontSize: '0.72rem',
          }}
        >
          {modality === 'image' ? <ImageIcon size={12} /> : <FileSpreadsheet size={12} />}
          <span>{modality === 'image' ? 'Image Modality (28×28)' : 'Tabular CSV'}</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '5px',
            backgroundColor: '#064e3b',
            border: '1px solid #059669',
            color: '#6ee7b7',
            fontSize: '0.72rem',
          }}
        >
          <CheckCircle2 size={12} />
          <span>{sampleCount.toLocaleString()} samples</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '5px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            color: '#94a3b8',
            fontSize: '0.72rem',
          }}
        >
          <span>{classCount} classes</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '5px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            color: '#64748b',
            fontSize: '0.72rem',
          }}
        >
          <span>Split: 80% Train / 20% Test</span>
        </div>
      </div>

      {/* Right: Import Local Dataset Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onImportLocal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            backgroundColor: '#1e293b',
            color: '#a5b4fc',
            border: '1px solid #6366f1',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#312e81')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
        >
          <Upload size={13} />
          <span>Import Local CSV / Folder</span>
        </button>
      </div>
    </div>
  );
};
