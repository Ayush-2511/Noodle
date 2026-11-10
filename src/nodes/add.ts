import { NodeDefinition } from './types';

/**
 * Add Node
 * 
 * Performs element-wise addition of two incoming tensor branches.
 * Used for residual skip connections (Section 4 & Section 11, T3).
 * Sockets:
 * - a: first tensor branch
 * - b: second tensor branch
 * Output:
 * - out: element-wise sum tensor (shapes of a and b must match)
 */
export const addNodeDef: NodeDefinition = {
  type: 'Add',
  label: 'Add',
  group: 'Combine',
  summary: 'Element-wise tensor addition (ResNet skip connections)',
  description: 'Sums two incoming tensor branches point-by-point. Shapes must match exactly. The foundation of Residual networks (ResNets), allowing signals to bypass layers.',
  defaultParams: {},
  inputs: [
    {
      id: 'a',
      label: 'a',
      type: 'tensor',
    },
    {
      id: 'b',
      label: 'b',
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

