import { NodeDefinition } from './types';

/**
 * FeatureExtractor Node (v2 Pipeline)
 * 
 * Builder node that stacks convolutional, pooling, and normalization layers
 * to learn spatial patterns directly from multi-channel images.
 */
export const featureExtractorNodeDef: NodeDefinition = {
  type: 'FeatureExtractor',
  label: 'Feature Extractor',
  group: 'Model',
  summary: 'Stacks Conv2D & MaxPool2D layers to extract spatial patterns',
  description: 'Learns hierarchical visual representations (edges, textures, shapes). Outputs multi-channel feature maps [C, H, W] without flattening.',
  defaultParams: {},
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
  paramFields: [],
};

