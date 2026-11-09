import { NodeDefinition } from './types';

/**
 * Input Node
 * 
 * Allows manual specification of input tensor shapes (e.g. "[B, 1, 28, 28]" or "[B, 784]").
 * Used for testing custom architectures or standalone layers without a fixed dataset.
 */
export const inputNodeDef: NodeDefinition = {
  type: 'Input',
  label: 'Input',
  group: 'Data',
  defaultParams: {
    shape: '[B, 1, 28, 28]',
  },
  inputs: [],
  outputs: [
    {
      id: 'out',
      label: 'out',
      type: 'tensor',
    },
  ],
  paramFields: [
    {
      key: 'shape',
      label: 'Shape',
      type: 'text',
      placeholder: '[B, 1, 28, 28]',
      help: 'Format: [B, C, H, W] or [B, F]',
    },
  ],
};

