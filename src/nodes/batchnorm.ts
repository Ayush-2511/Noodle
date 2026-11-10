import { NodeDefinition } from './types';

/**
 * BatchNorm Node
 * 
 * Normalizes layer inputs across the batch dimension.
 * Preserves tensor shape.
 */
export const batchnormNodeDef: NodeDefinition = {
  type: 'BatchNorm',
  label: 'BatchNorm',
  group: 'Layers',
  summary: 'Normalizes activations to stabilize and accelerate training',
  description: 'Maintains zero mean and unit variance across batch activations. Prevents internal covariate shift and enables faster, more stable learning.',
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

