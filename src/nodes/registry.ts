import { NodeDefinition } from './types';
import { inputNodeDef } from './input';
import { datasetNodeDef } from './dataset';
import { linearNodeDef } from './linear';
import { conv2dNodeDef } from './conv2d';
import { maxpool2dNodeDef } from './maxpool2d';
import { flattenNodeDef } from './flatten';
import { dropoutNodeDef } from './dropout';
import { batchnormNodeDef } from './batchnorm';
import { activationNodeDef } from './activation';
import { lossNodeDef } from './loss';

/**
 * Node Registry
 * 
 * Maps node type identifiers (e.g. "Conv2D") to their NodeDefinition.
 */
export const nodeRegistry: Record<string, NodeDefinition> = {
  // Data
  Input: inputNodeDef,
  Dataset: datasetNodeDef,

  // Layers
  Conv2D: conv2dNodeDef,
  MaxPool2D: maxpool2dNodeDef,
  Flatten: flattenNodeDef,
  Linear: linearNodeDef,
  Dropout: dropoutNodeDef,
  BatchNorm: batchnormNodeDef,

  // Activation
  Activation: activationNodeDef,

  // Training
  Loss: lossNodeDef,
};

export function getNodeDefinition(type: string): NodeDefinition {
  const def = nodeRegistry[type];
  if (!def) {
    // Return a generic fallback definition if an unknown type is encountered
    return {
      type,
      label: type,
      group: 'Utility',
      defaultParams: {},
      inputs: [{ id: 'in', label: 'in', type: 'tensor' }],
      outputs: [{ id: 'out', label: 'out', type: 'tensor' }],
      paramFields: [],
    };
  }
  return def;
}

export function getAllNodeDefinitions(): NodeDefinition[] {
  return Object.values(nodeRegistry);
}
