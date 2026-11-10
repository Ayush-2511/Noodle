import { NodeDefinition } from './types';

/**
 * Concat Node
 * 
 * Concatenates two incoming tensor branches along a specified axis.
 * Used for channel-wise feature merging (Section 4 & Section 11, T4).
 * Sockets:
 * - a: first tensor branch
 * - b: second tensor branch
 * Output:
 * - out: concatenated tensor (non-concat dimensions must match)
 */
export const concatNodeDef: NodeDefinition = {
  type: 'Concat',
  label: 'Concat',
  group: 'Combine',
  defaultParams: {
    axis: 1,
  },
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
  paramFields: [
    {
      key: 'axis',
      label: 'Axis',
      type: 'number',
      min: 0,
      max: 3,
      step: 1,
      help: 'Dimension to concatenate along (1 = channels)',
    },
  ],
};

