import { NodeDefinition } from './types';

/**
 * Train Node
 * 
 * Orchestrates the model training execution loop.
 * Sockets:
 * - loss: input scalar connection from Loss node
 * - opt: input connection from Optimizer node
 * - metrics: output stream to Metrics node
 */
export const trainNodeDef: NodeDefinition = {
  type: 'Train',
  label: 'Train',
  group: 'Training',
  defaultParams: {
    epochs: 3,
    batch_size: 32,
  },
  inputs: [
    {
      id: 'loss',
      label: 'loss',
      type: 'scalar',
    },
    {
      id: 'opt',
      label: 'optimizer',
      type: 'optimizer',
    },
  ],
  outputs: [
    {
      id: 'metrics',
      label: 'metrics',
      type: 'scalar',
    },
  ],
  paramFields: [
    {
      key: 'epochs',
      label: 'Epochs',
      type: 'number',
      min: 1,
      max: 50,
      step: 1,
      help: 'Number of full training cycles',
    },
    {
      key: 'batch_size',
      label: 'Batch Size',
      type: 'number',
      min: 8,
      max: 256,
      step: 8,
      help: 'Samples per gradient update',
    },
  ],
};

