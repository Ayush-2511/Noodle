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
        padding: '8px 14px',
        backgroundColor: '#1e1e1e',
        borderBottom: '1px solid #2d2d2d',
        gap: '12px',
        flexWrap: 'wrap',
        userSelect: 'none',
      }}
    >
      {/* Left: Back button + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onBackToCanvas}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            backgroundColor: '#252526',
            color: '#0078d4',
            border: '1px solid #333337',
            borderRadius: 3,
            fontSize: '0.74rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.1s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2d2d30')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#252526')}
        >
          <ArrowLeft size={13} />
          <span>Canvas (Esc / Ctrl+1)</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Database size={15} color="#0078d4" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
            Dataset Inspector
          </span>
        </div>

        {/* Dataset Quick Switcher */}
        <select
          value={currentDatasetId}
          onChange={(e) => onSelectDataset(e.target.value)}
          style={{
            backgroundColor: '#141414',
            color: '#ffffff',
            border: '1px solid #333333',
            borderRadius: 3,
            padding: '4px 8px',
            fontSize: '0.72rem',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="mnist">MNIST Handwritten Digits (28×28 Grayscale)</option>
          <option value="fashion_mnist">Fashion-MNIST Clothing (28×28 Grayscale)</option>
          <option value="cifar10">CIFAR-10 Objects (32×32 Color)</option>
        </select>
      </div>

      {/* Center: Metadata Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 3,
            backgroundColor: '#252526',
            border: '1px solid #333333',
            color: '#cccccc',
            fontSize: '0.7rem',
          }}
        >
          {modality === 'image' ? <ImageIcon size={11} color="#0078d4" /> : <FileSpreadsheet size={11} color="#0078d4" />}
          <span>{modality === 'image' ? 'Image (28×28)' : 'Tabular CSV'}</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 3,
            backgroundColor: '#1b2d1f',
            border: '1px solid #276235',
            color: '#4ade80',
            fontSize: '0.7rem',
          }}
        >
          <CheckCircle2 size={11} />
          <span>{sampleCount.toLocaleString()} samples</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 3,
            backgroundColor: '#252526',
            border: '1px solid #333333',
            color: '#888888',
            fontSize: '0.7rem',
          }}
        >
          <span>{classCount} classes</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 3,
            backgroundColor: '#252526',
            border: '1px solid #333333',
            color: '#666666',
            fontSize: '0.7rem',
          }}
        >
          <span>80% Train / 20% Test</span>
        </div>
      </div>

      {/* Right: Import Local Dataset Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onImportLocal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            backgroundColor: '#252526',
            color: '#cccccc',
            border: '1px solid #383838',
            borderRadius: 3,
            fontSize: '0.72rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.1s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2d2d30')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#252526')}
        >
          <Upload size={12} color="#0078d4" />
          <span>Import Local CSV / Folder</span>
        </button>
      </div>
    </div>
  );
};
