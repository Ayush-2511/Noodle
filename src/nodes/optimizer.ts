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
  summary: 'Weight update algorithm (Adam / SGD)',
  description: 'The algorithm that updates model weights using gradients. Adam automatically adapts per-parameter learning rates and is the most forgiving for beginners.',
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
        { label: 'Adam (Adaptive, recommended)', value: 'adam' },
        { label: 'SGD (Stochastic Gradient Descent)', value: 'sgd' },
      ],
      help: 'Adam adapts learning rate per-weight; SGD uses fixed step size.',
    },
    {
      key: 'lr',
      label: 'Learning Rate',
      type: 'number',
      min: 0.00001,
      max: 1.0,
      step: 0.0005,
      help: 'How big a step to take. Too high = diverges; too low = slow. 0.001-0.005 is ideal.',
    },
  ],
};

