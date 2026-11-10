import { NodeDefinition } from './types';

/**
 * Metrics Node (v1 & v2 Compatible)
 * 
 * Displays live loss and accuracy curves streamed in real time during training.
 * Socket:
 * - metrics / history: incoming telemetry stream from Train node
 */
export const metricsNodeDef: NodeDefinition = {
  type: 'Metrics',
  label: 'Metrics',
  group: 'Training',
  summary: 'Live real-time loss and accuracy curves',
  description: 'Embeds an interactive telemetry chart directly on the canvas, plotting loss reduction (orange curve) and classification accuracy gains (green curve) as epochs progress.',
  defaultParams: {},
  inputs: [
    {
      id: 'metrics',
      label: 'metrics',
      type: 'metrics',
    },
  ],
  outputs: [],
  paramFields: [],
};
