import { NodeDefinition } from './types';

/**
 * Predict Node (v2 Pipeline)
 * 
 * Interactive hero node providing a 28×28 canvas to draw digits
 * and test the trained model live with real-time class probabilities.
 */
export const predictNodeDef: NodeDefinition = {
  type: 'Predict',
  label: 'Predict',
  group: 'Training',
  summary: 'Live interactive 28×28 handwriting digit drawing canvas',
  description: 'Draw a digit on the interactive canvas or pick random test images to watch your trained model predict the number with confidence bars.',
  defaultParams: {},
  inputs: [
    {
      id: 'trained_model',
      label: 'trained_model',
      type: 'model',
    },
  ],
  outputs: [],
  paramFields: [],
};

