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

