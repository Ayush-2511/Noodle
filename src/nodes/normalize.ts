import { NodeDefinition } from './types';

/**
 * Normalize Node (v2 Pipeline)
 * 
 * Scales raw pixel values into standard ranges (e.g. 0 to 1 or Z-score normalized).
 */
export const normalizeNodeDef: NodeDefinition = {
  type: 'Normalize',
  label: 'Normalize',
  group: 'Pipeline',
  summary: 'Scales pixel values to 0..1 to stabilize training',
  description: 'Scales raw 0..255 pixel values into small floating-point ranges so network activations and gradients stay numerically stable.',
  defaultParams: {
    method: 'min_max',
  },
  inputs: [
    {
      id: 'data',
      label: 'data',
      type: 'dataset',
    },
  ],
  outputs: [
    {
      id: 'data',
      label: 'data',
      type: 'dataset',
    },
  ],
  paramFields: [
    {
      key: 'method',
      label: 'Method',
      type: 'select',
      options: [
        { label: 'Min-Max (0.0 to 1.0)', value: 'min_max' },
        { label: 'Standard Normal (Z-Score)', value: 'z_score' },
      ],
      help: 'Normalization algorithm used to rescale pixel values.',
    },
  ],
};

