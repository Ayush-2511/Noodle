import { NodeDefinition } from './types';
import { inputNodeDef } from './input';
import { linearNodeDef } from './linear';
import { activationNodeDef } from './activation';

/**
 * Node Registry
 * 
 * Maps node type identifiers (e.g. "Linear") to their NodeDefinition.
 * M1 registers: Input, Linear, Activation.
 * Subsequent milestones (M3, M4, M5, M7, M8) register their respective nodes here.
 */
export const nodeRegistry: Record<string, NodeDefinition> = {
  Input: inputNodeDef,
  Linear: linearNodeDef,
  Activation: activationNodeDef,
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

