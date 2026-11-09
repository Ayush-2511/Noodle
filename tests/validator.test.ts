import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { validate } from '../src/core/validator';
import { Graph } from '../src/core/graph';

function loadFixture(filename: string): Graph {
  const filePath = path.resolve(__dirname, 'graphs', filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

describe('Graph Validator & Golden Fixtures (M2)', () => {
  it('E1: Linear connected straight to 4-D Dataset images must give dimension error', () => {
    const graph = loadFixture('E1.json');
    const result = validate(graph);

    expect(result.isValid).toBe(false);
    const linearError = result.problems.find(
      (p) => p.nodeId === 'n2' && p.severity === 'error'
    );
    expect(linearError).toBeDefined();
    expect(linearError?.message).toContain('Linear needs a 2-D input, got [B,1,28,28]');
    expect(linearError?.fixHint).toContain('Flatten');
  });

  it('E2: Add with mismatched shapes must report shape mismatch', () => {
    const graph = loadFixture('E2.json');
    const result = validate(graph);

    expect(result.isValid).toBe(false);
    const addError = result.problems.find(
      (p) => p.nodeId === 'n3' && p.severity === 'error'
    );
    expect(addError).toBeDefined();
    expect(addError?.message).toContain('Add: got [B,16,7,7] and [B,8,7,7]. Shapes must match.');
  });

  it('E3: Cyclic graph must detect cycle and report loop path', () => {
    const graph = loadFixture('E3.json');
    const result = validate(graph);

    expect(result.isValid).toBe(false);
    const cycleError = result.problems.find((p) => p.severity === 'error');
    expect(cycleError).toBeDefined();
    expect(cycleError?.message).toContain('Loop detected');
  });

  it('E4: Softmax then CrossEntropy must produce a warning', () => {
    const graph = loadFixture('E4.json');
    const result = validate(graph);

    // Warnings do not invalidate the graph
    expect(result.isValid).toBe(true);
    const warning = result.problems.find((p) => p.severity === 'warning');
    expect(warning).toBeDefined();
    expect(warning?.message).toContain('CrossEntropy already applies softmax');
  });

  it('Valid graph (Input [B, 784] -> Linear(128) -> ReLU) should pass validation', () => {
    const validGraph: Graph = {
      version: 1,
      nodes: [
        { id: 'n1', type: 'Input', params: { shape: '[B, 784]' } },
        { id: 'n2', type: 'Linear', params: { out_features: 128 } },
        { id: 'n3', type: 'Activation', params: { fn: 'relu' } },
      ],
      edges: [
        { from: 'n1.out', to: 'n2.in' },
        { from: 'n2.out', to: 'n3.in' },
      ],
    };

    const result = validate(validGraph);
    expect(result.isValid).toBe(true);

    // Parameter count check for Linear: 784 * 128 + 128 = 100,480
    expect(result.totalParameters).toBe(100480);

    const n2Status = result.nodeStatuses.get('n2');
    expect(n2Status?.status).toBe('ok');
    expect(n2Status?.outputShapes['out']).toEqual(['B', 128]);

    const n3Status = result.nodeStatuses.get('n3');
    expect(n3Status?.status).toBe('ok');
    expect(n3Status?.outputShapes['out']).toEqual(['B', 128]);
  });

  it('Trap 8: Upstream errors must not cause cascading false alarms downstream', () => {
    const cascadingGraph: Graph = {
      version: 1,
      nodes: [
        { id: 'n1', type: 'Input', params: { shape: '[B, 1, 28, 28]' } },
        { id: 'n2', type: 'Linear', params: { out_features: 128 } }, // FAILS: needs 2-D
        { id: 'n3', type: 'Activation', params: { fn: 'relu' } },
        { id: 'n4', type: 'Linear', params: { out_features: 10 } },
      ],
      edges: [
        { from: 'n1.out', to: 'n2.in' },
        { from: 'n2.out', to: 'n3.in' },
        { from: 'n3.out', to: 'n4.in' },
      ],
    };

    const result = validate(cascadingGraph);
    expect(result.isValid).toBe(false);

    // Only n2 should report an error, not n3 or n4
    const errors = result.problems.filter((p) => p.severity === 'error');
    expect(errors.length).toBe(1);
    expect(errors[0].nodeId).toBe('n2');

    // Downstream wires should be marked 'unknown' (grey)
    const wire2to3 = result.wireStatuses.get('n2.out->n3.in');
    expect(wire2to3?.status).toBe('unknown');
  });
});

