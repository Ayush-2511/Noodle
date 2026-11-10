import { NodeDefinition } from './types';

/**
 * Linear (Fully Connected) Node
 * 
 * Applies an affine transformation: y = xA^T + b.
 * Expects a 2-D input batch [B, F] and projects to [B, out_features].
 */
export const linearNodeDef: NodeDefinition = {
  type: 'Linear',
  label: 'Linear',
  group: 'Layers',
  summary: 'Fully-connected layer connecting all inputs to all outputs',
  description: 'Multiplies incoming features by a weight matrix and adds bias (y = Wx + b). Standard decision-making layer in neural networks. Set to 10 for MNIST digit classes.',
  defaultParams: {
    out_features: 128,
  },
  inputs: [
    {
      id: 'in',
      label: 'in',
      type: 'tensor',
    },
  ],
  outputs: [
    {
      id: 'out',
      label: 'out',
      type: 'tensor',
    },
  ],
  paramFields: [
    {
      key: 'out_features',
      label: 'Out Features',
      type: 'number',
      min: 1,
      step: 1,
      help: 'Number of neurons (e.g. 128 hidden units, or 10 final digit classes)',
    },
  ],
};

