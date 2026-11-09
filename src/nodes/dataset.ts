import { NodeDefinition } from './types';

/**
 * Dataset Node
 * 
 * Provides training and validation image batches with integer class labels.
 * Supported datasets (Section 4 & Section 7):
 * - MNIST: images [B, 1, 28, 28], labels [B]
 * - Fashion-MNIST: images [B, 1, 28, 28], labels [B]
 * - CIFAR-10: images [B, 3, 32, 32], labels [B]
 */
export const datasetNodeDef: NodeDefinition = {
  type: 'Dataset',
  label: 'Dataset',
  group: 'Data',
  defaultParams: {
    name: 'mnist',
  },
  inputs: [],
  outputs: [
    {
      id: 'images',
      label: 'images',
      type: 'tensor',
    },
    {
      id: 'labels',
      label: 'labels',
      type: 'tensor',
    },
  ],
  paramFields: [
    {
      key: 'name',
      label: 'Dataset',
      type: 'select',
      options: [
        { label: 'MNIST (Digits)', value: 'mnist' },
        { label: 'Fashion-MNIST', value: 'fashion_mnist' },
        { label: 'CIFAR-10 (Color)', value: 'cifar10' },
      ],
      help: 'Standard vision datasets',
    },
  ],
};

