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

