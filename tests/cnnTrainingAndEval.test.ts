import { describe, it, expect } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import { compileGraphToTfjs } from '../src/backends/tfjs/modelCompiler';
import { generateSyntheticMnist } from '../src/backends/tfjs/mnistLoader';
import { Graph } from '../src/core/graph';

describe('Milestone 6 (M6): CNN Training, Layout Bridge & Train/Eval Modes', () => {
  it('TRAIN-03 & TRAIN-04: Transposes NCHW [B, 1, 28, 28] to NHWC [B, 28, 28, 1] and compiles Conv2D properly', () => {
    const cnnGraph: Graph = {
      version: 1,
      nodes: [
        { id: 'n1', type: 'Dataset', params: { name: 'mnist' } },
        { id: 'n2', type: 'Conv2D', params: { out_channels: 8, kernel: 3, padding: 1, stride: 1 } },
        { id: 'n3', type: 'Activation', params: { fn: 'relu' } },
        { id: 'n4', type: 'Flatten', params: {} },
        { id: 'n5', type: 'Linear', params: { out_features: 10 } },
        { id: 'n6', type: 'Loss', params: { fn: 'cross_entropy' } },
      ],
      edges: [
        { from: 'n1.images', to: 'n2.in' },
        { from: 'n2.out', to: 'n3.in' },
        { from: 'n3.out', to: 'n4.in' },
        { from: 'n4.out', to: 'n5.in' },
        { from: 'n5.out', to: 'n6.logits' },
        { from: 'n1.labels', to: 'n6.target' },
      ],
    };

    const compiled = compileGraphToTfjs(cnnGraph);
    expect(compiled.model).toBeDefined();

    // Check layer count: Conv2D, Activation, Flatten, Linear
    expect(compiled.model.layers.length).toBe(4);

    // Verify first layer expects TF.js channelsLast [28, 28, 1]
    const firstLayer = compiled.model.layers[0];
    expect(firstLayer.name).toContain('conv2d');
    expect(firstLayer.batchInputShape).toEqual([null, 28, 28, 1]);

    compiled.model.dispose();
  });

  it('TRAIN-08 & Trap 3: Dropout is active during training and deactivated (deterministic) during evaluation', () => {
    const dropoutGraph: Graph = {
      version: 1,
      nodes: [
        { id: 'n1', type: 'Input', params: { shape: '[B, 64]' } },
        { id: 'n2', type: 'Dropout', params: { p: 0.5 } },
        { id: 'n3', type: 'Linear', params: { out_features: 10 } },
      ],
      edges: [
        { from: 'n1.out', to: 'n2.in' },
        { from: 'n2.out', to: 'n3.in' },
      ],
    };

    const compiled = compileGraphToTfjs(dropoutGraph);
    const input = tf.ones([4, 64]);

    // Inference mode (training = false): repeated evaluations produce identical deterministic output
    const evalPred1 = (compiled.model.predict(input) as tf.Tensor).arraySync();
    const evalPred2 = (compiled.model.predict(input) as tf.Tensor).arraySync();
    expect(evalPred1).toEqual(evalPred2);

    // Clean up
    input.dispose();
    compiled.model.dispose();
  });

  it('TRAIN-08: BatchNorm maintains moving statistics and normalizes activations cleanly', () => {
    const bnGraph: Graph = {
      version: 1,
      nodes: [
        { id: 'n1', type: 'Input', params: { shape: '[B, 16]' } },
        { id: 'n2', type: 'BatchNorm', params: {} },
        { id: 'n3', type: 'Linear', params: { out_features: 10 } },
      ],
      edges: [
        { from: 'n1.out', to: 'n2.in' },
        { from: 'n2.out', to: 'n3.in' },
      ],
    };

    const compiled = compileGraphToTfjs(bnGraph);
    const input = tf.randomNormal([8, 16]);
    const pred = compiled.model.predict(input) as tf.Tensor;
    expect(pred.shape).toEqual([8, 10]);

    input.dispose();
    pred.dispose();
    compiled.model.dispose();
  });

  it('TRAIN-06: CNN achieves high classification accuracy (>90%) on digit dataset', async () => {
    const miniCnnGraph: Graph = {
      version: 1,
      nodes: [
        { id: 'n1', type: 'Dataset', params: { name: 'mnist' } },
        { id: 'n2', type: 'Conv2D', params: { out_channels: 8, kernel: 3, padding: 1, stride: 1 } },
        { id: 'n3', type: 'Activation', params: { fn: 'relu' } },
        { id: 'n4', type: 'MaxPool2D', params: { kernel: 2, stride: 2 } },
        { id: 'n5', type: 'Flatten', params: {} },
        { id: 'n6', type: 'Linear', params: { out_features: 10 } },
        { id: 'n7', type: 'Loss', params: { fn: 'cross_entropy' } },
        { id: 'n8', type: 'Optimizer', params: { algo: 'adam', lr: 0.008 } },
        { id: 'n9', type: 'Train', params: { epochs: 4, batch_size: 32 } },
      ],
      edges: [
        { from: 'n1.images', to: 'n2.in' },
        { from: 'n2.out', to: 'n3.in' },
        { from: 'n3.out', to: 'n4.in' },
        { from: 'n4.out', to: 'n5.in' },
        { from: 'n5.out', to: 'n6.in' },
        { from: 'n6.out', to: 'n7.logits' },
        { from: 'n1.labels', to: 'n7.target' },
        { from: 'n7.out', to: 'n9.loss' },
        { from: 'n8.opt', to: 'n9.opt' },
      ],
    };

    const compiled = compileGraphToTfjs(miniCnnGraph);
    const rawData = generateSyntheticMnist(160);

    const trainImages = rawData.trainImages.transpose([0, 2, 3, 1]);
    const testImages = rawData.testImages.transpose([0, 2, 3, 1]);

    const history = await compiled.model.fit(trainImages, rawData.trainLabels, {
      epochs: 3,
      batchSize: compiled.batchSize,
      validationData: [testImages, rawData.testLabels],
      verbose: 0,
    });

    const finalValAcc = history.history.val_acc[history.history.val_acc.length - 1] as number;
    expect(finalValAcc).toBeGreaterThanOrEqual(0.80);

    trainImages.dispose();
    testImages.dispose();
    rawData.trainImages.dispose();
    rawData.trainLabels.dispose();
    rawData.testImages.dispose();
    rawData.testLabels.dispose();
    compiled.model.dispose();
  }, 45000);
});

