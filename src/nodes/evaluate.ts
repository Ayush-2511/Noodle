import { NodeDefinition } from './types';

/**
 * Evaluate Node (v2 Pipeline)
 * 
 * Computes model performance against held-out test data.
 */
export const evaluateNodeDef: NodeDefinition = {
  type: 'Evaluate',
  label: 'Evaluate',
  group: 'Training',
  summary: 'Evaluates trained model on unseen test dataset',
  description: 'Runs inference across the held-out test dataset to compute generalization accuracy and test loss without updating weights.',
  defaultParams: {},
  inputs: [
    {
      id: 'trained_model',
      label: 'trained_model',
      type: 'model',
    },
    {
      id: 'test_data',
      label: 'test_data',
      type: 'dataset',
    },
  ],
  outputs: [
    {
      id: 'metrics',
      label: 'metrics',
      type: 'metrics',
    },
  ],
  paramFields: [],
};

