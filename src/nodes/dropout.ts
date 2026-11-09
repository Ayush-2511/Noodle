import { NodeDefinition } from './types';

/**
 * Dropout Node
 * 
 * Regularization: randomly zeroes elements with probability p during training.
 * Preserves tensor shape.
 */
export const dropoutNodeDef: NodeDefinition = {
  type: 'Dropout',
  label: 'Dropout',
  group: 'Layers',
  defaultParams: {
    p: 0.5,
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
      key: 'p',
      label: 'Dropout Rate (p)',
      type: 'number',
      min: 0,
      max: 0.99,
      step: 0.05,
    },
  ],
};

