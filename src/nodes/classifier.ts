import { NodeDefinition } from './types';

/**
 * Classifier Node (v2 Pipeline)
 * 
 * Builder node that stacks dense linear layers, dropout, and non-linearities.
 * Takes 1D flat feature vectors, configures the loss function, and outputs the model.
 */
export const classifierNodeDef: NodeDefinition = {
  type: 'Classifier',
  label: 'Classifier',
  group: 'Model',
  summary: 'Stacks Linear dense layers, outputs compiled model & loss',
  description: 'Takes 1D feature vectors and computes final class probabilities. Includes training loss configuration and produces the complete neural network model.',
  defaultParams: {
    loss: 'cross_entropy',
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
      id: 'model',
      label: 'model',
      type: 'model',
    },
  ],
  paramFields: [
    {
      key: 'loss',
      label: 'Loss Function',
      type: 'select',
      options: [
        { label: 'Cross Entropy (Multi-class classification)', value: 'cross_entropy' },
        { label: 'Mean Squared Error (Regression)', value: 'mse' },
      ],
      help: 'Objective loss minimized during optimization to punish incorrect class predictions.',
    },
  ],
};

