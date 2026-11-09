import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphStore } from '../src/core/store';
import { Graph, isGraphValidJson } from '../src/core/graph';

describe('useGraphStore Unit Tests (Plan 01-01)', () => {
  beforeEach(() => {
    useGraphStore.getState().resetGraph();
  });

  it('should initialize with an empty canonical graph', () => {
    const { graph } = useGraphStore.getState();
    expect(graph.version).toBe(1);
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });

  it('should add nodes with unique, immutable IDs and custom params', () => {
    const store = useGraphStore.getState();

    const id1 = store.addNode('Input', { shape: '[B, 1, 28, 28]' });
    const id2 = store.addNode('Linear', { out_features: 128 });
    const id3 = store.addNode('Activation', { fn: 'relu' });

    expect(id1).toBe('n1');
    expect(id2).toBe('n2');
    expect(id3).toBe('n3');

    const updated = useGraphStore.getState().graph;
    expect(updated.nodes.length).toBe(3);
    expect(updated.nodes[1].params).toEqual({ out_features: 128 });
  });

  it('should update parameters of a specific node', () => {
    const store = useGraphStore.getState();
    const id = store.addNode('Linear', { out_features: 64 });

    store.updateNodeParams(id, { out_features: 256 });
    const node = useGraphStore.getState().graph.nodes.find((n) => n.id === id);
    expect(node?.params.out_features).toBe(256);
  });

  it('should connect wires between sockets and prevent invalid duplicates', () => {
    const store = useGraphStore.getState();
    const n1 = store.addNode('Input');
    const n2 = store.addNode('Linear');

    const connected = store.addEdge(`${n1}.out`, `${n2}.in`);
    expect(connected).toBe(true);

    // Duplicate should be rejected
    const dup = store.addEdge(`${n1}.out`, `${n2}.in`);
    expect(dup).toBe(false);

    // Connecting to already-occupied input socket should be rejected
    const n3 = store.addNode('Linear');
    const occupied = store.addEdge(`${n3}.out`, `${n2}.in`);
    expect(occupied).toBe(false);

    const edges = useGraphStore.getState().graph.edges;
    expect(edges.length).toBe(1);
    expect(edges[0]).toEqual({ from: `${n1}.out`, to: `${n2}.in` });
  });

  it('should remove a node and all incident edges', () => {
    const store = useGraphStore.getState();
    const n1 = store.addNode('Input');
    const n2 = store.addNode('Linear');
    const n3 = store.addNode('Activation');

    store.addEdge(`${n1}.out`, `${n2}.in`);
    store.addEdge(`${n2}.out`, `${n3}.in`);

    expect(useGraphStore.getState().graph.edges.length).toBe(2);

    // Remove n2 (middle node)
    store.removeNode(n2);

    const state = useGraphStore.getState();
    expect(state.graph.nodes.map((n) => n.id)).toEqual([n1, n3]);
    // Both edges attached to n2 must be gone
    expect(state.graph.edges.length).toBe(0);
  });

  it('should serialize to canonical Graph JSON matching Section 5 format', () => {
    const store = useGraphStore.getState();
    const n1 = store.addNode('Input', { shape: '[B, 784]' });
    const n2 = store.addNode('Linear', { out_features: 10 });
    store.addEdge(`${n1}.out`, `${n2}.in`);

    const jsonString = store.getCanonicalJson();
    const parsed = JSON.parse(jsonString);

    expect(isGraphValidJson(parsed)).toBe(true);
    expect(parsed.version).toBe(1);
    expect(parsed.nodes).toEqual([
      { id: n1, type: 'Input', params: { shape: '[B, 784]' } },
      { id: n2, type: 'Linear', params: { out_features: 10 } },
    ]);
    expect(parsed.edges).toEqual([
      { from: `${n1}.out`, to: `${n2}.in` },
    ]);
  });

  it('should load a full graph and avoid ID collisions on next addition', () => {
    const store = useGraphStore.getState();
    const externalGraph: Graph = {
      version: 1,
      nodes: [
        { id: 'n10', type: 'Input', params: {} },
        { id: 'n11', type: 'Linear', params: { out_features: 64 } },
      ],
      edges: [{ from: 'n10.out', to: 'n11.in' }],
    };

    store.loadGraph(externalGraph);
    expect(useGraphStore.getState().graph.nodes.length).toBe(2);

    // Next node added should be n12
    const nextId = store.addNode('Activation', { fn: 'relu' });
    expect(nextId).toBe('n12');
  });
});

