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

export interface RunEvaluationMessage {
  type: 'RUN_EVALUATION';
  graph: Graph;
}

export interface RunPredictionMessage {
  type: 'RUN_PREDICTION';
  inputData: number[];
  shape?: number[];
  graph?: Graph;
}

export type TrainingInMessage =
  | StartTrainingMessage
  | StopTrainingMessage
  | RunEvaluationMessage
  | RunPredictionMessage;

let activeModel: tf.LayersModel | null = null;
let activeTestData: { testImages: tf.Tensor; testLabels: tf.Tensor } | null = null;

function cleanupSession() {
  if (activeTestData) {
    try {
      activeTestData.testImages.dispose();
      activeTestData.testLabels.dispose();
    } catch {
      // ignore
    }
    activeTestData = null;
  }
  if (activeModel) {
    try {
      activeModel.dispose();
    } catch {
      // ignore
    }
    activeModel = null;
  }
}

self.onmessage = async (e: MessageEvent<TrainingInMessage>) => {
  const msg = e.data;

  if (msg.type === 'STOP_TRAINING') {
    if (activeModel) {
      activeModel.stopTraining = true;
    }
    self.postMessage({ type: 'TRAINING_STOPPED' });
    return;
  }

  if (msg.type === 'RUN_EVALUATION') {
    try {
      let model = activeModel;
      let testData = activeTestData;

      // If no model trained yet, compile an initial model from graph
      if (!model) {
        const compiled = compileGraphToTfjs(msg.graph);
        model = compiled.model;
        activeModel = model;
      }

      // If no test data loaded yet, load synthetic evaluation test data
      if (!testData) {
        const rawData = generateSyntheticMnist(200);
        let testImages: tf.Tensor = rawData.testImages;
        const expectedShape = model.inputs[0]?.shape;

        if (expectedShape && expectedShape.length === 2 && expectedShape[1] === 784) {
          testImages = rawData.testImages.reshape([rawData.testImages.shape[0], 784]);
          rawData.testImages.dispose();
        } else if (rawData.testImages.rank === 4) {
          testImages = rawData.testImages.transpose([0, 2, 3, 1]);
          rawData.testImages.dispose();
        }
        rawData.trainImages.dispose();
        rawData.trainLabels.dispose();

        testData = {
          testImages,
          testLabels: rawData.testLabels,
        };
        activeTestData = testData;
      }

      // Real evaluation using TensorFlow.js
      const evalResult = model.evaluate(testData.testImages, testData.testLabels) as tf.Scalar[];
      const loss = (await evalResult[0].data())[0];
      const acc = (await evalResult[1].data())[0];
      evalResult[0].dispose();
      evalResult[1].dispose();

      self.postMessage({
        type: 'EVALUATION_COMPLETED',
        loss,
        accuracy: acc,
      });
    } catch (err: any) {
      self.postMessage({
        type: 'EVALUATION_ERROR',
        error: err?.message || String(err),
      });
    }
    return;
  }

  if (msg.type === 'RUN_PREDICTION') {
    try {
      let model = activeModel;
      if (!model && msg.graph) {
        const compiled = compileGraphToTfjs(msg.graph);
        model = compiled.model;
        activeModel = model;
      }

      if (!model) {
        throw new Error('No active model available for prediction');
      }

      const expectedShape = model.inputs[0]?.shape;
      const isFlattened = expectedShape && expectedShape.length === 2 && expectedShape[1] === 784;

      const inputTensor = tf.tidy(() => {
        const raw = tf.tensor(msg.inputData);
        if (isFlattened) {
          return raw.reshape([1, 784]);
        }
        return raw.reshape([1, 28, 28, 1]);
      });

      const logits = model.predict(inputTensor) as tf.Tensor;
      const probsTensor = tf.tidy(() => tf.softmax(logits));
      const probArray = Array.from(await probsTensor.data());

      inputTensor.dispose();
      logits.dispose();
      probsTensor.dispose();

      let topClass = 0;
      let maxProb = probArray[0] ?? 0;
      for (let i = 1; i < probArray.length; i++) {
        if (probArray[i] > maxProb) {
          maxProb = probArray[i];
          topClass = i;
        }
      }

      self.postMessage({
        type: 'PREDICTION_COMPLETED',
        probabilities: probArray,
        topClass,
      });
    } catch (err: any) {
      self.postMessage({
        type: 'PREDICTION_ERROR',
        error: err?.message || String(err),
      });
    }
    return;
  }

  if (msg.type === 'START_TRAINING') {
    let data: MnistData | null = null;

    try {
      cleanupSession();

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

      // Handle PyTorch [B, C, H, W] -> TF.js input format
      let trainImages: tf.Tensor = rawData.trainImages;
      let testImages: tf.Tensor = rawData.testImages;

      const expectedShape = model.inputs[0]?.shape;
      if (expectedShape && expectedShape.length === 2 && expectedShape[1] === 784) {
        trainImages = rawData.trainImages.reshape([rawData.trainImages.shape[0], 784]);
        testImages = rawData.testImages.reshape([rawData.testImages.shape[0], 784]);
        rawData.trainImages.dispose();
        rawData.testImages.dispose();
      } else if (rawData.trainImages.rank === 4) {
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

      // Send initial untrained baseline (Epoch 0)
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

      // 4. Final evaluation on real test set
      const evalResult = model.evaluate(data.testImages, data.testLabels) as tf.Scalar[];
      const testLoss = (await evalResult[0].data())[0];
      const testAcc = (await evalResult[1].data())[0];
      evalResult[0].dispose();
      evalResult[1].dispose();

      // Store test data for future live evaluations
      activeTestData = {
        testImages: data.testImages,
        testLabels: data.testLabels,
      };

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
      // Clean up training tensors only (retaining test set for evaluation)
      if (data) {
        data.trainImages.dispose();
        data.trainLabels.dispose();
      }
    }
  }
};
