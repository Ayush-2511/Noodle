import { NodeDefinition } from './types';

/**
 * Loss Node
 * 
 * Computes the training scalar objective.
 * Exactly one Loss node is permitted per model in MVP (Section 10, Trap 10).
 * Sockets:
 * - logits: model output predictions [B, K]
 * - target: ground truth labels [B]
 * Output: scalar loss value
 */
export const lossNodeDef: NodeDefinition = {
  type: 'Loss',
  label: 'Loss',
  group: 'Training',
  defaultParams: {
    fn: 'cross_entropy',
  },
  inputs: [
    {
      id: 'logits',
      label: 'logits',
      type: 'tensor',
    },
    {
      id: 'target',
      label: 'target',
      type: 'tensor',
    },
  ],
  outputs: [
    {
      id: 'out',
      label: 'out',
      type: 'scalar',
    },
  ],
  paramFields: [
    {
      key: 'fn',
      label: 'Loss Function',
      type: 'select',
      options: [
        { label: 'CrossEntropy (Logits)', value: 'cross_entropy' },
        { label: 'MSE (Mean Squared Error)', value: 'mse' },
      ],
      help: 'Objective for gradient descent',
    },
  ],
};

