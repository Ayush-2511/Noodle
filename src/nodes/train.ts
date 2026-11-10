import { NodeDefinition } from './types';

/**
 * Train Node (v1 & v2 Compatible)
 * 
 * Orchestrates the model training execution loop.
 * In v2: takes compiled model and training data, optimizes weights, outputs trained_model and history.
 * In v1: connects loss and optimizer into execution engine.
 */
export const trainNodeDef: NodeDefinition = {
  type: 'Train',
  label: 'Train',
  group: 'Training',
  summary: 'Runs training loop with live loss & epoch progress',
  description: 'Takes the compiled neural network and training data, executes stochastic gradient descent in a background Web Worker, and outputs the trained model and metrics.',
  defaultParams: {
    optimizer: 'adam',
    lr: 0.001,
    epochs: 10,
    batch_size: 32,
    device: 'auto',
  },
  inputs: [
    {
      id: 'model',
      label: 'model',
      type: 'model',
    },
    {
      id: 'train_data',
      label: 'train_data',
      type: 'dataset',
    },
    {
      id: 'loss',
      label: 'loss',
      type: 'scalar',
    },
    {
      id: 'opt',
      label: 'optimizer',
      type: 'optimizer',
    },
  ],
  outputs: [
    {
      id: 'trained_model',
      label: 'trained_model',
      type: 'model',
    },
    {
      id: 'history',
      label: 'history',
      type: 'metrics',
    },
    {
      id: 'metrics',
      label: 'metrics',
      type: 'metrics',
    },
  ],
  paramFields: [
    {
      key: 'optimizer',
      label: 'Optimizer',
      type: 'select',
      options: [
        { label: 'Adam (Adaptive Moment Estimation)', value: 'adam' },
        { label: 'SGD (Stochastic Gradient Descent)', value: 'sgd' },
        { label: 'RMSprop (Root Mean Square Propagation)', value: 'rmsprop' },
      ],
      help: 'Optimization algorithm that calculates how weights are adjusted based on gradients.',
    },
    {
      key: 'lr',
      label: 'Learning Rate',
      type: 'number',
      min: 0.00001,
      max: 1.0,
      step: 0.0005,
      help: 'Step size taken during weight updates. Small = slow, Large = unstable.',
    },
    {
      key: 'epochs',
      label: 'Epochs',
      type: 'number',
      min: 1,
      max: 100,
      step: 1,
      help: 'How many times the network iterates over the complete training dataset.',
    },
    {
      key: 'batch_size',
      label: 'Batch Size',
      type: 'number',
      min: 1,
      max: 512,
      step: 8,
      help: 'Number of training samples processed before updating weights.',
    },
    {
      key: 'device',
      label: 'Compute Device',
      type: 'select',
      options: [
        { label: 'Auto (GPU Preferred)', value: 'auto' },
        { label: 'WebGPU (DirectX 12 / Vulkan)', value: 'webgpu' },
        { label: 'WebGL (GPU Shaders)', value: 'webgl' },
        { label: 'CPU (Multi-Threaded Worker)', value: 'cpu' },
      ],
      help: 'Hardware execution device. WebGPU uses DirectX 12 / Vulkan compute shaders on your GPU.',
    },
  ],
};
