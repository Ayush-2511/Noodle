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
  summary: 'Shrinks feature maps, keeping strongest signals',
  description: 'Halves or shrinks spatial dimensions by picking the maximum pixel in small windows (e.g. 2x2). Reduces computation and builds translation invariance.',
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
      help: 'Pooling window size (2 = 2x2 window)',
    },
    {
      key: 'stride',
      label: 'Stride',
      type: 'number',
      min: 1,
      step: 1,
      help: 'Window step (2 cuts height & width in half)',
    },
  ],
};

