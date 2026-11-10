import React, { useState, useEffect, useCallback } from 'react';
import { DatasetStatsBar } from './DatasetStatsBar';
import { ImageGalleryView } from './ImageGalleryView';
import { TableView } from './TableView';
import { getDatasetMeta } from '../../core/datasets';
import { TabularDataset, parseCSV } from '../../core/authenticDatasets';
import { useGraphStore } from '../../core/store';
import { isTauriEnv } from '../../core/projectFile';

interface DatasetInspectorProps {
  onReturnToCanvas: () => void;
}

export const DatasetInspector: React.FC<DatasetInspectorProps> = ({ onReturnToCanvas }) => {
  const graph = useGraphStore((state) => state.graph);
  const updateNodeParams = useGraphStore((state) => state.updateNodeParams);

  // Identify active LoadDataset node if present in graph
  const loadDatasetNode = graph.nodes.find((n) => n.type === 'LoadDataset');
  const activeDatasetId = (loadDatasetNode?.params?.dataset as string) || 'mnist';

  const [currentId, setCurrentId] = useState<string>(activeDatasetId);
  const [localTabular, setLocalTabular] = useState<TabularDataset | null>(null);

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
    if (isTauriEnv()) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const { readTextFile } = await import('@tauri-apps/plugin-fs');

        const selected = await open({
          title: 'Select Local Dataset (CSV or Images)',
          multiple: false,
          directory: false,
          filters: [
            {
              name: 'Datasets (*.csv)',
              extensions: ['csv'],
            },
          ],
        });

        if (selected && typeof selected === 'string') {
          const content = await readTextFile(selected);
          const parsed = parseCSV(content, selected.split(/[\\/]/).pop());
          setLocalTabular(parsed);
          setCurrentId('custom_csv');
          if (loadDatasetNode) {
            updateNodeParams(loadDatasetNode.id, {
              dataset: 'custom_csv',
              filePath: selected,
              modality: 'tabular',
            });
          }
          return;
        }
      } catch (err) {
        console.error('Tauri native dataset open failed, falling back to web picker:', err);
      }
    }

    // Web fallback
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.txt';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = parseCSV(text, file.name);
        setLocalTabular(parsed);
        setCurrentId('custom_csv');
        if (loadDatasetNode) {
          updateNodeParams(loadDatasetNode.id, {
            dataset: 'custom_csv',
            filePath: file.name,
            modality: 'tabular',
          });
        }
      } catch (err: any) {
        alert(`Failed to parse CSV: ${err.message}`);
      }
    };
    input.click();
  }, [loadDatasetNode, updateNodeParams]);

  const meta = getDatasetMeta(currentId);
  const modality = localTabular ? 'tabular' : meta.modality;
  const sampleCount = localTabular ? localTabular.rowCount : meta.sampleCount;
  const classes = localTabular
    ? [localTabular.targetColumn]
    : meta.classes;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#0b0f19',
        overflow: 'hidden',
      }}
    >
      <DatasetStatsBar
        currentDatasetId={currentId}
        onSelectDataset={handleSelectDataset}
        onImportLocal={handleImportLocal}
        onBackToCanvas={onReturnToCanvas}
        modality={modality}
        sampleCount={sampleCount}
        classCount={classes.length}
      />

      <div style={{ flex: 1, padding: '16px', overflow: 'hidden' }}>
        {localTabular ? (
          <TableView dataset={localTabular} />
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

