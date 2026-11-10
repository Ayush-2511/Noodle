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
import '@tensorflow/tfjs-backend-webgpu';
import { compileGraphToTfjs } from './modelCompiler';
import { generateSyntheticMnist, MnistData } from './mnistLoader';
import { Graph } from '../../core/graph';
import { TabularDataset } from '../../core/authenticDatasets';

export interface WorkerTrainingConfig {
  epochs?: number;
  batchSize?: number;
  sampleCount?: number;
  preferredBackend?: 'auto' | 'webgpu' | 'webgl' | 'cpu';
}

let initializedBackend: string | null = null;

/**
 * Initializes and activates the requested or highest-capability hardware acceleration backend:
 * 1. WebGPU (DirectX 12 / Vulkan modern compute shaders)
 * 2. WebGL (Direct3D shaders via ANGLE)
 * 3. CPU (Thread-pool fallback)
 */
export async function ensureBackend(preferred?: 'auto' | 'webgpu' | 'webgl' | 'cpu'): Promise<string> {
  const req = preferred || 'auto';

  if (req === 'webgpu') {
    try {
      await tf.setBackend('webgpu');
      await tf.ready();
      initializedBackend = 'webgpu';
      return 'webgpu';
    } catch (err) {
      console.warn('[Noodle Worker] Requested WebGPU failed, attempting fallback:', err);
    }
  } else if (req === 'webgl') {
    try {
      await tf.setBackend('webgl');
      await tf.ready();
      initializedBackend = 'webgl';
      return 'webgl';
    } catch (err) {
      console.warn('[Noodle Worker] Requested WebGL failed, attempting fallback:', err);
    }
  } else if (req === 'cpu') {
    try {
      await tf.setBackend('cpu');
      await tf.ready();
      initializedBackend = 'cpu';
      return 'cpu';
    } catch (err) {
      console.error('[Noodle Worker] CPU backend initialization failed:', err);
    }
  }

  if (initializedBackend && req === 'auto') {
    return initializedBackend;
  }

  // Auto-detection strategy: prioritize GPU hardware acceleration
  // 1. Try WebGPU (DirectX 12 / Vulkan)
  try {
    if (typeof navigator !== 'undefined' && (navigator as any).gpu) {
      await tf.setBackend('webgpu');
      await tf.ready();
      initializedBackend = 'webgpu';
      console.log('[Noodle Worker] GPU acceleration active: WebGPU (DirectX 12 / Vulkan)');
      return 'webgpu';
    }
  } catch (err) {
    console.warn('[Noodle Worker] WebGPU adapter not available in worker context, trying WebGL...');
  }

  // 2. Try WebGL (Direct3D / OpenGL shaders)
  try {
    await tf.setBackend('webgl');
    await tf.ready();
    initializedBackend = 'webgl';
    console.log('[Noodle Worker] GPU acceleration active: WebGL');
    return 'webgl';
  } catch (err) {
    console.warn('[Noodle Worker] WebGL context not available, falling back to CPU:', err);
  }

  // 3. Fallback to CPU
  try {
    await tf.setBackend('cpu');
    await tf.ready();
    initializedBackend = 'cpu';
    console.log('[Noodle Worker] Running on CPU backend');
    return 'cpu';
  } catch {
    return tf.getBackend() || 'cpu';
  }
}

// Auto-probe hardware backend on worker launch
ensureBackend('auto').then((b) => {
  self.postMessage({
    type: 'BACKEND_INITIALIZED',
    backend: b,
  });
});

export interface StartTrainingMessage {
  type: 'START_TRAINING';
  graph: Graph;
  config?: WorkerTrainingConfig;
  customData?: TabularDataset | null;
}

export interface StopTrainingMessage {
  type: 'STOP_TRAINING';
}

export interface RunEvaluationMessage {
  type: 'RUN_EVALUATION';
  id?: string;
  graph: Graph;
}

export interface RunPredictionMessage {
  type: 'RUN_PREDICTION';
  id?: string;
  inputData: number[];
  shape?: number[];
  graph?: Graph;
}

export interface GetTestSamplesMessage {
  type: 'GET_TEST_SAMPLES';
  id?: string;
}

export type TrainingInMessage =
  | StartTrainingMessage
  | StopTrainingMessage
  | RunEvaluationMessage
  | RunPredictionMessage
  | GetTestSamplesMessage;

let activeModel: tf.LayersModel | null = null;
let activeTestData: { testImages: tf.Tensor; testLabels: tf.Tensor } | null = null;

function convertCustomDatasetToTensors(
  customData: TabularDataset,
  expectedShape?: (number | null)[],
  expectedOutputClasses = 10
): MnistData | null {
  const numRows = customData.rows.length;
  if (numRows === 0) return null;

  const targetColIdx = customData.headers.indexOf(customData.targetColumn);
  const targetIdx = targetColIdx >= 0 ? targetColIdx : customData.headers.length - 1;
  const numCols = customData.headers.length;
  const numFeatures = numCols - 1;

  if (numFeatures <= 0) return null;

  // High-performance typed buffers: avoids allocating tens of thousands of nested JS array objects
  const flatFeatures = new Float32Array(numRows * numFeatures);
  const flatLabels = new Int32Array(numRows);
  const classMap = new Map<string, number>();

  let hasLargeValues = false;

  for (let i = 0; i < numRows; i++) {
    const row = customData.rows[i];
    const featOffset = i * numFeatures;
    let fIdx = 0;

    for (let c = 0; c < numCols; c++) {
      if (c === targetIdx) continue;
      const v = Number(row[c]);
      const safeVal = isNaN(v) ? 0 : v;
      if (safeVal > 1.0) hasLargeValues = true;
      flatFeatures[featOffset + fIdx] = safeVal;
      fIdx++;
    }

    const rawTarget = row[targetIdx];
    let labelNum = Number(rawTarget);
    if (isNaN(labelNum)) {
      const str = String(rawTarget);
      if (!classMap.has(str)) {
        classMap.set(str, classMap.size);
      }
      labelNum = classMap.get(str)!;
    }
    flatLabels[i] = labelNum;
  }

  // Auto-normalize pixel brightness if 784 features (MNIST/Fashion) and values exceed 1.0 (e.g. 0-255 pixels)
  if (numFeatures === 784 && hasLargeValues) {
    for (let p = 0; p < flatFeatures.length; p++) {
      flatFeatures[p] /= 255.0;
    }
  }

  const numClasses = expectedOutputClasses || 10;
  const trainSplit = Math.max(1, Math.floor(numRows * 0.8));
  const testSplit = numRows - trainSplit;

  return tf.tidy(() => {
    // Instant tensor construction directly from flat memory buffers
    const allX = tf.tensor2d(flatFeatures, [numRows, numFeatures]);
    const allY = tf.oneHot(tf.tensor1d(flatLabels, 'int32'), numClasses);

    let trainX = allX.slice([0, 0], [trainSplit, -1]);
    const trainY = allY.slice([0, 0], [trainSplit, -1]);
    let testX = allX.slice([trainSplit, 0], [testSplit > 0 ? testSplit : trainSplit, -1]);
    const testY = allY.slice([trainSplit, 0], [testSplit > 0 ? testSplit : trainSplit, -1]);

    // Reshape to NHWC if network expects 4D [B, 28, 28, 1]
    if (expectedShape && expectedShape.length === 4 && numFeatures === 784) {
      trainX = trainX.reshape([trainSplit, 28, 28, 1]);
      testX = testX.reshape([testSplit > 0 ? testSplit : trainSplit, 28, 28, 1]);
    }

    return {
      trainImages: trainX,
      trainLabels: trainY,
      testImages: testX,
      testLabels: testY,
      sampleCount: numRows,
    };
  });
}

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
      const rawEval = model.evaluate(testData.testImages, testData.testLabels);
      const evalTensors = Array.isArray(rawEval) ? rawEval : [rawEval];
      const loss = (await evalTensors[0].data())[0];
      const acc = evalTensors.length > 1 ? (await evalTensors[1].data())[0] : 0;
      evalTensors.forEach((t) => {
        try { t.dispose(); } catch {}
      });

      self.postMessage({
        type: 'EVALUATION_COMPLETED',
        id: msg.id,
        loss,
        accuracy: acc,
        sampleCount: testData.testImages.shape[0],
      });
    } catch (err: any) {
      self.postMessage({
        type: 'EVALUATION_ERROR',
        id: msg.id,
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

      const expectedShape = model.inputs[0]?.shape; // e.g. [null, 784] or [null, 28, 28, 1] or [null, 32, 32, 3]

      const inputTensor = tf.tidy(() => {
        const raw = tf.tensor(msg.inputData);
        if (expectedShape && expectedShape.length === 2) {
          const featCount = expectedShape[1] || msg.inputData.length;
          if (msg.inputData.length !== featCount) {
            const slice = msg.inputData.slice(0, featCount);
            while (slice.length < featCount) slice.push(0);
            return tf.tensor(slice).reshape([1, featCount]);
          }
          return raw.reshape([1, featCount]);
        }
        if (expectedShape && expectedShape.length === 4) {
          const h = expectedShape[1] || 28;
          const w = expectedShape[2] || 28;
          const c = expectedShape[3] || 1;
          if (msg.inputData.length === h * w && c === 3) {
            return raw.reshape([1, h, w, 1]).tile([1, 1, 1, 3]);
          }
          return raw.reshape([1, h, w, c]);
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
        id: msg.id,
        probabilities: probArray,
        topClass,
      });
    } catch (err: any) {
      self.postMessage({
        type: 'PREDICTION_ERROR',
        id: msg.id,
        error: err?.message || String(err),
      });
    }
    return;
  }

  if (msg.type === 'GET_TEST_SAMPLES') {
    try {
      let testData = activeTestData;
      if (!testData) {
        const rawData = generateSyntheticMnist(200);
        let testImages: tf.Tensor = rawData.testImages;
        if (rawData.testImages.rank === 4 && rawData.testImages.shape[1] === 1) {
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

      const total = testData.testImages.shape[0];
      const count = Math.min(10, total);
      const samples: Array<{ index: number; trueClass: number; pixels: number[] }> = [];

      for (let i = 0; i < count; i++) {
        const is2d = testData.testImages.rank === 2;
        const imgSlice = is2d
          ? testData.testImages.slice([i, 0], [1, -1])
          : testData.testImages.slice([i, 0, 0, 0], [1, -1, -1, -1]);
        const lblSlice = testData.testLabels.slice([i, 0], [1, -1]);

        const pixels = Array.from(await imgSlice.data());
        const oneHot = Array.from(await lblSlice.data());
        let trueClass = 0;
        let maxV = oneHot[0] ?? 0;
        for (let c = 1; c < oneHot.length; c++) {
          if (oneHot[c] > maxV) {
            maxV = oneHot[c];
            trueClass = c;
          }
        }

        samples.push({ index: i, trueClass, pixels });
        imgSlice.dispose();
        lblSlice.dispose();
      }

      self.postMessage({
        type: 'TEST_SAMPLES_COMPLETED',
        id: msg.id,
        samples,
      });
    } catch (err: any) {
      self.postMessage({
        type: 'TEST_SAMPLES_ERROR',
        id: msg.id,
        error: err?.message || String(err),
      });
    }
    return;
  }

  if (msg.type === 'START_TRAINING') {
    let data: MnistData | null = null;

    try {
      cleanupSession();

      // Ensure optimal hardware acceleration backend is active
      const activeBackend = await ensureBackend(msg.config?.preferredBackend);

      // 1. Compile model from canonical Graph JSON
      const compiled = compileGraphToTfjs(msg.graph);
      activeModel = compiled.model;
      const model = compiled.model;

      const initialTensors = tf.memory().numTensors;
      self.postMessage({
        type: 'TRAINING_STARTED',
        numTensors: initialTensors,
        backend: activeBackend,
      });

      const expectedShape = model.inputs[0]?.shape;
      const expectedOutputClasses = model.outputs[0]?.shape[1] || 10;

      // 2. Load dataset (custom dataset if provided, else benchmark)
      let rawData: MnistData | null = null;
      if (msg.customData && msg.customData.rows && msg.customData.rows.length > 0) {
        rawData = convertCustomDatasetToTensors(msg.customData, expectedShape, expectedOutputClasses);
      }
      if (!rawData) {
        rawData = generateSyntheticMnist(msg.config?.sampleCount || 800);
      }

      // Handle PyTorch [B, C, H, W] -> TF.js input format
      let trainImages: tf.Tensor = rawData.trainImages;
      let testImages: tf.Tensor = rawData.testImages;

      if (expectedShape && expectedShape.length === 2 && expectedShape[1] === 784) {
        trainImages = rawData.trainImages.reshape([rawData.trainImages.shape[0], 784]);
        testImages = rawData.testImages.reshape([rawData.testImages.shape[0], 784]);
        rawData.trainImages.dispose();
        rawData.testImages.dispose();
      } else if (rawData.trainImages.rank === 4 && rawData.trainImages.shape[1] === 1) {
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
        sampleCount: data.testImages.shape[0],
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
