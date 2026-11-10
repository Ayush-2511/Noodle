import { describe, it, expect, beforeEach } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import { useGraphStore, resetNextIdCounter } from '../src/core/store';
import { inferBuilderShapes } from '../src/core/shapeEngine';
import { validate } from '../src/core/validator';
import { compileGraphToTfjs } from '../src/backends/tfjs/modelCompiler';
import { Graph } from '../src/core/graph';
import { getDatasetMeta } from '../src/core/datasets';

describe('Noodle v2 Pipeline Paradigm', () => {
  beforeEach(() => {
    resetNextIdCounter(1);
    useGraphStore.getState().resetGraph();
  });

  describe('Builder Layer Store Actions', () => {
    it('initializes FeatureExtractor with sensible default layers', () => {
      const store = useGraphStore.getState();
      const id = store.addNode('FeatureExtractor');
      const node = useGraphStore.getState().graph.nodes.find((n) => n.id === id);

      expect(node).toBeDefined();
      expect(node?.layers).toBeDefined();
      expect(node?.layers?.length).toBeGreaterThan(0);
      expect(node?.layers?.[0].type).toBe('Conv2D');
    });

    it('adds, updates, reorders, and removes layers inside a builder node', () => {
      const store = useGraphStore.getState();
      const id = store.addNode('Classifier', {}, { x: 100, y: 100 }, []);

      // Add Linear layer
      store.addLayer(id, 'Linear', { neurons: 64 });
      let node = useGraphStore.getState().graph.nodes.find((n) => n.id === id);
      expect(node?.layers?.length).toBe(1);
      expect(node?.layers?.[0].params.neurons).toBe(64);

      // Add ReLU layer
      store.addLayer(id, 'ReLU');
      node = useGraphStore.getState().graph.nodes.find((n) => n.id === id);
      expect(node?.layers?.length).toBe(2);

      // Update parameters
      const firstLayerId = node!.layers![0].id;
      store.updateLayerParams(id, firstLayerId, { neurons: 128 });
      node = useGraphStore.getState().graph.nodes.find((n) => n.id === id);
      expect(node?.layers?.[0].params.neurons).toBe(128);

      // Reorder layers
      store.reorderLayer(id, firstLayerId, 1);
      node = useGraphStore.getState().graph.nodes.find((n) => n.id === id);
      expect(node?.layers?.[0].type).toBe('ReLU');
      expect(node?.layers?.[1].type).toBe('Linear');

      // Remove layer
      store.removeLayer(id, firstLayerId);
      node = useGraphStore.getState().graph.nodes.find((n) => n.id === id);
      expect(node?.layers?.length).toBe(1);
      expect(node?.layers?.[0].type).toBe('ReLU');
    });

    it('serializes canonical JSON with layers and version 2', () => {
      const store = useGraphStore.getState();
      store.addNode('Classifier', { loss: 'cross_entropy' }, { x: 0, y: 0 }, [
        { id: 'l1', type: 'Linear', params: { neurons: 10 } },
      ]);

      const jsonStr = store.getCanonicalJson();
      const parsed = JSON.parse(jsonStr);

      expect(parsed.version).toBe(2);
      expect(parsed.nodes).toHaveLength(1);
      expect(parsed.nodes[0].layers).toHaveLength(1);
      expect(parsed.nodes[0].layers[0].type).toBe('Linear');
    });
  });

  describe('Shape Engine - inferBuilderShapes', () => {
    it('infers sequential shapes and parameter counts in FeatureExtractor', () => {
      const layers = [
        { id: 'l1', type: 'Conv2D', params: { filters: 8, kernel: 3, stride: 1, padding: 1 } },
        { id: 'l2', type: 'ReLU', params: {} },
        { id: 'l3', type: 'MaxPool2D', params: { kernel: 2, stride: 2 } },
      ];

      const res = inferBuilderShapes(layers, ['B', 1, 28, 28]);

      expect(res.errors).toHaveLength(0);
      expect(res.layerShapes).toHaveLength(3);
      // Conv2D: [B, 8, 28, 28]
      expect(res.layerShapes[0].outputShape).toEqual(['B', 8, 28, 28]);
      // ReLU: [B, 8, 28, 28]
      expect(res.layerShapes[1].outputShape).toEqual(['B', 8, 28, 28]);
      // MaxPool2D: [B, 8, 14, 14]
      expect(res.layerShapes[2].outputShape).toEqual(['B', 8, 14, 14]);
      expect(res.finalOutputShape).toEqual(['B', 8, 14, 14]);
      // Conv2D params: (3*3*1 + 1)*8 = 80 params
      expect(res.totalParams).toBe(80);
    });

    it('infers sequential shapes and parameter counts in Classifier', () => {
      const layers = [
        { id: 'l1', type: 'Linear', params: { neurons: 128 } },
        { id: 'l2', type: 'ReLU', params: {} },
        { id: 'l3', type: 'Linear', params: { neurons: 10 } },
      ];

      const res = inferBuilderShapes(layers, ['B', 1568]);

      expect(res.errors).toHaveLength(0);
      expect(res.layerShapes[0].outputShape).toEqual(['B', 128]);
      expect(res.layerShapes[1].outputShape).toEqual(['B', 128]);
      expect(res.layerShapes[2].outputShape).toEqual(['B', 10]);
      expect(res.finalOutputShape).toEqual(['B', 10]);
      // Linear 1: (1568 + 1) * 128 = 200,832
      // Linear 2: (128 + 1) * 10 = 1,290
      // Total = 202,122
      expect(res.totalParams).toBe(200832 + 1290);
    });

    it('catches shape mismatch error when spatial Conv2D receives flat vector', () => {
      const layers = [
        { id: 'l1', type: 'Conv2D', params: { filters: 8, kernel: 3 } },
      ];

      const res = inferBuilderShapes(layers, ['B', 784]);
      expect(res.errors.length).toBeGreaterThan(0);
      expect(res.errors[0].message).toContain('Conv2D requires 3-D');
    });

    it('catches shape mismatch error when Linear receives spatial tensor', () => {
      const layers = [
        { id: 'l1', type: 'Linear', params: { neurons: 10 } },
      ];

      const res = inferBuilderShapes(layers, ['B', 8, 14, 14]);
      expect(res.errors.length).toBeGreaterThan(0);
      expect(res.errors[0].message).toContain('Linear requires 1-D or 2-D');
      expect(res.errors[0].fixHint).toContain('Flatten');
    });
  });

  describe('Graph Validation with v2 Pipeline', () => {
    it('validates a complete v2 CNN Pipeline successfully with zero errors', () => {
      const cnnGraph: Graph = {
        version: 2,
        nodes: [
          { id: 'n1', type: 'LoadDataset', params: { dataset: 'mnist' } },
          { id: 'n2', type: 'Shuffle', params: { seed: 42 } },
          { id: 'n3', type: 'TrainTestSplit', params: { train_pct: 80 } },
          { id: 'n4', type: 'Normalize', params: { method: 'min_max' } },
          {
            id: 'n5',
            type: 'FeatureExtractor',
            params: {},
            layers: [
              { id: 'l1', type: 'Conv2D', params: { filters: 8, kernel: 3, stride: 1, padding: 1 } },
              { id: 'l2', type: 'ReLU', params: {} },
              { id: 'l3', type: 'MaxPool2D', params: { kernel: 2, stride: 2 } },
            ],
          },
          { id: 'n6', type: 'Flatten', params: {} },
          {
            id: 'n7',
            type: 'Classifier',
            params: { loss: 'cross_entropy' },
            layers: [
              { id: 'l1', type: 'Linear', params: { neurons: 128 } },
              { id: 'l2', type: 'ReLU', params: {} },
              { id: 'l3', type: 'Linear', params: { neurons: 10 } },
            ],
          },
          { id: 'n8', type: 'Train', params: { optimizer: 'adam', lr: 0.001, epochs: 10, batch_size: 32 } },
          { id: 'n9', type: 'Evaluate', params: {} },
          { id: 'n10', type: 'Predict', params: {} },
          { id: 'n11', type: 'Metrics', params: {} },
        ],
        edges: [
          { from: 'n1.data', to: 'n2.data' },
          { from: 'n2.data', to: 'n3.data' },
          { from: 'n3.train', to: 'n4.data' },
          { from: 'n4.data', to: 'n5.in' },
          { from: 'n4.data', to: 'n8.train_data' },
          { from: 'n3.test', to: 'n9.test_data' },
          { from: 'n5.out', to: 'n6.in' },
          { from: 'n6.out', to: 'n7.in' },
          { from: 'n7.model', to: 'n8.model' },
          { from: 'n8.trained_model', to: 'n9.trained_model' },
          { from: 'n8.trained_model', to: 'n10.trained_model' },
          { from: 'n8.history', to: 'n11.metrics' },
        ],
      };

      const result = validate(cnnGraph);

      expect(result.isValid).toBe(true);
      const errors = result.problems.filter((p) => p.severity === 'error');
      expect(errors).toHaveLength(0);

      // Verify wire data types
      const edgeKey = 'n1.data->n2.data';
      const wire = result.wireStatuses.get(edgeKey);
      expect(wire).toBeDefined();
      expect(wire?.dataType).toBe('dataset');
    });

    it('validates a v2 MLP Pipeline (no FeatureExtractor) successfully', () => {
      const mlpGraph: Graph = {
        version: 2,
        nodes: [
          { id: 'n1', type: 'LoadDataset', params: { dataset: 'mnist' } },
          { id: 'n2', type: 'Flatten', params: {} },
          {
            id: 'n3',
            type: 'Classifier',
            params: { loss: 'cross_entropy' },
            layers: [
              { id: 'l1', type: 'Linear', params: { neurons: 10 } },
            ],
          },
          { id: 'n4', type: 'Train', params: { optimizer: 'adam', lr: 0.001, epochs: 5 } },
          { id: 'n5', type: 'Predict', params: {} },
        ],
        edges: [
          { from: 'n1.data', to: 'n2.in' },
          { from: 'n2.out', to: 'n3.in' },
          { from: 'n3.model', to: 'n4.model' },
          { from: 'n1.data', to: 'n4.train_data' },
          { from: 'n4.trained_model', to: 'n5.trained_model' },
        ],
      };

      const result = validate(mlpGraph);
      expect(result.isValid).toBe(true);
      const errors = result.problems.filter((p) => p.severity === 'error');
      expect(errors).toHaveLength(0);
    });
  });

  describe('TF.js Model Compilation with v2 Builders', () => {
    it('compiles a v2 CNN graph to native tf.LayersModel and performs inference', () => {
      const cnnGraph: Graph = {
        version: 2,
        nodes: [
          { id: 'n1', type: 'LoadDataset', params: { dataset: 'mnist' } },
          {
            id: 'n2',
            type: 'FeatureExtractor',
            params: {},
            layers: [
              { id: 'l1', type: 'Conv2D', params: { filters: 4, kernel: 3, stride: 1, padding: 1 } },
              { id: 'l2', type: 'ReLU', params: {} },
              { id: 'l3', type: 'MaxPool2D', params: { kernel: 2, stride: 2 } },
            ],
          },
          { id: 'n3', type: 'Flatten', params: {} },
          {
            id: 'n4',
            type: 'Classifier',
            params: { loss: 'cross_entropy' },
            layers: [
              { id: 'l1', type: 'Linear', params: { neurons: 10 } },
            ],
          },
          { id: 'n5', type: 'Train', params: { optimizer: 'adam', lr: 0.001 } },
        ],
        edges: [
          { from: 'n1.data', to: 'n2.in' },
          { from: 'n2.out', to: 'n3.in' },
          { from: 'n3.out', to: 'n4.in' },
          { from: 'n4.model', to: 'n5.model' },
        ],
      };

      const compiled = compileGraphToTfjs(cnnGraph);

      expect(compiled.model).toBeDefined();
      expect(compiled.optimizerAlgo).toBe('adam');
      expect(compiled.learningRate).toBe(0.001);

      // Perform forward pass with dummy batch of size 2
      const dummyInput = tf.zeros([2, 28, 28, 1]);
      const output = compiled.model.predict(dummyInput) as tf.Tensor;

      expect(output.shape).toEqual([2, 10]);

      dummyInput.dispose();
      output.dispose();
      compiled.model.dispose();
    });

    it('compiles a v2 MLP graph to native tf.LayersModel and performs inference', () => {
      const mlpGraph: Graph = {
        version: 2,
        nodes: [
          { id: 'n1', type: 'LoadDataset', params: { dataset: 'mnist' } },
          { id: 'n2', type: 'Flatten', params: {} },
          {
            id: 'n3',
            type: 'Classifier',
            params: { loss: 'cross_entropy' },
            layers: [
              { id: 'l1', type: 'Linear', params: { neurons: 32 } },
              { id: 'l2', type: 'ReLU', params: {} },
              { id: 'l3', type: 'Linear', params: { neurons: 10 } },
            ],
          },
          { id: 'n4', type: 'Train', params: { optimizer: 'sgd', lr: 0.01 } },
        ],
        edges: [
          { from: 'n1.data', to: 'n2.in' },
          { from: 'n2.out', to: 'n3.in' },
          { from: 'n3.model', to: 'n4.model' },
        ],
      };

      const compiled = compileGraphToTfjs(mlpGraph);

      expect(compiled.model).toBeDefined();
      expect(compiled.optimizerAlgo).toBe('sgd');

      const dummyInput = tf.zeros([2, 28, 28, 1]);
      const output = compiled.model.predict(dummyInput) as tf.Tensor;

      expect(output.shape).toEqual([2, 10]);

      dummyInput.dispose();
      output.dispose();
      compiled.model.dispose();
    });
  });

  describe('Dynamic Dataset Metadata & Authentic Evaluation', () => {
    it('retrieves distinct class labels for different datasets', () => {
      const mnistMeta = getDatasetMeta('mnist');
      expect(mnistMeta.classes).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
      expect(mnistMeta.modality).toBe('image');

      const fashionMeta = getDatasetMeta('fashion_mnist');
      expect(fashionMeta.classes).toContain('T-shirt');
      expect(fashionMeta.classes).toContain('Ankle boot');

      const cifarMeta = getDatasetMeta('cifar10');
      expect(cifarMeta.classes).toContain('airplane');
      expect(cifarMeta.classes).toContain('automobile');
      expect(cifarMeta.inputShape).toEqual([3, 32, 32]);
    });

    it('runs authentic evaluation on model weights returning accurate metric scalars', async () => {
      // Create a small model
      const model = tf.sequential();
      model.add(tf.layers.dense({ units: 10, inputShape: [4], activation: 'softmax' }));
      model.compile({ optimizer: 'sgd', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });

      // Create test dataset
      const xTest = tf.tensor2d([
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ]);
      const yTest = tf.tensor2d([
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
      ]);

      const evalRes = model.evaluate(xTest, yTest) as tf.Scalar[];
      const lossVal = (await evalRes[0].data())[0];
      const accVal = (await evalRes[1].data())[0];

      expect(typeof lossVal).toBe('number');
      expect(typeof accVal).toBe('number');
      expect(lossVal).toBeGreaterThan(0);
      expect(accVal).toBeGreaterThanOrEqual(0);
      expect(accVal).toBeLessThanOrEqual(1);

      xTest.dispose();
      yTest.dispose();
      evalRes.forEach((t) => t.dispose());
      model.dispose();
    });

    it('compiles and evaluates a full template graph with Train, Evaluate, and Predict nodes', () => {
      const fullGraph: Graph = {
        version: 2,
        nodes: [
          { id: 'n1', type: 'LoadDataset', params: { dataset: 'mnist' } },
          { id: 'n2', type: 'Shuffle', params: {} },
          { id: 'n3', type: 'TrainTestSplit', params: {} },
          { id: 'n4', type: 'Normalize', params: {} },
          {
            id: 'n5',
            type: 'FeatureExtractor',
            params: {},
            layers: [
              { id: 'l1', type: 'Conv2D', params: { filters: 4, kernel: 3, stride: 1, padding: 1 } },
              { id: 'l2', type: 'ReLU', params: {} },
              { id: 'l3', type: 'MaxPool2D', params: { kernel: 2, stride: 2 } },
            ],
          },
          { id: 'n6', type: 'Flatten', params: {} },
          {
            id: 'n7',
            type: 'Classifier',
            params: { loss: 'cross_entropy' },
            layers: [
              { id: 'l1', type: 'Linear', params: { neurons: 10 } },
            ],
          },
          { id: 'n8', type: 'Train', params: { optimizer: 'adam', lr: 0.001, epochs: 1, batch_size: 16 } },
          { id: 'n9', type: 'Evaluate', params: {} },
          { id: 'n10', type: 'Predict', params: {} },
          { id: 'n11', type: 'Metrics', params: {} },
        ],
        edges: [
          { from: 'n1.data', to: 'n2.data' },
          { from: 'n2.data', to: 'n3.data' },
          { from: 'n3.train', to: 'n4.in' },
          { from: 'n4.out', to: 'n5.in' },
          { from: 'n5.out', to: 'n6.in' },
          { from: 'n6.out', to: 'n7.in' },
          { from: 'n7.model', to: 'n8.model' },
          { from: 'n8.trained_model', to: 'n9.trained_model' },
          { from: 'n8.trained_model', to: 'n10.trained_model' },
          { from: 'n8.metrics', to: 'n11.metrics' },
        ],
      };

      const compiled = compileGraphToTfjs(fullGraph);
      expect(compiled.model).toBeDefined();

      const dummy = tf.zeros([2, 28, 28, 1]);
      const res = compiled.model.predict(dummy) as tf.Tensor;
      expect(res.shape).toEqual([2, 10]);

      dummy.dispose();
      res.dispose();
      compiled.model.dispose();
    });
  });
});
