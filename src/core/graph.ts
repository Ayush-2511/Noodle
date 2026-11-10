/**
 * Noodle - Canonical Graph Data Model
 * 
 * GOLDEN RULE (mvp-guide.md § 2 & § 5):
 * The Graph JSON is the ONLY interface between editor and engine. No hidden state.
 * Core types are completely decoupled from UI (React Flow) and ML runtimes (TF.js, PyTorch).
 */

export type NodeParamValue = string | number | boolean | number[] | null | undefined;

export type NodeParams = Record<string, NodeParamValue>;

export type SocketDataType = 'tensor' | 'scalar' | 'optimizer' | 'dataset' | 'model' | 'metrics';

export interface SocketDefinition {
  id: string;      // e.g. "in", "out", "images", "labels", "logits", "target", "data", "model", "metrics"
  name: string;    // Human-readable label
  type: SocketDataType;
}

/**
 * A single layer inside a builder node (FeatureExtractor or Classifier)
 */
export interface LayerEntry {
  id: string;                      // e.g. "l1", "l2"
  type: string;                    // "Conv2D", "Linear", "ReLU", "MaxPool2D", "Dropout", "BatchNorm", "Sigmoid"
  params: Record<string, any>;     // Layer-specific parameters
}

export interface GraphNode {
  id: string;                      // Immutable ID (e.g. "n1", "n2") - Trap 11
  type: string;                    // e.g. "LoadDataset", "FeatureExtractor", "Classifier", etc.
  params: NodeParams;              // Type-specific configuration parameters
  position?: { x: number; y: number }; // Optional canvas position for editor persistence
  layers?: LayerEntry[];           // Optional internal layer stack for builder nodes
}

export interface GraphEdge {
  from: string; // format: "nodeId.socketId", e.g. "n1.out"
  to: string;   // format: "nodeId.socketId", e.g. "n2.in"
}

export interface Graph {
  version: 1 | 2;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Socket reference helper functions
 */
export interface SocketRef {
  nodeId: string;
  socketId: string;
}

/**
 * Parses a reference string in the form "nodeId.socketId"
 */
export function parseSocketRef(ref: string): SocketRef {
  const dotIndex = ref.indexOf('.');
  if (dotIndex === -1) {
    throw new Error(`Invalid socket reference "${ref}". Expected format: "nodeId.socketId"`);
  }
  return {
    nodeId: ref.slice(0, dotIndex),
    socketId: ref.slice(dotIndex + 1),
  };
}

/**
 * Creates a socket reference string in the format "nodeId.socketId"
 */
export function makeSocketRef(nodeId: string, socketId: string): string {
  return `${nodeId}.${socketId}`;
}

/**
 * Validates canonical Graph JSON structure
 */
export function isGraphValidJson(data: unknown): data is Graph {
  if (typeof data !== 'object' || data === null) return false;
  const candidate = data as Partial<Graph>;
  if (candidate.version !== 1 && candidate.version !== 2) return false;
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) return false;

  for (const node of candidate.nodes) {
    if (!node || typeof node.id !== 'string' || typeof node.type !== 'string' || typeof node.params !== 'object') {
      return false;
    }
  }

  for (const edge of candidate.edges) {
    if (!edge || typeof edge.from !== 'string' || typeof edge.to !== 'string') {
      return false;
    }
  }

  return true;
}
