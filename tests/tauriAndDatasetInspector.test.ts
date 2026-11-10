import { describe, it, expect, beforeEach } from 'vitest';
import {
  serializeNoodleProject,
  parseNoodleProject,
} from '../src/core/projectFile';
import {
  parseCSV,
  getAuthenticSample,
} from '../src/core/authenticDatasets';
import { useGraphStore } from '../src/core/store';
import { Graph } from '../src/core/graph';

describe('Tauri Desktop & .noodle File Format Engine', () => {
  const sampleGraph: Graph = {
    version: 1,
    nodes: [
      {
        id: 'n1',
        type: 'LoadDataset',
        params: { dataset: 'mnist' },
        position: { x: 50, y: 100 },
      },
      {
        id: 'n2',
        type: 'FeatureExtractor',
        params: {},
        layers: [
          {
            id: 'l1',
            type: 'Conv2D',
            params: { filters: 16, kernel: 3, stride: 1, padding: 1 },
          },
        ],
        position: { x: 350, y: 100 },
      },
    ],
    edges: [
      { from: 'n1.data', to: 'n2.in' },
    ],
  };

  it('serializes a graph into a valid .noodle format with metadata and schema', () => {
    const serialized = serializeNoodleProject(sampleGraph, {
      title: 'Digit Classifier Test',
      description: 'CNN test experiment',
    });

    expect(typeof serialized).toBe('string');
    const parsedJson = JSON.parse(serialized);

    expect(parsedJson.$schema).toContain('noodle-project.json');
    expect(parsedJson.version).toBe(2);
    expect(parsedJson.noodleVersion).toBe('0.2.0');
    expect(parsedJson.metadata.title).toBe('Digit Classifier Test');
    expect(parsedJson.metadata.description).toBe('CNN test experiment');
    expect(parsedJson.graph.nodes.length).toBe(2);
    expect(parsedJson.graph.edges.length).toBe(1);
  });

  it('parses a .noodle project file and faithfully restores the graph topology', () => {
    const serialized = serializeNoodleProject(sampleGraph, {
      title: 'Restored Pipeline',
    });

    const restored = parseNoodleProject(serialized);
    expect(restored.title).toBe('Restored Pipeline');
    expect(restored.graph.nodes.length).toBe(2);
    expect(restored.graph.nodes[0].id).toBe('n1');
    expect(restored.graph.edges[0].from).toBe('n1.data');
  });

  it('rejects corrupted or invalid .noodle files gracefully', () => {
    expect(() => parseNoodleProject('not-valid-json')).toThrow();
    expect(() => parseNoodleProject(JSON.stringify({ invalid: true }))).toThrow(
      /missing valid "graph.nodes"/
    );
  });
});

describe('Authentic Datasets & CSV Parser Engine', () => {
  it('parses CSV tabular data into structured headers, rows, and targets', () => {
    const csvContent = `sepal_length,sepal_width,petal_length,petal_width,species
5.1,3.5,1.4,0.2,setosa
4.9,3.0,1.4,0.2,setosa
7.0,3.2,4.7,1.4,versicolor`;

    const parsed = parseCSV(csvContent, 'iris.csv');
    expect(parsed.name).toBe('iris.csv');
    expect(parsed.headers).toEqual([
      'sepal_length',
      'sepal_width',
      'petal_length',
      'petal_width',
      'species',
    ]);
    expect(parsed.rowCount).toBe(3);
    expect(parsed.targetColumn).toBe('species');
    expect(parsed.featureColumns).toEqual([
      'sepal_length',
      'sepal_width',
      'petal_length',
      'petal_width',
    ]);
    expect(parsed.rows[0][0]).toBe(5.1);
    expect(parsed.rows[0][4]).toBe('setosa');
  });

  it('generates authentic handwritten digit samples with normalized float intensities', () => {
    for (let digit = 0; digit <= 9; digit++) {
      const sample = getAuthenticSample('mnist', digit);
      expect(sample.label).toBe(digit);
      expect(sample.className).toBe(String(digit));
      expect(sample.pixels.length).toBe(784); // 28 * 28

      // Verify all pixels are bounded in [0, 1]
      let maxVal = 0;
      for (let i = 0; i < sample.pixels.length; i++) {
        expect(sample.pixels[i]).toBeGreaterThanOrEqual(0);
        expect(sample.pixels[i]).toBeLessThanOrEqual(1.05);
        if (sample.pixels[i] > maxVal) maxVal = sample.pixels[i];
      }
      // Stroke must contain visible foreground ink
      expect(maxVal).toBeGreaterThan(0.5);
    }
  });

  it('generates Fashion-MNIST items with valid clothing category classes', () => {
    const sample = getAuthenticSample('fashion_mnist', 1);
    expect(sample.label).toBe(1);
    expect(sample.className).toBe('Trouser');
    expect(sample.pixels.length).toBe(784);
  });
});

describe('Workspace Tab Navigation Store', () => {
  beforeEach(() => {
    useGraphStore.getState().resetGraph();
    useGraphStore.getState().setActiveWorkspaceTab('canvas');
  });

  it('starts in canvas mode and switches seamlessly to dataset inspector', () => {
    expect(useGraphStore.getState().activeWorkspaceTab).toBe('canvas');

    useGraphStore.getState().setActiveWorkspaceTab('dataset');
    expect(useGraphStore.getState().activeWorkspaceTab).toBe('dataset');

    useGraphStore.getState().setActiveWorkspaceTab('canvas');
    expect(useGraphStore.getState().activeWorkspaceTab).toBe('canvas');
  });
});

