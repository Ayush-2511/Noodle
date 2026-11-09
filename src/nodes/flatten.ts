import { NodeDefinition } from './types';

/**
 * Flatten Node
 * 
 * Flattens all multi-dimensional non-batch dimensions into a 2-D vector: [B, product of rest].
 * Example: [B, 16, 7, 7] -> [B, 784].
 * Required before connecting convolutional / pooling features into a Linear layer.
 */
export const flattenNodeDef: NodeDefinition = {
  type: 'Flatten',
  label: 'Flatten',
  group: 'Layers',
  defaultParams: {},
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
  paramFields: [],
};

