import { create } from 'zustand';
import {
  Graph,
  GraphNode,
  GraphEdge,
  NodeParams,
  LayerEntry,
  parseSocketRef,
} from './graph';
import { TabularDataset } from './authenticDatasets';

export type WorkspaceTab = 'canvas' | 'dataset';

export interface GraphState {
  graph: Graph;
  selectedNodeId: string | null;
  activeWorkspaceTab: WorkspaceTab;
  setActiveWorkspaceTab: (tab: WorkspaceTab) => void;
  customDataset: TabularDataset | null;
  setCustomDataset: (dataset: TabularDataset | null) => void;

  // Actions
  addNode: (type: string, params?: NodeParams, position?: { x: number; y: number }, layers?: LayerEntry[]) => string;
  removeNode: (nodeId: string) => void;
  updateNodeParams: (nodeId: string, params: Partial<NodeParams>) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  addEdge: (from: string, to: string) => boolean;
  removeEdge: (from: string, to: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  loadGraph: (newGraph: Graph) => void;
  resetGraph: () => void;
  getCanonicalJson: () => string;

  // Layer CRUD for builder nodes (v2)
  addLayer: (nodeId: string, layerType: string, params?: Record<string, any>) => void;
  removeLayer: (nodeId: string, layerId: string) => void;
  reorderLayer: (nodeId: string, layerId: string, newIndex: number) => void;
  updateLayerParams: (nodeId: string, layerId: string, params: Record<string, any>) => void;
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

function generateUniqueLayerId(existingLayers: LayerEntry[]): string {
  let maxNum = 0;
  for (const l of existingLayers) {
    if (l.id.startsWith('l')) {
      const num = parseInt(l.id.slice(1), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `l${maxNum + 1}`;
}

export function getDefaultParamsForLayer(layerType: string): Record<string, any> {
  switch (layerType) {
    case 'Conv2D':
      return { filters: 8, kernel: 3, stride: 1, padding: 1 };
    case 'MaxPool2D':
      return { kernel: 2, stride: 2 };
    case 'Linear':
      return { neurons: 128 };
    case 'Dropout':
      return { rate: 0.5 };
    case 'BatchNorm':
    case 'ReLU':
    case 'Sigmoid':
    case 'Flatten':
    default:
      return {};
  }
}

function getDefaultLayersForNode(type: string): LayerEntry[] | undefined {
  if (type === 'FeatureExtractor') {
    return [
      { id: 'l1', type: 'Conv2D', params: { filters: 8, kernel: 3, stride: 1, padding: 1 } },
      { id: 'l2', type: 'ReLU', params: {} },
      { id: 'l3', type: 'MaxPool2D', params: { kernel: 2, stride: 2 } },
    ];
  }
  if (type === 'Classifier') {
    return [
      { id: 'l1', type: 'Linear', params: { neurons: 128 } },
      { id: 'l2', type: 'ReLU', params: {} },
      { id: 'l3', type: 'Linear', params: { neurons: 10 } },
    ];
  }
  return undefined;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  graph: {
    version: 1,
    nodes: [],
    edges: [],
  },
  selectedNodeId: null,
  activeWorkspaceTab: 'canvas',
  customDataset: null,

  setActiveWorkspaceTab: (tab: WorkspaceTab) => {
    set({ activeWorkspaceTab: tab });
  },

  setCustomDataset: (dataset: TabularDataset | null) => {
    set({ customDataset: dataset });
  },

  addNode: (type: string, params: NodeParams = {}, position = { x: 100, y: 100 }, layers?: LayerEntry[]) => {
    let newId = '';
    set((state) => {
      newId = generateUniqueNodeId(state.graph.nodes);
      const initialLayers = layers ?? getDefaultLayersForNode(type);
      const newNode: GraphNode = {
        id: newId,
        type,
        params: { ...params },
        position,
        ...(initialLayers ? { layers: initialLayers } : {}),
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
        version: newGraph.version || 2,
        nodes: newGraph.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          params: { ...n.params },
          position: n.position ? { ...n.position } : undefined,
          ...(n.layers ? { layers: n.layers.map((l) => ({ ...l, params: { ...l.params } })) } : {}),
        })),
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
    // Detect whether graph uses v2 features (layers, builder nodes, pipeline nodes)
    const isV2 =
      graph.version === 2 ||
      graph.nodes.some(
        (n) =>
          (n.layers && n.layers.length > 0) ||
          n.type === 'FeatureExtractor' ||
          n.type === 'Classifier' ||
          n.type === 'LoadDataset' ||
          n.type === 'Shuffle' ||
          n.type === 'TrainTestSplit' ||
          n.type === 'Normalize'
      );

    // Produce clean, spec-compliant JSON without UI coordinate noise
    const canonical = {
      version: isV2 ? 2 : 1,
      nodes: graph.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        params: n.params,
        ...(n.layers && n.layers.length > 0 ? { layers: n.layers } : {}),
      })),
      edges: graph.edges.map((e) => ({
        from: e.from,
        to: e.to,
      })),
    };
    return JSON.stringify(canonical, null, 2);
  },

  addLayer: (nodeId: string, layerType: string, params?: Record<string, any>) => {
    set((state) => {
      const node = state.graph.nodes.find((n) => n.id === nodeId);
      if (!node) return state;

      const currentLayers = node.layers || [];
      const newLayerId = generateUniqueLayerId(currentLayers);
      const defaultParams = getDefaultParamsForLayer(layerType);
      const newLayer: LayerEntry = {
        id: newLayerId,
        type: layerType,
        params: params ? { ...params } : defaultParams,
      };

      return {
        graph: {
          ...state.graph,
          nodes: state.graph.nodes.map((n) =>
            n.id === nodeId ? { ...n, layers: [...currentLayers, newLayer] } : n
          ),
        },
      };
    });
  },

  removeLayer: (nodeId: string, layerId: string) => {
    set((state) => ({
      graph: {
        ...state.graph,
        nodes: state.graph.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, layers: (n.layers || []).filter((l) => l.id !== layerId) }
            : n
        ),
      },
    }));
  },

  reorderLayer: (nodeId: string, layerId: string, newIndex: number) => {
    set((state) => {
      const node = state.graph.nodes.find((n) => n.id === nodeId);
      if (!node || !node.layers) return state;

      const layers = [...node.layers];
      const oldIndex = layers.findIndex((l) => l.id === layerId);
      if (oldIndex === -1 || newIndex < 0 || newIndex >= layers.length) return state;

      const [moved] = layers.splice(oldIndex, 1);
      layers.splice(newIndex, 0, moved);

      return {
        graph: {
          ...state.graph,
          nodes: state.graph.nodes.map((n) =>
            n.id === nodeId ? { ...n, layers } : n
          ),
        },
      };
    });
  },

  updateLayerParams: (nodeId: string, layerId: string, params: Record<string, any>) => {
    set((state) => ({
      graph: {
        ...state.graph,
        nodes: state.graph.nodes.map((n) => {
          if (n.id !== nodeId || !n.layers) return n;
          return {
            ...n,
            layers: n.layers.map((l) =>
              l.id === layerId ? { ...l, params: { ...l.params, ...params } } : l
            ),
          };
        }),
      },
    }));
  },
}));
