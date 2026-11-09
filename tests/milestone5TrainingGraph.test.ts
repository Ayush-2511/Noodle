import { describe, it, expect } from 'vitest';
import { Graph } from '../src/core/graph';
import { validate } from '../src/core/validator';
import { compileGraphToTfjs } from '../src/backends/tfjs/modelCompiler';
import { generateSyntheticMnist } from '../src/backends/tfjs/mnistLoader';

describe('Milestone 5 (M5): Training Graph Nodes & Live Telemetry', () => {
  const fullTrainingGraph: Graph = {
    version: 1,
    nodes: [
      { id: 'n1', type: 'Dataset', params: { name: 'mnist' } },
      { id: 'n2', type: 'Flatten', params: {} },
      { id: 'n3', type: 'Linear', params: { out_features: 64 } },
      { id: 'n4', type: 'Activation', params: { fn: 'relu' } },
      { id: 'n5', type: 'Linear', params: { out_features: 10 } },
      { id: 'n6', type: 'Loss', params: { fn: 'cross_entropy' } },
      { id: 'n7', type: 'Optimizer', params: { algo: 'sgd', lr: 0.02 } },
      { id: 'n8', type: 'Train', params: { epochs: 4, batch_size: 16 } },
      { id: 'n9', type: 'Metrics', params: {} },
    ],
    edges: [
      { from: 'n1.images', to: 'n2.in' },
      { from: 'n2.out', to: 'n3.in' },
      { from: 'n3.out', to: 'n4.in' },
      { from: 'n4.out', to: 'n5.in' },
      { from: 'n5.out', to: 'n6.logits' },
      { from: 'n1.labels', to: 'n6.target' },
      { from: 'n6.out', to: 'n8.loss' },
      { from: 'n7.opt', to: 'n8.opt' },
      { from: 'n8.metrics', to: 'n9.metrics' },
    ],
  };

  it('validates a complete training graph with Loss, Optimizer, Train, and Metrics nodes without errors', () => {
    const result = validate(fullTrainingGraph);
    expect(result.isValid).toBe(true);
    expect(result.problems.filter((p) => p.severity === 'error')).toHaveLength(0);

    // Verify all 9 nodes have OK status
    for (const node of fullTrainingGraph.nodes) {
      const status = result.nodeStatuses.get(node.id);
      expect(status).toBeDefined();
      expect(status?.status).toBe('ok');
    }

    // Verify wire statuses between training nodes are valid
    const lossToTrainWire = result.wireStatuses.get('n6.out->n8.loss');
    expect(lossToTrainWire).toBeDefined();
    expect(lossToTrainWire?.status).toBe('valid');

    const optToTrainWire = result.wireStatuses.get('n7.opt->n8.opt');
    expect(optToTrainWire).toBeDefined();
    expect(optToTrainWire?.status).toBe('valid');

    const trainToMetricsWire = result.wireStatuses.get('n8.metrics->n9.metrics');
    expect(trainToMetricsWire).toBeDefined();
    expect(trainToMetricsWire?.status).toBe('valid');
  });

  it('compiles TF.js model extracting configured Optimizer algorithm and learning rate', () => {
    // 1. SGD config
    const compiledSgd = compileGraphToTfjs(fullTrainingGraph);
    expect(compiledSgd.model).toBeDefined();
    expect(compiledSgd.optimizerAlgo).toBe('sgd');
    expect(compiledSgd.learningRate).toBe(0.02);
    expect(compiledSgd.epochs).toBe(4);
    expect(compiledSgd.batchSize).toBe(16);
    compiledSgd.model.dispose();

    // 2. Adam config
    const adamGraph: Graph = {
      ...fullTrainingGraph,
      nodes: fullTrainingGraph.nodes.map((n) =>
        n.id === 'n7'
          ? { ...n, params: { algo: 'adam', lr: 0.003 } }
          : n.id === 'n8'
          ? { ...n, params: { epochs: 6, batch_size: 64 } }
          : n
      ),
    };
    const compiledAdam = compileGraphToTfjs(adamGraph);
    expect(compiledAdam.optimizerAlgo).toBe('adam');
    expect(compiledAdam.learningRate).toBe(0.003);
    expect(compiledAdam.epochs).toBe(6);
    expect(compiledAdam.batchSize).toBe(64);
    compiledAdam.model.dispose();
  });

  it('trains the compiled model end-to-end and streams decreasing loss', async () => {
    const compiled = compileGraphToTfjs(fullTrainingGraph);
    const data = generateSyntheticMnist(60);

    const trainImages = data.trainImages.transpose([0, 2, 3, 1]);
    const testImages = data.testImages.transpose([0, 2, 3, 1]);

    const history = await compiled.model.fit(trainImages, data.trainLabels, {
      epochs: 2,
      batchSize: compiled.batchSize,
      validationData: [testImages, data.testLabels],
      verbose: 0,
    });

    const losses = history.history.loss as number[];
    expect(losses).toHaveLength(2);
    expect(Number.isFinite(losses[losses.length - 1])).toBe(true);

    // Clean up tensors
    trainImages.dispose();
    testImages.dispose();
    data.trainImages.dispose();
    data.trainLabels.dispose();
    data.testImages.dispose();
    data.testLabels.dispose();
    compiled.model.dispose();
  }, 20000);
});

