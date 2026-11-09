import { NodeDefinition } from './types';

/**
 * Optimizer Node
 * 
 * Configures the gradient descent algorithm and learning rate.
 * Supported algorithms: Adam, SGD.
 * Sockets:
 * - opt: provides optimizer configuration to the Train node
 */
export const optimizerNodeDef: NodeDefinition = {
  type: 'Optimizer',
  label: 'Optimizer',
  group: 'Training',
  defaultParams: {
    algo: 'adam',
    lr: 0.001,
  },
  inputs: [],
  outputs: [
    {
      id: 'opt',
      label: 'optimizer',
      type: 'optimizer',
    },
  ],
  paramFields: [
    {
      key: 'algo',
      label: 'Algorithm',
      type: 'select',
      options: [
        { label: 'Adam', value: 'adam' },
        { label: 'SGD (Stochastic Gradient Descent)', value: 'sgd' },
      ],
      help: 'Optimization algorithm',
    },
    {
      key: 'lr',
      label: 'Learning Rate',
      type: 'number',
      min: 0.00001,
      max: 1.0,
      step: 0.0005,
      help: 'Step size per gradient update',
    },
  ],
};

