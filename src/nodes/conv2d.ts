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
  summary: 'Scans images with filters to detect edges and shapes',
  description: 'Slides a small window (kernel) across the image to detect local visual patterns like edges, corners, and textures. Each out-channel learns a distinct feature filter.',
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
      help: 'Number of pattern filters to learn (e.g. 8 or 16)',
    },
    {
      key: 'kernel',
      label: 'Kernel Size',
      type: 'number',
      min: 1,
      step: 1,
      help: 'Filter window width & height (3 = 3x3 pixels)',
    },
    {
      key: 'stride',
      label: 'Stride',
      type: 'number',
      min: 1,
      step: 1,
      help: 'Step size when sliding filter (1 = smooth, 2 = downsample)',
    },
    {
      key: 'padding',
      label: 'Padding',
      type: 'number',
      min: 0,
      step: 1,
      help: 'Zero-padding border width (1 preserves spatial size for 3x3 kernel)',
    },
  ],
};

