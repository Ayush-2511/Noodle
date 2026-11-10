import React, { useState, useEffect, useCallback } from 'react';
import { DatasetStatsBar } from './DatasetStatsBar';
import { ImageGalleryView } from './ImageGalleryView';
import { TableView } from './TableView';
import { getDatasetMeta } from '../../core/datasets';
import { TabularDataset } from '../../core/authenticDatasets';
import { useGraphStore } from '../../core/store';
import { importCustomDatasetDialog } from '../../core/datasetImporter';

interface DatasetInspectorProps {
  onReturnToCanvas: () => void;
}

export const DatasetInspector: React.FC<DatasetInspectorProps> = ({ onReturnToCanvas }) => {
  const graph = useGraphStore((state) => state.graph);
  const updateNodeParams = useGraphStore((state) => state.updateNodeParams);
  const customDataset = useGraphStore((state) => state.customDataset);

  // Identify active LoadDataset node if present in graph
  const loadDatasetNode = graph.nodes.find((n) => n.type === 'LoadDataset');
  const activeDatasetId = (loadDatasetNode?.params?.dataset as string) || (customDataset ? 'custom_csv' : 'mnist');

  const [currentId, setCurrentId] = useState<string>(activeDatasetId);
  const [localTabular, setLocalTabular] = useState<TabularDataset | null>(null);
  const [viewMode, setViewMode] = useState<'gallery' | 'table'>('gallery');

  const activeCustom = customDataset || localTabular;

  // Sync with graph if LoadDataset node changes
  useEffect(() => {
    if (activeDatasetId) {
      setCurrentId(activeDatasetId);
    }
  }, [activeDatasetId]);

  // Handle switching datasets
  const handleSelectDataset = (id: string) => {
    setCurrentId(id);
    setLocalTabular(null);
    if (id !== 'custom_csv') {
      useGraphStore.getState().setCustomDataset(null);
    }
    if (loadDatasetNode) {
      updateNodeParams(loadDatasetNode.id, { dataset: id });
    }
  };

  // Keyboard shortcut: Esc to return to canvas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onReturnToCanvas();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onReturnToCanvas]);

  // Handle Native Local CSV / Folder import
  const handleImportLocal = useCallback(async () => {
    const res = await importCustomDatasetDialog();
    if (res) {
      setLocalTabular(res.parsed);
      setCurrentId('custom_csv');
      useGraphStore.getState().setCustomDataset(res.parsed);
      const isImg = res.parsed.featureColumns.length === 784;
      if (loadDatasetNode) {
        updateNodeParams(loadDatasetNode.id, {
          dataset: 'custom_csv',
          filePath: res.filePath,
          fileName: res.fileName,
          sampleCount: res.parsed.rowCount,
          featureCount: res.parsed.featureColumns.length,
          targetColumn: res.parsed.targetColumn,
          modality: isImg ? 'image' : 'tabular',
        });
      }
    }
  }, [loadDatasetNode, updateNodeParams]);

  const meta = getDatasetMeta(currentId);
  const isCustomImage = activeCustom ? activeCustom.featureColumns.length === 784 : false;
  const isImageDataset = activeCustom ? isCustomImage : meta.modality === 'image';
  const modality = isImageDataset ? 'image' : 'tabular';
  const sampleCount = activeCustom ? activeCustom.rowCount : meta.sampleCount;
  const classes = isImageDataset
    ? ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
    : activeCustom
    ? [activeCustom.targetColumn]
    : meta.classes;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#181818',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'relative' }}>
        <DatasetStatsBar
          currentDatasetId={currentId}
          onSelectDataset={handleSelectDataset}
          onImportLocal={handleImportLocal}
          onBackToCanvas={onReturnToCanvas}
          modality={modality}
          sampleCount={sampleCount}
          classCount={classes.length}
        />

        {/* View Switcher if custom image dataset */}
        {activeCustom && isCustomImage && (
          <div
            style={{
              position: 'absolute',
              right: 210,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              backgroundColor: '#141414',
              borderRadius: 3,
              border: '1px solid #333333',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setViewMode('gallery')}
              style={{
                padding: '3px 8px',
                fontSize: '0.68rem',
                backgroundColor: viewMode === 'gallery' ? '#0078d4' : 'transparent',
                color: viewMode === 'gallery' ? '#ffffff' : '#888888',
                border: 'none',
                cursor: 'pointer',
                fontWeight: viewMode === 'gallery' ? 600 : 400,
              }}
            >
              Gallery View
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '3px 8px',
                fontSize: '0.68rem',
                backgroundColor: viewMode === 'table' ? '#0078d4' : 'transparent',
                color: viewMode === 'table' ? '#ffffff' : '#888888',
                border: 'none',
                cursor: 'pointer',
                fontWeight: viewMode === 'table' ? 600 : 400,
              }}
            >
              Raw Pixels Table
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: '16px', overflow: 'hidden' }}>
        {isImageDataset && viewMode === 'gallery' ? (
          <ImageGalleryView
            datasetId={currentId}
            classes={classes}
            totalSamples={sampleCount}
            customDataset={activeCustom}
          />
        ) : activeCustom ? (
          <TableView dataset={activeCustom} />
        ) : (
          <ImageGalleryView
            datasetId={currentId}
            classes={classes}
            totalSamples={sampleCount}
          />
        )}
      </div>
    </div>
  );
};

