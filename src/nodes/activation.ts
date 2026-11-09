import { NodeDefinition } from './types';

/**
 * Activation Node
 * 
 * Applies an element-wise non-linear activation function.
 * Supported functions (Section 4): ReLU, Sigmoid, Tanh, GELU, Softmax.
 * Output tensor shape matches input tensor shape.
 */
export const activationNodeDef: NodeDefinition = {
  type: 'Activation',
  label: 'Activation',
  group: 'Activation',
  defaultParams: {
    fn: 'relu',
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
      key: 'fn',
      label: 'Function',
      type: 'select',
      options: [
        { label: 'ReLU', value: 'relu' },
        { label: 'Sigmoid', value: 'sigmoid' },
        { label: 'Tanh', value: 'tanh' },
        { label: 'GELU', value: 'gelu' },
        { label: 'Softmax', value: 'softmax' },
      ],
      help: 'Element-wise activation',
    },
  ],
};

