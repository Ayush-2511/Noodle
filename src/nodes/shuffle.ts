import { NodeDefinition } from './types';

/**
 * Shuffle Node (v2 Pipeline)
 * 
 * Randomizes the sample order to prevent ordering bias during gradient descent.
 */
export const shuffleNodeDef: NodeDefinition = {
  type: 'Shuffle',
  label: 'Shuffle',
  group: 'Pipeline',
  summary: 'Randomizes dataset order for unbiased training',
  description: 'Permutes data samples using a pseudo-random seed. Ensures batches are independent and identically distributed (IID).',
  defaultParams: {
    seed: 42,
  },
  inputs: [
    {
      id: 'data',
      label: 'data',
      type: 'dataset',
    },
  ],
  outputs: [
    {
      id: 'data',
      label: 'data',
      type: 'dataset',
    },
  ],
  paramFields: [
    {
      key: 'seed',
      label: 'Seed',
      type: 'number',
      min: 0,
      max: 999999,
      help: 'Random number seed ensuring the exact shuffle order can be reproduced.',
    },
  ],
};

