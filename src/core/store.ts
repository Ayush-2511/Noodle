import { create } from 'zustand';
import {
  Graph,
  GraphNode,
  GraphEdge,
  NodeParams,
  parseSocketRef,
} from './graph';

export interface GraphState {
  graph: Graph;
  selectedNodeId: string | null;

  // Actions
  addNode: (type: string, params?: NodeParams, position?: { x: number; y: number }) => string;
  removeNode: (nodeId: string) => void;
  updateNodeParams: (nodeId: string, params: Partial<NodeParams>) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  addEdge: (from: string, to: string) => boolean;
  removeEdge: (from: string, to: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  loadGraph: (newGraph: Graph) => void;
  resetGraph: () => void;
  getCanonicalJson: () => string;
}

/**
 * Monotonic ID counter ensuring unique, immutable IDs ("n1", "n2", ...)
 * Trap 11 (mvp-guide.md § 10): IDs are generated once and never change.
 */
let nextIdCounter = 1;

function generateUniqueNodeId(existingNodes: GraphNode[]): string {
  // Ensure counter is higher than any existing "n<number>" ID
  for (const node of existingNodes) {
    if (node.id.startsWith('n')) {
      const num = parseInt(node.id.slice(1), 10);
      if (!isNaN(num) && num >= nextIdCounter) {
        nextIdCounter = num + 1;
      }
    }
  }
  const id = `n${nextIdCounter}`;
  nextIdCounter += 1;
  return id;
}

export function resetNextIdCounter(start = 1): void {
  nextIdCounter = start;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  graph: {
    version: 1,
    nodes: [],
    edges: [],
  },
  selectedNodeId: null,

  addNode: (type: string, params: NodeParams = {}, position = { x: 100, y: 100 }) => {
    let newId = '';
    set((state) => {
      newId = generateUniqueNodeId(state.graph.nodes);
      const newNode: GraphNode = {
        id: newId,
        type,
        params: { ...params },
        position,
      };

      return {
        graph: {
          ...state.graph,
          nodes: [...state.graph.nodes, newNode],
        },
        selectedNodeId: newId,
      };
    });
    return newId;
  },

  removeNode: (nodeId: string) => {
    set((state) => {
      // Remove the node and all incident edges
      const filteredNodes = state.graph.nodes.filter((n) => n.id !== nodeId);
      const filteredEdges = state.graph.edges.filter((e) => {
        const fromRef = parseSocketRef(e.from);
        const toRef = parseSocketRef(e.to);
        return fromRef.nodeId !== nodeId && toRef.nodeId !== nodeId;
      });

      return {
        graph: {
          ...state.graph,
          nodes: filteredNodes,
          edges: filteredEdges,
        },
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      };
    });
  },

  updateNodeParams: (nodeId: string, params: Partial<NodeParams>) => {
    set((state) => ({
      graph: {
        ...state.graph,
        nodes: state.graph.nodes.map((node) =>
          node.id === nodeId
            ? { ...node, params: { ...node.params, ...params } }
            : node
        ),
      },
    }));
  },

  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => {
    set((state) => ({
      graph: {
        ...state.graph,
        nodes: state.graph.nodes.map((node) =>
          node.id === nodeId ? { ...node, position } : node
        ),
      },
    }));
  },

  addEdge: (from: string, to: string) => {
    // Validate edge format
    try {
      parseSocketRef(from);
      parseSocketRef(to);

      // Prevent connecting a node to itself on same socket or illegal loop
      if (from === to) return false;

      // Prevent multiple wires into the same input socket (an input socket accepts at most 1 input in DAG)
      const currentEdges = get().graph.edges;
      const alreadyHasInput = currentEdges.some((e) => e.to === to);
      if (alreadyHasInput) return false;

      // Prevent exact duplicate edge
      const duplicate = currentEdges.some((e) => e.from === from && e.to === to);
      if (duplicate) return false;

      const newEdge: GraphEdge = { from, to };
      set((state) => ({
        graph: {
          ...state.graph,
          edges: [...state.graph.edges, newEdge],
        },
      }));
      return true;
    } catch {
      return false;
    }
  },

  removeEdge: (from: string, to: string) => {
    set((state) => ({
      graph: {
        ...state.graph,
        edges: state.graph.edges.filter((e) => !(e.from === from && e.to === to)),
      },
    }));
  },

  setSelectedNodeId: (id: string | null) => {
    set({ selectedNodeId: id });
  },

  loadGraph: (newGraph: Graph) => {
    // Synchronize ID counter to avoid collisions
    for (const node of newGraph.nodes) {
      if (node.id.startsWith('n')) {
        const num = parseInt(node.id.slice(1), 10);
        if (!isNaN(num) && num >= nextIdCounter) {
          nextIdCounter = num + 1;
        }
      }
    }

    set({
      graph: {
        version: 1,
        nodes: [...newGraph.nodes],
        edges: [...newGraph.edges],
      },
      selectedNodeId: null,
    });
  },

  resetGraph: () => {
    nextIdCounter = 1;
    set({
      graph: {
        version: 1,
        nodes: [],
        edges: [],
      },
      selectedNodeId: null,
    });
  },

  getCanonicalJson: () => {
    const { graph } = get();
    // Produce clean, spec-compliant JSON without UI coordinate noise
    const canonical = {
      version: 1,
      nodes: graph.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        params: n.params,
      })),
      edges: graph.edges.map((e) => ({
        from: e.from,
        to: e.to,
      })),
    };
    return JSON.stringify(canonical, null, 2);
  },
}));
