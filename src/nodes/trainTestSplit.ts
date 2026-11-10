import { NodeDefinition } from './types';

/**
 * TrainTestSplit Node (v2 Pipeline)
 * 
 * Partitions dataset into training portion (to update weights)
 * and testing portion (to measure unseen generalization).
 */
export const trainTestSplitNodeDef: NodeDefinition = {
  type: 'TrainTestSplit',
  label: 'Train / Test Split',
  group: 'Pipeline',
  summary: 'Partitions data into train (e.g. 80%) and test (20%) sets',
  description: 'Splits incoming data so the model is trained on one subset and objectively tested on fresh, held-out data.',
  defaultParams: {
    train_pct: 80,
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
      id: 'train',
      label: 'train',
      type: 'dataset',
    },
    {
      id: 'test',
      label: 'test',
      type: 'dataset',
    },
  ],
  paramFields: [
    {
      key: 'train_pct',
      label: 'Train %',
      type: 'number',
      min: 10,
      max: 95,
      step: 5,
      help: 'Percentage of dataset allocated for model training (remaining % is test set).',
    },
  ],
};

