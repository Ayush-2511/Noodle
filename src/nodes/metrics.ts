import { NodeDefinition } from './types';

/**
 * Metrics Node
 * 
 * Displays live loss and accuracy curves streamed in real time during training.
 * Socket:
 * - metrics: incoming telemetry stream from Train node
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
      type: 'scalar',
    },
  ],
  outputs: [],
  paramFields: [],
};

