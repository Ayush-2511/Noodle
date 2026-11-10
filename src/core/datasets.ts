/**
 * Noodle - Universal Dataset Registry & Metadata
 * 
 * Provides dataset metadata, modality definitions, and dynamic class labels
 * so nodes (like Predict and Evaluate) are 100% data-driven and never hardcoded.
 */

export interface DatasetMeta {
  id: string;
  name: string;
  modality: 'image' | 'tabular';
  inputShape: [number, number, number] | [number]; // [C, H, W] or [features]
  classes: string[];
  sampleCount: number;
  description: string;
}

export const DATASETS: Record<string, DatasetMeta> = {
  mnist: {
    id: 'mnist',
    name: 'MNIST Handwritten Digits',
    modality: 'image',
    inputShape: [1, 28, 28],
    classes: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    sampleCount: 60000,
    description: '28×28 grayscale images of handwritten digits 0 through 9.',
  },
  fashion_mnist: {
    id: 'fashion_mnist',
    name: 'Fashion-MNIST',
    modality: 'image',
    inputShape: [1, 28, 28],
    classes: [
      'T-shirt',
      'Trouser',
      'Pullover',
      'Dress',
      'Coat',
      'Sandal',
      'Shirt',
      'Sneaker',
      'Bag',
      'Ankle boot',
    ],
    sampleCount: 60000,
    description: '28×28 grayscale images of 10 clothing categories from Zalando.',
  },
  cifar10: {
    id: 'cifar10',
    name: 'CIFAR-10 Objects',
    modality: 'image',
    inputShape: [3, 32, 32],
    classes: [
      'airplane',
      'automobile',
      'bird',
      'cat',
      'deer',
      'dog',
      'frog',
      'horse',
      'ship',
      'truck',
    ],
    sampleCount: 60000,
    description: '32×32 color (RGB) images across 10 natural object categories.',
  },
};

export function getDatasetMeta(datasetId?: string): DatasetMeta {
  if (!datasetId) return DATASETS.mnist;
  const key = datasetId.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (key.includes('cifar')) return DATASETS.cifar10;
  if (key.includes('fashion')) return DATASETS.fashion_mnist;
  return DATASETS.mnist;
}

