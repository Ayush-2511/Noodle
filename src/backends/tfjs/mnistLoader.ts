/**
 * Noodle - MNIST Dataset Loader
 * 
 * Provides normalized MNIST image tensors and one-hot labels.
 * Trap 6 (mvp-guide.md § 10):
 * - Images scaled to [0, 1].
 * - Labels converted to integer classes / one-hot encodings.
 */

import * as tf from '@tensorflow/tfjs';

export interface MnistData {
  trainImages: tf.Tensor;
  trainLabels: tf.Tensor;
  testImages: tf.Tensor;
  testLabels: tf.Tensor;
  sampleCount: number;
}

/**
 * Generates synthetic digit patterns [B, 1, 28, 28] for offline testing and fast verification.
 * Enables tests and browser runs to execute in seconds without waiting for 50MB external downloads.
 */
export function generateSyntheticMnist(numSamples = 600): MnistData {
  return tf.tidy(() => {
    const rawImages: number[][][][] = [];
    const rawLabels: number[][] = [];

    for (let i = 0; i < numSamples; i++) {
      const label = i % 10;
      const img: number[][][] = [[]]; // channel 1
      const channel: number[][] = [];

      for (let r = 0; r < 28; r++) {
        const row: number[] = [];
        for (let c = 0; c < 28; c++) {
          // Distinct deterministic geometric pattern for each digit 0-9
          const centerDist = Math.hypot(r - 14, c - 14);
          let pixel = 0;
          if (label === 0 && Math.abs(centerDist - 8) < 2) pixel = 0.9;
          else if (label === 1 && Math.abs(c - 14) < 2 && r > 4 && r < 24) pixel = 0.9;
          else if (label === 2 && ((r < 10 && c > 8 && c < 20) || (r > 18 && c > 8 && c < 20) || Math.abs(r - (28 - c)) < 2)) pixel = 0.9;
          else if (label === 3 && (Math.abs(r - 14) < 2 || Math.abs(r - 7) < 2 || Math.abs(r - 21) < 2) && c > 12) pixel = 0.9;
          else if (label === 4 && (c === 10 && r < 16) || (r === 16 && c < 20) || (c === 18 && r > 6 && r < 24)) pixel = 0.9;
          else if (label === 7 && (r === 6 || Math.abs(r - (28 - c)) < 2)) pixel = 0.9;
          else if (centerDist < 4 + (label % 4)) pixel = 0.85;

          // Add slight noise
          pixel = Math.min(1.0, Math.max(0.0, pixel + (Math.sin(i * 13 + r * 7 + c) * 0.05)));
          row.push(pixel);
        }
        channel.push(row);
      }
      img[0] = channel;
      rawImages.push(img);

      // One-hot label vector for 10 classes
      const oneHot = new Array(10).fill(0);
      oneHot[label] = 1;
      rawLabels.push(oneHot);
    }

    // Split 80/20 train/test
    const trainCount = Math.floor(numSamples * 0.8);
    const trainImgs = rawImages.slice(0, trainCount);
    const trainLbls = rawLabels.slice(0, trainCount);
    const testImgs = rawImages.slice(trainCount);
    const testLbls = rawLabels.slice(trainCount);

    return {
      trainImages: tf.tensor4d(trainImgs, [trainCount, 1, 28, 28], 'float32'),
      trainLabels: tf.tensor2d(trainLbls, [trainCount, 10], 'float32'),
      testImages: tf.tensor4d(testImgs, [numSamples - trainCount, 1, 28, 28], 'float32'),
      testLabels: tf.tensor2d(testLbls, [numSamples - trainCount, 10], 'float32'),
      sampleCount: numSamples,
    };
  });
}

