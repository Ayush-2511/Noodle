import { describe, it, expect } from 'vitest';
import { getNodeDefinition, getAllNodeDefinitions, nodeRegistry } from '../src/nodes/registry';

describe('Node Registry & Definitions (Plan 01-02)', () => {
  it('should register Input, Linear, and Activation nodes in registry', () => {
    expect(nodeRegistry.Input).toBeDefined();
    expect(nodeRegistry.Linear).toBeDefined();
    expect(nodeRegistry.Activation).toBeDefined();

    const all = getAllNodeDefinitions();
    expect(all.length).toBe(3);
    const types = all.map((d) => d.type);
    expect(types).toContain('Input');
    expect(types).toContain('Linear');
    expect(types).toContain('Activation');
  });

  it('Input node definition should match Section 4 spec', () => {
    const def = getNodeDefinition('Input');
    expect(def.type).toBe('Input');
    expect(def.group).toBe('Data');
    expect(def.defaultParams).toHaveProperty('shape');
    expect(def.inputs).toHaveLength(0);
    expect(def.outputs).toHaveLength(1);
    expect(def.outputs[0].id).toBe('out');
  });

  it('Linear node definition should match Section 4 spec', () => {
    const def = getNodeDefinition('Linear');
    expect(def.type).toBe('Linear');
    expect(def.group).toBe('Layers');
    expect(def.defaultParams.out_features).toBe(128);
    expect(def.inputs).toHaveLength(1);
    expect(def.inputs[0].id).toBe('in');
    expect(def.outputs).toHaveLength(1);
    expect(def.outputs[0].id).toBe('out');
  });

  it('Activation node definition should match Section 4 spec', () => {
    const def = getNodeDefinition('Activation');
    expect(def.type).toBe('Activation');
    expect(def.group).toBe('Activation');
    expect(def.defaultParams.fn).toBe('relu');
    expect(def.inputs).toHaveLength(1);
    expect(def.inputs[0].id).toBe('in');
    expect(def.outputs).toHaveLength(1);
    expect(def.outputs[0].id).toBe('out');

    // Should include standard activation function options
    const fnField = def.paramFields.find((f) => f.key === 'fn');
    expect(fnField?.type).toBe('select');
    const options = fnField?.options?.map((o) => o.value);
    expect(options).toEqual(['relu', 'sigmoid', 'tanh', 'gelu', 'softmax']);
  });
});

