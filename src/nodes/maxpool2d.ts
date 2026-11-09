import { NodeDefinition } from './types';

/**
 * MaxPool2D Node
 * 
 * 2-D Max Pooling: downsamples spatial dimensions by taking the maximum over windows.
 * Input: [B, C, H, W]
 * Output: [B, C, H', W'] where H' = floor((H - kernel) / stride) + 1
 */
export const maxpool2dNodeDef: NodeDefinition = {
  type: 'MaxPool2D',
  label: 'MaxPool2D',
  group: 'Layers',
  defaultParams: {
    kernel: 2,
    stride: 2,
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
      key: 'kernel',
      label: 'Kernel Size',
      type: 'number',
      min: 1,
      step: 1,
    },
    {
      key: 'stride',
      label: 'Stride',
      type: 'number',
      min: 1,
      step: 1,
    },
  ],
};

