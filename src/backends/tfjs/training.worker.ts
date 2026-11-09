/**
 * Noodle - TF.js Training Web Worker
 * 
 * TRAP 5 (mvp-guide.md § 10):
 * Training MUST execute in a Web Worker so the main UI thread never freezes.
 * 
 * TRAP 4 (mvp-guide.md § 10):
 * Memory leaks in TF.js: Wrap ops in tf.tidy(), dispose batch tensors,
 * and track tf.memory().numTensors.
 */

import * as tf from '@tensorflow/tfjs';
import { compileGraphToTfjs } from './modelCompiler';
import { generateSyntheticMnist, MnistData } from './mnistLoader';
import { Graph } from '../../core/graph';

export interface WorkerTrainingConfig {
  epochs?: number;
  batchSize?: number;
  sampleCount?: number;
}

export interface StartTrainingMessage {
  type: 'START_TRAINING';
  graph: Graph;
  config?: WorkerTrainingConfig;
}

export interface StopTrainingMessage {
  type: 'STOP_TRAINING';
}

export type TrainingInMessage = StartTrainingMessage | StopTrainingMessage;

let activeModel: tf.LayersModel | null = null;

self.onmessage = async (e: MessageEvent<TrainingInMessage>) => {
  const msg = e.data;

  if (msg.type === 'STOP_TRAINING') {
    if (activeModel) {
      activeModel.stopTraining = true;
    }
    self.postMessage({ type: 'TRAINING_STOPPED' });
    return;
  }

  if (msg.type === 'START_TRAINING') {
    let data: MnistData | null = null;

    try {
      // 1. Compile model from canonical Graph JSON
      const compiled = compileGraphToTfjs(msg.graph);
      activeModel = compiled.model;
      const model = compiled.model;

      const initialTensors = tf.memory().numTensors;
      self.postMessage({
        type: 'TRAINING_STARTED',
        numTensors: initialTensors,
      });

      // 2. Load dataset
      const rawData = generateSyntheticMnist(msg.config?.sampleCount || 800);

      // Section 6 & Trap 1: Handle PyTorch [B, C, H, W] -> TF.js input format
      let trainImages: tf.Tensor = rawData.trainImages;
      let testImages: tf.Tensor = rawData.testImages;

      const expectedShape = model.inputs[0]?.shape;
      if (expectedShape && expectedShape.length === 2 && expectedShape[1] === 784) {
        // Flatten to [B, 784] if model expects 2D input
        trainImages = rawData.trainImages.reshape([rawData.trainImages.shape[0], 784]);
        testImages = rawData.testImages.reshape([rawData.testImages.shape[0], 784]);
        rawData.trainImages.dispose();
        rawData.testImages.dispose();
      } else if (rawData.trainImages.rank === 4) {
        // Transpose [B, 1, 28, 28] -> [B, 28, 28, 1] for TF.js channelsLast
        trainImages = rawData.trainImages.transpose([0, 2, 3, 1]);
        testImages = rawData.testImages.transpose([0, 2, 3, 1]);
        rawData.trainImages.dispose();
        rawData.testImages.dispose();
      }

      data = {
        ...rawData,
        trainImages,
        testImages,
      };

      const epochs = msg.config?.epochs ?? compiled.epochs;
      const batchSize = msg.config?.batchSize ?? compiled.batchSize;

      // Send initial untrained baseline (Epoch 0: random initialization ~ln(10)=2.3, acc ~10%)
      try {
        const preEval = model.evaluate(data.testImages, data.testLabels) as tf.Scalar[];
        const preLoss = (await preEval[0].data())[0];
        const preAcc = (await preEval[1].data())[0];
        preEval[0].dispose();
        preEval[1].dispose();

        self.postMessage({
          type: 'EPOCH_END',
          epoch: 0,
          totalEpochs: epochs,
          loss: preLoss,
          accuracy: preAcc,
          valLoss: preLoss,
          valAccuracy: preAcc,
          numTensors: tf.memory().numTensors,
        });
      } catch {
        // Fallback if pre-eval fails
      }

      // 3. Train model with progress callbacks
      await model.fit(data.trainImages, data.trainLabels, {
        epochs,
        batchSize,
        validationData: [data.testImages, data.testLabels],
        callbacks: {
          onEpochBegin: (epoch) => {
            self.postMessage({
              type: 'EPOCH_BEGIN',
              epoch: epoch + 1,
              totalEpochs: epochs,
            });
          },
          onEpochEnd: (epoch, logs) => {
            const memory = tf.memory();
            self.postMessage({
              type: 'EPOCH_END',
              epoch: epoch + 1,
              totalEpochs: epochs,
              loss: logs?.loss ?? 0,
              accuracy: logs?.acc ?? logs?.accuracy ?? 0,
              valLoss: logs?.val_loss ?? 0,
              valAccuracy: logs?.val_acc ?? logs?.val_accuracy ?? 0,
              numTensors: memory.numTensors,
            });
          },
        },
      });

      // 4. Final evaluation
      const evalResult = model.evaluate(data.testImages, data.testLabels) as tf.Scalar[];
      const testLoss = (await evalResult[0].data())[0];
      const testAcc = (await evalResult[1].data())[0];
      evalResult[0].dispose();
      evalResult[1].dispose();

      self.postMessage({
        type: 'TRAINING_COMPLETED',
        finalLoss: testLoss,
        finalAccuracy: testAcc,
        numTensors: tf.memory().numTensors,
      });
    } catch (err: any) {
      self.postMessage({
        type: 'TRAINING_ERROR',
        error: err?.message || String(err),
      });
    } finally {
      // Clean up dataset tensors
      if (data) {
        data.trainImages.dispose();
        data.trainLabels.dispose();
        data.testImages.dispose();
        data.testLabels.dispose();
      }
    }
  }
};
