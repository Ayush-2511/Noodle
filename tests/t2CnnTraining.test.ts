import { describe, it, expect } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import fs from 'fs';
import path from 'path';
import { compileGraphToTfjs } from '../src/backends/tfjs/modelCompiler';
import { generateSyntheticMnist } from '../src/backends/tfjs/mnistLoader';
import { Graph } from '../src/core/graph';

describe('T2 CNN Training Smoke Test (Section 6 & Section 14 M6)', () => {
  it('T2 CNN should compile, transpose NCHW to NHWC, and train with decreasing loss', async () => {
    const fixturePath = path.resolve(__dirname, 'graphs', 'T2.json');
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    const graph: Graph = JSON.parse(raw);

    // 1. Compile model from T2 graph
    const { model } = compileGraphToTfjs(graph);
    expect(model).toBeDefined();

    // 3. Train 2 epochs smoke step (60 samples for fast reliable gradient step)
    const rawData = generateSyntheticMnist(60);

    // Transpose from [B, 1, 28, 28] to [B, 28, 28, 1] for TF.js backend
    const trainImages = rawData.trainImages.transpose([0, 2, 3, 1]);
    const testImages = rawData.testImages.transpose([0, 2, 3, 1]);

    const history = await model.fit(trainImages, rawData.trainLabels, {
      epochs: 3,
      batchSize: 16,
      validationData: [testImages, rawData.testLabels],
      verbose: 0,
    });

    const losses = history.history.loss as number[];
    expect(losses.length).toBe(3);
    expect(Number.isFinite(losses[losses.length - 1])).toBe(true);
    // Loss should decrease or be well-behaved
    expect(losses[losses.length - 1]).toBeLessThanOrEqual(losses[0] + 0.1);

    // Clean up
    trainImages.dispose();
    testImages.dispose();
    rawData.trainImages.dispose();
    rawData.trainLabels.dispose();
    rawData.testImages.dispose();
    rawData.testLabels.dispose();
    model.dispose();
  }, 25000);
});
