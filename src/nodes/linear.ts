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
      help: 'Number of output neurons',
    },
  ],
};

