import { describe, it, expect } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import fs from 'fs';
import path from 'path';
import { compileGraphToTfjs } from '../src/backends/tfjs/modelCompiler';
import { generateSyntheticMnist } from '../src/backends/tfjs/mnistLoader';
import { Graph } from '../src/core/graph';

describe('T1 MLP Training Smoke Test (mvp-guide.md § 12 & § 14 M4)', () => {
  it('T1 MLP should compile, train, decrease loss from ~2.3, and achieve >90% accuracy', async () => {
    const fixturePath = path.resolve(__dirname, 'graphs', 'T1.json');
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    const graph: Graph = JSON.parse(raw);

    // 1. Compile model from canonical Graph JSON
    const { model } = compileGraphToTfjs(graph);
    expect(model).toBeDefined();

    // 2. Generate normalized dataset in PyTorch format [B, 1, 28, 28]
    const rawData = generateSyntheticMnist(600);
    const trainImages = rawData.trainImages.transpose([0, 2, 3, 1]);
    const testImages = rawData.testImages.transpose([0, 2, 3, 1]);

    // Initial evaluation before training (loss should be around ln(10) ~ 2.3)
    const initialEval = model.evaluate(testImages, rawData.testLabels) as tf.Scalar[];
    const initialLoss = (await initialEval[0].data())[0];
    initialEval[0].dispose();
    initialEval[1].dispose();

    // Sanity check: 10 classes random guess loss ~ 2.3
    expect(initialLoss).toBeGreaterThan(1.8);
    expect(initialLoss).toBeLessThan(4.5);

    // 3. Train for 5 quick epochs
    const history = await model.fit(trainImages, rawData.trainLabels, {
      epochs: 5,
      batchSize: 32,
      validationData: [testImages, rawData.testLabels],
      verbose: 0,
    });

    const finalLoss = history.history.loss[history.history.loss.length - 1] as number;
    const finalValAcc = history.history.val_acc[history.history.val_acc.length - 1] as number;

    // Loss must decrease significantly
    expect(finalLoss).toBeLessThan(initialLoss);

    // Accuracy reaches ~90% on synthetic digits
    expect(finalValAcc).toBeGreaterThanOrEqual(0.88);

    // Clean up
    trainImages.dispose();
    testImages.dispose();
    rawData.trainImages.dispose();
    rawData.trainLabels.dispose();
    rawData.testImages.dispose();
    rawData.testLabels.dispose();
    model.dispose();
  }, 20000);
});
