import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { validate } from '../src/core/validator';
import { Graph } from '../src/core/graph';

describe('T2 Golden CNN Worked Example (mvp-guide.md § 7 & § 14 M3)', () => {
  it('T2 CNN graph must pass validation and match Section 7 shape table line-for-line', () => {
    const fixturePath = path.resolve(__dirname, 'graphs', 'T2.json');
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    const graph: Graph = JSON.parse(raw);

    const result = validate(graph);

    // Must be completely valid (no errors)
    expect(result.isValid).toBe(true);

    const getShape = (nodeId: string, socket = 'out') => {
      const nodeStatus = result.nodeStatuses.get(nodeId);
      expect(nodeStatus).toBeDefined();
      expect(nodeStatus?.status).toBe('ok');
      return nodeStatus?.outputShapes[socket];
    };

    // 1. Dataset: images [B, 1, 28, 28], labels [B]
    expect(getShape('n1', 'images')).toEqual(['B', 1, 28, 28]);
    expect(getShape('n1', 'labels')).toEqual(['B']);

    // 2. Conv2D(8, k=3, p=1): [B, 8, 28, 28]
    expect(getShape('n2')).toEqual(['B', 8, 28, 28]);
    // Param count: (3 * 3 * 1 * 8) + 8 = 80
    expect(result.nodeStatuses.get('n2')?.paramCount).toBe(80);

    // 3. ReLU: [B, 8, 28, 28]
    expect(getShape('n3')).toEqual(['B', 8, 28, 28]);

    // 4. MaxPool(k=2, s=2): [B, 8, 14, 14]
    expect(getShape('n4')).toEqual(['B', 8, 14, 14]);

    // 5. Conv2D(16, k=3, p=1): [B, 16, 14, 14]
    expect(getShape('n5')).toEqual(['B', 16, 14, 14]);
    // Param count: (3 * 3 * 8 * 16) + 16 = 1168 (Matches Section 9.3)
    expect(result.nodeStatuses.get('n5')?.paramCount).toBe(1168);

    // 6. ReLU: [B, 16, 14, 14]
    expect(getShape('n6')).toEqual(['B', 16, 14, 14]);

    // 7. MaxPool(k=2, s=2): [B, 16, 7, 7]
    expect(getShape('n7')).toEqual(['B', 16, 7, 7]);

    // 8. Flatten: [B, 784] (16 * 7 * 7 = 784)
    expect(getShape('n8')).toEqual(['B', 784]);

    // 9. Linear(10): [B, 10]
    expect(getShape('n9')).toEqual(['B', 10]);
    // Param count: (784 * 10) + 10 = 7850
    expect(result.nodeStatuses.get('n9')?.paramCount).toBe(7850);

    // 10. Loss: scalar
    expect(getShape('n10')).toBe('scalar');

    // Total parameter count: 80 + 1168 + 7850 = 9098
    expect(result.totalParameters).toBe(9098);
  });
});

