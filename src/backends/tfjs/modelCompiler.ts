/**
 * Noodle - TF.js Model Compiler
 * 
 * GOLDEN RULE (mvp-guide.md § 2):
 * The backends only READ the validated graph.
 * Compiles a validated Graph JSON into a native TensorFlow.js model.
 */

import * as tf from '@tensorflow/tfjs';
import { Graph } from '../../core/graph';
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

  // Build sequential layers following topological order
  const model = tf.sequential();
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
        model.add(tf.layers.flatten(config));
        break;
      }

      case 'Linear': {
        const outFeatures = Number(node.params.out_features) || 10;
        const config: any = { units: outFeatures, useBias: true };
        if (isFirstLayer) {
          config.inputShape = inputShape;
          isFirstLayer = false;
        }
        model.add(tf.layers.dense(config));
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
        model.add(tf.layers.activation(config));
        break;
      }

      case 'Dropout': {
        const rate = Number(node.params.p) || 0.5;
        const config: any = { rate };
        if (isFirstLayer) {
          config.inputShape = inputShape;
          isFirstLayer = false;
        }
        model.add(tf.layers.dropout(config));
        break;
      }

      case 'BatchNorm': {
        const config: any = {};
        if (isFirstLayer) {
          config.inputShape = inputShape;
          isFirstLayer = false;
        }
        model.add(tf.layers.batchNormalization(config));
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
        model.add(tf.layers.conv2d(config));
        break;
      }

      case 'MaxPool2D': {
        const poolSize = Number(node.params.kernel) || 2;
        const strides = Number(node.params.stride) || 2;
        model.add(tf.layers.maxPooling2d({ poolSize, strides, dataFormat: 'channelsLast' }));
        break;
      }

      default:
        break;
    }
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
