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
  summary: 'Introduces non-linearity so networks can learn complex patterns',
  description: 'Without activations, stacking multiple linear layers is mathematically equivalent to just one linear layer. ReLU blocks negative values (max(0, x)) and is the gold-standard default.',
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
        { label: 'ReLU (Standard default)', value: 'relu' },
        { label: 'Sigmoid (Smooth 0 to 1)', value: 'sigmoid' },
        { label: 'Tanh (-1 to +1)', value: 'tanh' },
        { label: 'GELU (Smooth Gaussian)', value: 'gelu' },
        { label: 'Softmax (Probabilities)', value: 'softmax' },
      ],
      help: 'Choose ReLU for hidden layers. Warning: avoid Softmax directly before CrossEntropy.',
    },
  ],
};

