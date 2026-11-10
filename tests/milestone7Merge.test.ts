import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as tf from '@tensorflow/tfjs';
import { validate } from '../src/core/validator';
import { Graph } from '../src/core/graph';
import { compileGraphToTfjs } from '../src/backends/tfjs/modelCompiler';
import { generateSyntheticMnist } from '../src/backends/tfjs/mnistLoader';

function loadFixture(filename: string): Graph {
  const filePath = path.resolve(__dirname, 'graphs', filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

describe('Milestone 7 (M7): Multi-Branch & Merge Nodes (T3, T4, E2)', () => {
  it('T3: Residual skip connection graph passes shape validation and has correct shapes', () => {
    const graph = loadFixture('T3.json');
    const result = validate(graph);

    expect(result.isValid).toBe(true);
    expect(result.problems.filter((p) => p.severity === 'error')).toHaveLength(0);

    // Verify Conv outputs [B, 8, 28, 28]
    const n2Status = result.nodeStatuses.get('n2');
    expect(n2Status?.outputShapes['out']).toEqual(['B', 8, 28, 28]);

    // Verify second Conv output [B, 8, 28, 28]
    const n4Status = result.nodeStatuses.get('n4');
    expect(n4Status?.outputShapes['out']).toEqual(['B', 8, 28, 28]);

    // Verify Add output [B, 8, 28, 28]
    const n5Status = result.nodeStatuses.get('n5');
    expect(n5Status?.status).toBe('ok');
    expect(n5Status?.outputShapes['out']).toEqual(['B', 8, 28, 28]);

    // Verify Flatten output [B, 6272]
    const n7Status = result.nodeStatuses.get('n7');
    expect(n7Status?.outputShapes['out']).toEqual(['B', 6272]);

    // Verify Linear output [B, 10]
    const n8Status = result.nodeStatuses.get('n8');
    expect(n8Status?.outputShapes['out']).toEqual(['B', 10]);
  });

  it('T4: Concat channel merge graph passes shape validation and has correct shapes', () => {
    const graph = loadFixture('T4.json');
    const result = validate(graph);

    expect(result.isValid).toBe(true);
    expect(result.problems.filter((p) => p.severity === 'error')).toHaveLength(0);

    // Branch 1: Conv(8) -> [B, 8, 28, 28]
    const n2Status = result.nodeStatuses.get('n2');
    expect(n2Status?.outputShapes['out']).toEqual(['B', 8, 28, 28]);

    // Branch 2: Conv(16) -> [B, 16, 28, 28]
    const n4Status = result.nodeStatuses.get('n4');
    expect(n4Status?.outputShapes['out']).toEqual(['B', 16, 28, 28]);

    // Concat on axis 1: [B, 8+16, 28, 28] = [B, 24, 28, 28]
    const n6Status = result.nodeStatuses.get('n6');
    expect(n6Status?.status).toBe('ok');
    expect(n6Status?.outputShapes['out']).toEqual(['B', 24, 28, 28]);

    // Flatten: 24 * 28 * 28 = 18816
    const n7Status = result.nodeStatuses.get('n7');
    expect(n7Status?.outputShapes['out']).toEqual(['B', 18816]);

    // Linear(10)
    const n8Status = result.nodeStatuses.get('n8');
    expect(n8Status?.outputShapes['out']).toEqual(['B', 10]);
  });

  it('E2: Add with mismatched shapes flags red error with exact message', () => {
    const graph = loadFixture('E2.json');
    const result = validate(graph);

    expect(result.isValid).toBe(false);
    const addError = result.problems.find(
      (p) => p.nodeId === 'n3' && p.severity === 'error'
    );
    expect(addError).toBeDefined();
    expect(addError?.message).toBe('Add: got [B,16,7,7] and [B,8,7,7]. Shapes must match.');
  });

  it('T3: Compiles to TF.js Functional Model and executes forward pass', () => {
    const graph = loadFixture('T3.json');
    const compiled = compileGraphToTfjs(graph);
    expect(compiled.model).toBeDefined();

    // Input shape for TF.js channelsLast is [28, 28, 1]
    const dummyInput = tf.ones([2, 28, 28, 1]);
    const output = compiled.model.predict(dummyInput) as tf.Tensor;

    expect(output.shape).toEqual([2, 10]);

    dummyInput.dispose();
    output.dispose();
    compiled.model.dispose();
  });

  it('T4: Compiles to TF.js Functional Model and executes forward pass', () => {
    const graph = loadFixture('T4.json');
    const compiled = compileGraphToTfjs(graph);
    expect(compiled.model).toBeDefined();

    const dummyInput = tf.ones([2, 28, 28, 1]);
    const output = compiled.model.predict(dummyInput) as tf.Tensor;

    expect(output.shape).toEqual([2, 10]);

    dummyInput.dispose();
    output.dispose();
    compiled.model.dispose();
  });

  it('T3 & T4: Training smoke test passes (1 epoch on synthetic data with valid loss)', async () => {
    const data = generateSyntheticMnist(20);
    // Transpose NCHW [20, 1, 28, 28] to NHWC [20, 28, 28, 1]
    const trainImages = (data.trainImages as tf.Tensor4D).transpose([0, 2, 3, 1]);

    // 1. Train T3 Residual Model
    const t3Graph = loadFixture('T3.json');
    const t3Compiled = compileGraphToTfjs(t3Graph);

    const t3History = await t3Compiled.model.fit(trainImages, data.trainLabels, {
      epochs: 1,
      batchSize: 10,
      verbose: 0,
    });

    const t3Loss = t3History.history.loss[0] as number;
    expect(Number.isFinite(t3Loss)).toBe(true);
    expect(t3Loss).toBeLessThan(10);
    t3Compiled.model.dispose();

    // 2. Train T4 Concat Model
    const t4Graph = loadFixture('T4.json');
    const t4Compiled = compileGraphToTfjs(t4Graph);

    const t4History = await t4Compiled.model.fit(trainImages, data.trainLabels, {
      epochs: 1,
      batchSize: 10,
      verbose: 0,
    });

    const t4Loss = t4History.history.loss[0] as number;
    expect(Number.isFinite(t4Loss)).toBe(true);
    expect(t4Loss).toBeLessThan(10);
    t4Compiled.model.dispose();

    trainImages.dispose();
    data.trainImages.dispose();
    data.trainLabels.dispose();
    data.testImages.dispose();
    data.testLabels.dispose();
  }, 30000);
});
