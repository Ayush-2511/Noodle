import { describe, it, expect } from 'vitest';
import { getNodeDefinition, getAllNodeDefinitions } from '../src/nodes/registry';

describe('Node Registry & Definitions (M1 - M7)', () => {
  it('should register core MVP nodes in registry', () => {
    const all = getAllNodeDefinitions();
    expect(all.length).toBeGreaterThanOrEqual(15);
    const types = all.map((d) => d.type);

    expect(types).toContain('Input');
    expect(types).toContain('Dataset');
    expect(types).toContain('Linear');
    expect(types).toContain('Conv2D');
    expect(types).toContain('MaxPool2D');
    expect(types).toContain('Flatten');
    expect(types).toContain('Dropout');
    expect(types).toContain('BatchNorm');
    expect(types).toContain('Activation');
    expect(types).toContain('Add');
    expect(types).toContain('Concat');
    expect(types).toContain('Loss');
    expect(types).toContain('Optimizer');
    expect(types).toContain('Train');
    expect(types).toContain('Metrics');
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

  it('Conv2D and MaxPool2D node definitions should match Section 4 spec', () => {
    const convDef = getNodeDefinition('Conv2D');
    expect(convDef.type).toBe('Conv2D');
    expect(convDef.group).toBe('Layers');
    expect(convDef.defaultParams.out_channels).toBe(16);
    expect(convDef.defaultParams.kernel).toBe(3);
    expect(convDef.defaultParams.stride).toBe(1);
    expect(convDef.defaultParams.padding).toBe(1);

    const poolDef = getNodeDefinition('MaxPool2D');
    expect(poolDef.type).toBe('MaxPool2D');
    expect(poolDef.group).toBe('Layers');
    expect(poolDef.defaultParams.kernel).toBe(2);
    expect(poolDef.defaultParams.stride).toBe(2);
  });

  it('Flatten, Dropout, BatchNorm node definitions should match Section 4 spec', () => {
    const flattenDef = getNodeDefinition('Flatten');
    expect(flattenDef.type).toBe('Flatten');
    expect(flattenDef.group).toBe('Layers');

    const dropoutDef = getNodeDefinition('Dropout');
    expect(dropoutDef.type).toBe('Dropout');
    expect(dropoutDef.defaultParams.p).toBe(0.5);

    const bnDef = getNodeDefinition('BatchNorm');
    expect(bnDef.type).toBe('BatchNorm');
  });

  it('Dataset and Loss node definitions should match Section 4 spec', () => {
    const dataDef = getNodeDefinition('Dataset');
    expect(dataDef.type).toBe('Dataset');
    expect(dataDef.group).toBe('Data');
    expect(dataDef.outputs.map((s) => s.id)).toEqual(['images', 'labels']);

    const lossDef = getNodeDefinition('Loss');
    expect(lossDef.type).toBe('Loss');
    expect(lossDef.group).toBe('Training');
    expect(lossDef.inputs.map((s) => s.id)).toEqual(['logits', 'target']);
    expect(lossDef.outputs[0].type).toBe('scalar');
  });

  it('Add and Concat node definitions should match Section 4 spec', () => {
    const addDef = getNodeDefinition('Add');
    expect(addDef.type).toBe('Add');
    expect(addDef.group).toBe('Combine');
    expect(addDef.inputs.map((s) => s.id)).toEqual(['a', 'b']);
    expect(addDef.outputs.map((s) => s.id)).toEqual(['out']);

    const concatDef = getNodeDefinition('Concat');
    expect(concatDef.type).toBe('Concat');
    expect(concatDef.group).toBe('Combine');
    expect(concatDef.defaultParams.axis).toBe(1);
    expect(concatDef.inputs.map((s) => s.id)).toEqual(['a', 'b']);
    expect(concatDef.outputs.map((s) => s.id)).toEqual(['out']);
  });
});
