import { NodeDefinition } from './types';

/**
 * LoadDataset Node (v2 Pipeline)
 * 
 * Loads a built-in vision dataset (MNIST, CIFAR-10, Fashion-MNIST)
 * and outputs raw data records for the pipeline.
 */
export const loadDatasetNodeDef: NodeDefinition = {
  type: 'LoadDataset',
  label: 'Load Dataset',
  group: 'Data',
  summary: 'Loads a benchmark vision dataset (MNIST, CIFAR)',
  description: 'Loads standardized image datasets for training and testing. Provides images and ground-truth classification labels.',
  defaultParams: {
    dataset: 'mnist',
  },
  inputs: [],
  outputs: [
    {
      id: 'data',
      label: 'data',
      type: 'dataset',
    },
  ],
  paramFields: [
    {
      key: 'dataset',
      label: 'Dataset',
      type: 'select',
      options: [
        { label: 'MNIST (28×28 Grayscale digits 0-9)', value: 'mnist' },
        { label: 'Fashion-MNIST (28×28 Clothing items)', value: 'fashion_mnist' },
        { label: 'CIFAR-10 (32×32 Color objects)', value: 'cifar10' },
      ],
      help: 'Vision benchmark dataset loaded into memory for your experiment.',
    },
  ],
};

