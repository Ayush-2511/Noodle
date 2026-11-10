/**
 * Noodle - TF.js Model Compiler
 * 
 * GOLDEN RULE (mvp-guide.md § 2):
 * The backends only READ the validated graph.
 * Compiles a validated Graph JSON into a native TensorFlow.js model.
 */

import * as tf from '@tensorflow/tfjs';
import { Graph, LayerEntry } from '../../core/graph';
import { topologicalSort } from '../../core/topoSort';

export interface CompiledTfjsModel {
  model: tf.LayersModel;
  inputShape: number[]; // e.g. [1, 28, 28] or [784]
  outputShape: number[]; // e.g. [10]
  optimizerAlgo: string;
  learningRate: number;
  epochs: number;
  batchSize: number;
}

export function compileGraphToTfjs(graph: Graph): CompiledTfjsModel {
  const topo = topologicalSort(graph);
  if (topo.hasCycle) {
    throw new Error(`Cannot compile model: graph contains a cycle (${topo.cyclePath.join(' -> ')})`);
  }

  // Check if graph uses v2 builder nodes (Classifier, FeatureExtractor)
  const isV2 = graph.nodes.some((n) => n.type === 'Classifier' || n.type === 'FeatureExtractor');
  if (isV2) {
    return compileV2Model(graph, topo.sortedNodeIds);
  }

  // Find data source node (Dataset or Input)
  const sourceNode = graph.nodes.find((n) => n.type === 'Dataset' || n.type === 'Input');
  let inputShape: number[] = [1, 28, 28]; // default MNIST channels-first

  if (sourceNode) {
    if (sourceNode.type === 'Dataset') {
      const name = String(sourceNode.params.name || 'mnist').toLowerCase();
      if (name.includes('cifar')) {
        inputShape = [3, 32, 32];
      } else {
        inputShape = [1, 28, 28];
      }
    } else if (sourceNode.type === 'Input') {
      const shapeStr = String(sourceNode.params.shape || '[B, 784]');
      const clean = shapeStr.replace(/^\[|\]$/g, '').split(',');
      const dims = clean.slice(1).map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      if (dims.length > 0) {
        inputShape = dims;
      }
    }
  }

  const isMultiBranch = graph.nodes.some((n) => n.type === 'Add' || n.type === 'Concat');

  let model: tf.LayersModel;

  if (isMultiBranch) {
    model = compileFunctionalModel(graph, topo.sortedNodeIds, inputShape);
  } else {
    // Build sequential layers following topological order
    const seqModel = tf.sequential();
    let isFirstLayer = true;

    for (const nodeId of topo.sortedNodeIds) {
      const node = graph.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      // Skip non-trainable graph utility & training nodes when assembling layers
      if (
        node.type === 'Dataset' ||
        node.type === 'Input' ||
        node.type === 'Loss' ||
        node.type === 'Optimizer' ||
        node.type === 'Train' ||
        node.type === 'Metrics' ||
        node.type === 'Predict'
      ) {
        continue;
      }

      switch (node.type) {
        case 'Flatten': {
          const config: any = {};
          if (isFirstLayer) {
            // If unbatched input was [C, H, W] (3 dims), transpose to TF.js [H, W, C]
            config.inputShape = inputShape.length === 3
              ? [inputShape[1], inputShape[2], inputShape[0]]
              : inputShape;
            isFirstLayer = false;
          }
          seqModel.add(tf.layers.flatten(config));
          break;
        }

        case 'Linear': {
          const outFeatures = Number(node.params.out_features) || 10;
          const config: any = { units: outFeatures, useBias: true };
          if (isFirstLayer) {
            config.inputShape = inputShape;
            isFirstLayer = false;
          }
          seqModel.add(tf.layers.dense(config));
          break;
        }

        case 'Activation': {
          const fn = String(node.params.fn || 'relu').toLowerCase();
          let tfActivation: any = 'relu';
          if (fn === 'sigmoid') tfActivation = 'sigmoid';
          else if (fn === 'tanh') tfActivation = 'tanh';
          else if (fn === 'softmax') tfActivation = 'softmax';
          else if (fn === 'gelu') tfActivation = 'gelu';

          const config: any = { activation: tfActivation };
          if (isFirstLayer) {
            config.inputShape = inputShape;
            isFirstLayer = false;
          }
          seqModel.add(tf.layers.activation(config));
          break;
        }

        case 'Dropout': {
          const rate = Number(node.params.p) || 0.5;
          const config: any = { rate };
          if (isFirstLayer) {
            config.inputShape = inputShape;
            isFirstLayer = false;
          }
          seqModel.add(tf.layers.dropout(config));
          break;
        }

        case 'BatchNorm': {
          const config: any = {};
          if (isFirstLayer) {
            config.inputShape = inputShape;
            isFirstLayer = false;
          }
          seqModel.add(tf.layers.batchNormalization(config));
          break;
        }

        case 'Conv2D': {
          const filters = Number(node.params.out_channels) || 16;
          const kernelSize = Number(node.params.kernel) || 3;
          const strides = Number(node.params.stride) || 1;
          const padding = Number(node.params.padding) === 0 ? 'valid' : 'same';

          const config: any = {
            filters,
            kernelSize,
            strides,
            padding,
            dataFormat: 'channelsLast', // TF.js default
          };

          if (isFirstLayer) {
            // In TF.js channelsLast: [H, W, C]
            config.inputShape = [inputShape[1] || 28, inputShape[2] || 28, inputShape[0] || 1];
            isFirstLayer = false;
          }
          seqModel.add(tf.layers.conv2d(config));
          break;
        }

        case 'MaxPool2D': {
          const poolSize = Number(node.params.kernel) || 2;
          const strides = Number(node.params.stride) || 2;
          seqModel.add(tf.layers.maxPooling2d({ poolSize, strides, dataFormat: 'channelsLast' }));
          break;
        }

        default:
          break;
      }
    }
    model = seqModel;
  }

  // Extract optimizer configuration from Optimizer node (or fallback to defaults)
  const optimizerNode = graph.nodes.find((n) => n.type === 'Optimizer');
  const optAlgo = String(optimizerNode?.params?.algo || 'adam').toLowerCase();
  const optLr = Number(optimizerNode?.params?.lr) || 0.005;

  let optimizer: tf.Optimizer;
  if (optAlgo === 'sgd') {
    optimizer = tf.train.sgd(optLr);
  } else if (optAlgo === 'rmsprop') {
    optimizer = tf.train.rmsprop(optLr);
  } else {
    optimizer = tf.train.adam(optLr);
  }

  // Extract loss objective from Loss node (or fallback to cross_entropy)
  const lossNode = graph.nodes.find((n) => n.type === 'Loss');
  const lossFn = String(lossNode?.params?.fn || 'cross_entropy').toLowerCase();
  let lossFunction: any;
  if (lossFn === 'mse') {
    lossFunction = (yTrue: tf.Tensor, yPred: tf.Tensor) => tf.losses.meanSquaredError(yTrue, yPred);
  } else {
    // CrossEntropy takes raw logits per Trap 2
    lossFunction = (yTrue: tf.Tensor, yPred: tf.Tensor) => tf.losses.softmaxCrossEntropy(yTrue, yPred);
  }

  // Extract training loop parameters from Train node
  const trainNode = graph.nodes.find((n) => n.type === 'Train');
  const epochs = Number(trainNode?.params?.epochs) || 3;
  const batchSize = Number(trainNode?.params?.batch_size) || 32;

  // Compile with configured optimizer and loss
  model.compile({
    optimizer,
    loss: lossFunction,
    metrics: ['accuracy'],
  });

  return {
    model,
    inputShape,
    outputShape: [10],
    optimizerAlgo: optAlgo,
    learningRate: optLr,
    epochs,
    batchSize,
  };
}

/**
 * Compiles a branching/merging DAG model using TensorFlow.js Functional API (tf.model)
 */
function compileFunctionalModel(
  graph: Graph,
  sortedNodeIds: string[],
  inputShape: number[]
): tf.LayersModel {
  // Determine TF.js unbatched input shape
  // PyTorch channels-first [C, H, W] -> TF.js channels-last [H, W, C]
  const tfInputShape = inputShape.length === 3
    ? [inputShape[1] || 28, inputShape[2] || 28, inputShape[0] || 1]
    : inputShape;

  const inputTensor = tf.input({ shape: tfInputShape });

  // Map of outgoing socket -> SymbolicTensor
  const socketTensors = new Map<string, tf.SymbolicTensor>();

  const sourceNode = graph.nodes.find((n) => n.type === 'Dataset' || n.type === 'Input');
  if (sourceNode) {
    if (sourceNode.type === 'Dataset') {
      socketTensors.set(`${sourceNode.id}.images`, inputTensor);
    } else {
      socketTensors.set(`${sourceNode.id}.out`, inputTensor);
    }
  }

  // Incoming edge lookup: targetSocketRef -> sourceSocketRef
  const incomingEdges = new Map<string, string>();
  for (const edge of graph.edges) {
    incomingEdges.set(edge.to, edge.from);
  }

  let lastComputedTensor: tf.SymbolicTensor | null = null;

  for (const nodeId of sortedNodeIds) {
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    if (
      node.type === 'Dataset' ||
      node.type === 'Input' ||
      node.type === 'Loss' ||
      node.type === 'Optimizer' ||
      node.type === 'Train' ||
      node.type === 'Metrics' ||
      node.type === 'Predict'
    ) {
      continue;
    }

    switch (node.type) {
      case 'Flatten': {
        const inRef = incomingEdges.get(`${node.id}.in`);
        const inTensor = inRef ? socketTensors.get(inRef) : undefined;
        if (!inTensor) throw new Error(`Flatten node ${node.id} missing input tensor`);
        const out = tf.layers.flatten().apply(inTensor) as tf.SymbolicTensor;
        socketTensors.set(`${node.id}.out`, out);
        lastComputedTensor = out;
        break;
      }

      case 'Linear': {
        const inRef = incomingEdges.get(`${node.id}.in`);
        const inTensor = inRef ? socketTensors.get(inRef) : undefined;
        if (!inTensor) throw new Error(`Linear node ${node.id} missing input tensor`);
        const outFeatures = Number(node.params.out_features) || 10;
        const out = tf.layers.dense({ units: outFeatures, useBias: true }).apply(inTensor) as tf.SymbolicTensor;
        socketTensors.set(`${node.id}.out`, out);
        lastComputedTensor = out;
        break;
      }

      case 'Activation': {
        const inRef = incomingEdges.get(`${node.id}.in`);
        const inTensor = inRef ? socketTensors.get(inRef) : undefined;
        if (!inTensor) throw new Error(`Activation node ${node.id} missing input tensor`);
        const fn = String(node.params.fn || 'relu').toLowerCase();
        let tfActivation: any = 'relu';
        if (fn === 'sigmoid') tfActivation = 'sigmoid';
        else if (fn === 'tanh') tfActivation = 'tanh';
        else if (fn === 'softmax') tfActivation = 'softmax';
        else if (fn === 'gelu') tfActivation = 'gelu';
        const out = tf.layers.activation({ activation: tfActivation }).apply(inTensor) as tf.SymbolicTensor;
        socketTensors.set(`${node.id}.out`, out);
        lastComputedTensor = out;
        break;
      }

      case 'Dropout': {
        const inRef = incomingEdges.get(`${node.id}.in`);
        const inTensor = inRef ? socketTensors.get(inRef) : undefined;
        if (!inTensor) throw new Error(`Dropout node ${node.id} missing input tensor`);
        const rate = Number(node.params.p) || 0.5;
        const out = tf.layers.dropout({ rate }).apply(inTensor) as tf.SymbolicTensor;
        socketTensors.set(`${node.id}.out`, out);
        lastComputedTensor = out;
        break;
      }

      case 'BatchNorm': {
        const inRef = incomingEdges.get(`${node.id}.in`);
        const inTensor = inRef ? socketTensors.get(inRef) : undefined;
        if (!inTensor) throw new Error(`BatchNorm node ${node.id} missing input tensor`);
        const out = tf.layers.batchNormalization().apply(inTensor) as tf.SymbolicTensor;
        socketTensors.set(`${node.id}.out`, out);
        lastComputedTensor = out;
        break;
      }

      case 'Conv2D': {
        const inRef = incomingEdges.get(`${node.id}.in`);
        const inTensor = inRef ? socketTensors.get(inRef) : undefined;
        if (!inTensor) throw new Error(`Conv2D node ${node.id} missing input tensor`);
        const filters = Number(node.params.out_channels) || 16;
        const kernelSize = Number(node.params.kernel) || 3;
        const strides = Number(node.params.stride) || 1;
        const padding = Number(node.params.padding) === 0 ? 'valid' : 'same';
        const out = tf.layers.conv2d({
          filters,
          kernelSize,
          strides,
          padding,
          dataFormat: 'channelsLast',
        }).apply(inTensor) as tf.SymbolicTensor;
        socketTensors.set(`${node.id}.out`, out);
        lastComputedTensor = out;
        break;
      }

      case 'MaxPool2D': {
        const inRef = incomingEdges.get(`${node.id}.in`);
        const inTensor = inRef ? socketTensors.get(inRef) : undefined;
        if (!inTensor) throw new Error(`MaxPool2D node ${node.id} missing input tensor`);
        const poolSize = Number(node.params.kernel) || 2;
        const strides = Number(node.params.stride) || 2;
        const out = tf.layers.maxPooling2d({ poolSize, strides, dataFormat: 'channelsLast' }).apply(inTensor) as tf.SymbolicTensor;
        socketTensors.set(`${node.id}.out`, out);
        lastComputedTensor = out;
        break;
      }

      case 'Add': {
        const refA = incomingEdges.get(`${node.id}.a`) || incomingEdges.get(`${node.id}.in1`);
        const refB = incomingEdges.get(`${node.id}.b`) || incomingEdges.get(`${node.id}.in2`);
        const tensorA = refA ? socketTensors.get(refA) : undefined;
        const tensorB = refB ? socketTensors.get(refB) : undefined;
        if (!tensorA || !tensorB) {
          throw new Error(`Add node ${node.id} requires two incoming connections`);
        }
        const out = tf.layers.add().apply([tensorA, tensorB]) as tf.SymbolicTensor;
        socketTensors.set(`${node.id}.out`, out);
        lastComputedTensor = out;
        break;
      }

      case 'Concat': {
        const refA = incomingEdges.get(`${node.id}.a`) || incomingEdges.get(`${node.id}.in1`);
        const refB = incomingEdges.get(`${node.id}.b`) || incomingEdges.get(`${node.id}.in2`);
        const tensorA = refA ? socketTensors.get(refA) : undefined;
        const tensorB = refB ? socketTensors.get(refB) : undefined;
        if (!tensorA || !tensorB) {
          throw new Error(`Concat node ${node.id} requires two incoming connections`);
        }
        let tfAxis = Number(node.params.axis ?? 1);
        if (tensorA.shape && tensorA.shape.length === 4 && tfAxis === 1) {
          tfAxis = 3;
        }
        const out = tf.layers.concatenate({ axis: tfAxis }).apply([tensorA, tensorB]) as tf.SymbolicTensor;
        socketTensors.set(`${node.id}.out`, out);
        lastComputedTensor = out;
        break;
      }
    }
  }

  const lossNode = graph.nodes.find((n) => n.type === 'Loss');
  let outputTensor = lastComputedTensor;
  if (lossNode) {
    const logitsRef = incomingEdges.get(`${lossNode.id}.logits`) || incomingEdges.get(`${lossNode.id}.in`);
    if (logitsRef && socketTensors.has(logitsRef)) {
      outputTensor = socketTensors.get(logitsRef)!;
    }
  }

  if (!outputTensor) {
    throw new Error('Cannot compile functional model: no output tensor identified');
  }

  return tf.model({ inputs: inputTensor, outputs: outputTensor });
}

/**
 * Compiles a v2 Pipeline model with builder nodes (FeatureExtractor, Classifier)
 * using standard sequential composition.
 */
function compileV2Model(
  graph: Graph,
  sortedNodeIds: string[]
): CompiledTfjsModel {
  const classifierNode = graph.nodes.find((n) => n.type === 'Classifier');
  const hasFlatten = graph.nodes.some((n) => n.type === 'Flatten');

  // Determine source data shape
  const datasetNode = graph.nodes.find((n) => n.type === 'LoadDataset' || n.type === 'Dataset' || n.type === 'Input');
  let logicalInputShape = [1, 28, 28]; // [C, H, W]
  if (datasetNode) {
    const dsName = String(datasetNode.params.dataset || datasetNode.params.name || 'mnist').toLowerCase();
    if (dsName.includes('cifar')) {
      logicalInputShape = [3, 32, 32];
    }
  }

  // TF.js expects channels-last [H, W, C] for 2D Conv
  const tfSpatialShape = [logicalInputShape[1], logicalInputShape[2], logicalInputShape[0]]; // e.g. [28, 28, 1]

  const allLayers: LayerEntry[] = [];

  // 1. Feature Extractor layers (in topological order)
  for (const nodeId of sortedNodeIds) {
    const n = graph.nodes.find((node) => node.id === nodeId);
    if (n && n.type === 'FeatureExtractor' && n.layers) {
      allLayers.push(...n.layers);
    }
  }

  // 2. Flatten if present or if bridging spatial FeatureExtractor to Linear Classifier
  const hasSpatialLayers = allLayers.some((l) => l.type === 'Conv2D' || l.type === 'MaxPool2D');
  if (hasFlatten || hasSpatialLayers) {
    allLayers.push({ id: 'auto_flatten', type: 'Flatten', params: {} });
  }

  // 3. Classifier layers
  if (classifierNode?.layers) {
    allLayers.push(...classifierNode.layers);
  }

  // Fallback if no layers defined at all
  if (allLayers.length === 0) {
    allLayers.push({ id: 'default_dense', type: 'Linear', params: { neurons: 10 } });
  }

  const model = tf.sequential();
  let isFirst = true;

  // Compile each layer
  for (const layer of allLayers) {
    const config: any = {};
    if (isFirst) {
      if (layer.type === 'Conv2D' || (layer.type === 'Flatten' && !hasSpatialLayers)) {
        config.inputShape = tfSpatialShape;
      } else if (layer.type === 'Linear') {
        config.inputShape = [logicalInputShape[0] * logicalInputShape[1] * logicalInputShape[2]]; // [784]
      } else {
        config.inputShape = tfSpatialShape;
      }
      isFirst = false;
    }

    switch (layer.type) {
      case 'Conv2D': {
        const filters = Number(layer.params.filters || layer.params.out_channels) || 8;
        const kernel = Number(layer.params.kernel || layer.params.kernel_size) || 3;
        const stride = Number(layer.params.stride) || 1;
        const padding = layer.params.padding !== undefined ? Number(layer.params.padding) : (layer.params.pad !== undefined ? Number(layer.params.pad) : 0);
        model.add(tf.layers.conv2d({
          ...config,
          filters,
          kernelSize: kernel,
          strides: stride,
          padding: padding > 0 ? 'same' : 'valid',
        }));
        break;
      }
      case 'MaxPool2D': {
        const kernel = Number(layer.params.kernel || layer.params.kernel_size) || 2;
        const stride = Number(layer.params.stride) || kernel;
        model.add(tf.layers.maxPooling2d({
          ...config,
          poolSize: kernel,
          strides: stride,
        }));
        break;
      }
      case 'Flatten': {
        model.add(tf.layers.flatten(config));
        break;
      }
      case 'Linear': {
        const neurons = Number(layer.params.neurons || layer.params.out_features || layer.params.units) || 10;
        model.add(tf.layers.dense({
          ...config,
          units: neurons,
          useBias: true,
        }));
        break;
      }
      case 'ReLU': {
        model.add(tf.layers.activation({ ...config, activation: 'relu' }));
        break;
      }
      case 'Sigmoid': {
        model.add(tf.layers.activation({ ...config, activation: 'sigmoid' }));
        break;
      }
      case 'Dropout': {
        const rate = Number(layer.params.rate) || 0.5;
        model.add(tf.layers.dropout({ ...config, rate }));
        break;
      }
      case 'BatchNorm': {
        model.add(tf.layers.batchNormalization(config));
        break;
      }
    }
  }

  // Training parameters from Train node or defaults
  const trainNode = graph.nodes.find((n) => n.type === 'Train');
  const optAlgo = String(trainNode?.params?.optimizer || 'adam').toLowerCase();
  const optLr = Number(trainNode?.params?.lr) || 0.001;
  const epochs = Number(trainNode?.params?.epochs) || 10;
  const batchSize = Number(trainNode?.params?.batch_size) || 32;

  let optimizer: tf.Optimizer;
  if (optAlgo === 'sgd') {
    optimizer = tf.train.sgd(optLr);
  } else if (optAlgo === 'rmsprop') {
    optimizer = tf.train.rmsprop(optLr);
  } else {
    optimizer = tf.train.adam(optLr);
  }

  const lossParam = String(classifierNode?.params?.loss || 'cross_entropy').toLowerCase();
  let lossFunction: any;
  if (lossParam === 'mse') {
    lossFunction = (yTrue: tf.Tensor, yPred: tf.Tensor) => tf.losses.meanSquaredError(yTrue, yPred);
  } else {
    lossFunction = (yTrue: tf.Tensor, yPred: tf.Tensor) => tf.losses.softmaxCrossEntropy(yTrue, yPred);
  }

  model.compile({
    optimizer,
    loss: lossFunction,
    metrics: ['accuracy'],
  });

  return {
    model,
    inputShape: logicalInputShape,
    outputShape: [10],
    optimizerAlgo: optAlgo,
    learningRate: optLr,
    epochs,
    batchSize,
  };
}
