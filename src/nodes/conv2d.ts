import { NodeDefinition } from './types';

/**
 * Conv2D Node
 * 
 * 2-D Convolutional layer: applies sliding filters across spatial dimensions.
 * Input: [B, C, H, W]
 * Output: [B, out_channels, H', W'] where H' = floor((H + 2*padding - kernel) / stride) + 1
 */
export const conv2dNodeDef: NodeDefinition = {
  type: 'Conv2D',
  label: 'Conv2D',
  group: 'Layers',
  defaultParams: {
    out_channels: 16,
    kernel: 3,
    stride: 1,
    padding: 1,
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
      key: 'out_channels',
      label: 'Out Channels',
      type: 'number',
      min: 1,
      step: 1,
    },
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
    {
      key: 'padding',
      label: 'Padding',
      type: 'number',
      min: 0,
      step: 1,
    },
  ],
};

