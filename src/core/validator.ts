/**
 * Noodle - Graph Validator
 * 
 * GOLDEN RULE (mvp-guide.md § 2, § 8, § 10):
 * - Pure TypeScript function with zero UI or TF.js imports.
 * - validate(graph) returns problems; it NEVER throws.
 * - Errors (🔴) block training; Warnings (🟡) do not.
 * - Trap 8: If one node fails, downstream nodes receive 'unknown' instead of cascading errors.
 */

import { Graph, parseSocketRef } from './graph';
import { topologicalSort } from './topoSort';
import {
  TensorShape,
  formatShape,
  inferNodeOutputShape,
} from './shapeEngine';

export type ProblemSeverity = 'error' | 'warning' | 'ok';

export interface Problem {
  nodeId?: string;
  edgeKey?: string; // "from->to"
  severity: ProblemSeverity; // 'error' = 🔴, 'warning' = 🟡, 'ok' = 🟢
  message: string;
  fixHint?: string;
}

export type WireStatus = 'valid' | 'error' | 'unknown';

export interface WireValidation {
  edgeKey: string; // e.g. "n1.out->n2.in"
  from: string;
  to: string;
  status: WireStatus; // 🟢 valid, 🔴 error, ⚪ unknown
  shape: string; // e.g. "[B, 128]" or "unknown"
  dataType?: 'dataset' | 'model' | 'metrics' | 'tensor' | 'scalar' | 'optimizer';
  message?: string;
  fixHint?: string;
}

export function inferSocketDataType(socketId: string): 'dataset' | 'model' | 'metrics' | 'tensor' {
  const s = socketId.toLowerCase();
  if (s === 'data' || s === 'train' || s === 'test' || s === 'train_data' || s === 'test_data') return 'dataset';
  if (s === 'model' || s === 'trained_model') return 'model';
  if (s === 'metrics' || s === 'history') return 'metrics';
  return 'tensor';
}

export interface NodeValidationStatus {
  nodeId: string;
  type: string;
  status: 'ok' | 'warning' | 'error';
  outputShapes: Record<string, TensorShape>;
  paramCount: number;
  problemMessage?: string;
  fixHint?: string;
}

export interface ValidationResult {
  isValid: boolean; // True if zero 🔴 errors
  problems: Problem[];
  nodeStatuses: Map<string, NodeValidationStatus>;
  wireStatuses: Map<string, WireValidation>;
  executionOrder: string[];
  totalParameters: number;
}

export function validate(graph: Graph): ValidationResult {
  const problems: Problem[] = [];
  const nodeStatuses = new Map<string, NodeValidationStatus>();
  const wireStatuses = new Map<string, WireValidation>();
  let totalParameters = 0;

  // 1. Check for cycles via topological sort
  const topoResult = topologicalSort(graph);

  if (topoResult.hasCycle) {
    const cycleStr = topoResult.cyclePath.join(' → ');
    problems.push({
      severity: 'error',
      message: `Loop detected: ${cycleStr}. This MVP supports only forward graphs.`,
      fixHint: 'Remove the wire creating the loop.',
    });

    // Mark all nodes in cycle as error
    for (const node of graph.nodes) {
      nodeStatuses.set(node.id, {
        nodeId: node.id,
        type: node.type,
        status: topoResult.cyclePath.includes(node.id) ? 'error' : 'warning',
        outputShapes: {},
        paramCount: 0,
        problemMessage: 'Graph contains a cycle',
      });
    }

    return {
      isValid: false,
      problems,
      nodeStatuses,
      wireStatuses,
      executionOrder: [],
      totalParameters: 0,
    };
  }

  const executionOrder = topoResult.sortedNodeIds;

  // Map to store verified output shapes: nodeId -> socketId -> TensorShape
  const computedOutputs = new Map<string, Record<string, TensorShape>>();

  // Map of incoming edges by target socket: "nodeId.socketId" -> { from, to }
  const incomingEdges = new Map<string, { from: string; to: string }>();
  for (const edge of graph.edges) {
    incomingEdges.set(edge.to, edge);
  }

  // Map of outgoing edges count
  const outgoingCount = new Map<string, number>();
  const incomingCount = new Map<string, number>();
  for (const n of graph.nodes) {
    outgoingCount.set(n.id, 0);
    incomingCount.set(n.id, 0);
  }
  for (const edge of graph.edges) {
    try {
      const fromRef = parseSocketRef(edge.from);
      const toRef = parseSocketRef(edge.to);
      outgoingCount.set(fromRef.nodeId, (outgoingCount.get(fromRef.nodeId) || 0) + 1);
      incomingCount.set(toRef.nodeId, (incomingCount.get(toRef.nodeId) || 0) + 1);
    } catch {
      // Ignore
    }
  }

  // 2. Process nodes in topological execution order
  for (const nodeId of executionOrder) {
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    // Collect incoming tensor shapes for this node
    const inputShapes: Record<string, TensorShape> = {};
    const edgeSourceShapes = new Map<string, TensorShape>(); // socketId -> shape

    // Inspect sockets based on node type
    const possibleInputs = getExpectedInputSockets(node.type);

    for (const socketId of possibleInputs) {
      const socketRef = `${node.id}.${socketId}`;
      const incomingEdge = incomingEdges.get(socketRef);

      if (incomingEdge) {
        try {
          const fromRef = parseSocketRef(incomingEdge.from);
          const upstreamOutputs = computedOutputs.get(fromRef.nodeId);
          const upstreamShape = upstreamOutputs ? upstreamOutputs[fromRef.socketId] : 'unknown';

          inputShapes[socketId] = upstreamShape || 'unknown';
          edgeSourceShapes.set(socketId, upstreamShape || 'unknown');
        } catch {
          inputShapes[socketId] = 'unknown';
        }
      }
    }

    // Infer output shapes
    const shapeResult = inferNodeOutputShape(node.type, node.params, inputShapes, node.layers);

    if (shapeResult.success) {
      computedOutputs.set(node.id, shapeResult.outputShapes);
      totalParameters += shapeResult.paramCount;

      nodeStatuses.set(node.id, {
        nodeId: node.id,
        type: node.type,
        status: 'ok',
        outputShapes: shapeResult.outputShapes,
        paramCount: shapeResult.paramCount,
      });

      // Mark incoming edges as valid
      for (const socketId of possibleInputs) {
        const socketRef = `${node.id}.${socketId}`;
        const incomingEdge = incomingEdges.get(socketRef);
        if (incomingEdge) {
          const shape = edgeSourceShapes.get(socketId) || 'unknown';
          const wireKey = `${incomingEdge.from}->${incomingEdge.to}`;
          const fromRef = parseSocketRef(incomingEdge.from);
          wireStatuses.set(wireKey, {
            edgeKey: wireKey,
            from: incomingEdge.from,
            to: incomingEdge.to,
            status: shape === 'unknown' ? 'unknown' : 'valid',
            shape: formatShape(shape),
            dataType: inferSocketDataType(fromRef.socketId),
          });
        }
      }
    } else {
      // Node failed shape inference
      computedOutputs.set(node.id, shapeResult.outputShapes);

      problems.push({
        nodeId: node.id,
        severity: 'error',
        message: shapeResult.error,
        fixHint: shapeResult.fixHint,
      });

      nodeStatuses.set(node.id, {
        nodeId: node.id,
        type: node.type,
        status: 'error',
        outputShapes: shapeResult.outputShapes,
        paramCount: 0,
        problemMessage: shapeResult.error,
        fixHint: shapeResult.fixHint,
      });

      // Mark incoming edge that caused failure as error
      for (const socketId of possibleInputs) {
        const socketRef = `${node.id}.${socketId}`;
        const incomingEdge = incomingEdges.get(socketRef);
        if (incomingEdge) {
          const shape = edgeSourceShapes.get(socketId) || 'unknown';
          const wireKey = `${incomingEdge.from}->${incomingEdge.to}`;
          const fromRef = parseSocketRef(incomingEdge.from);
          wireStatuses.set(wireKey, {
            edgeKey: wireKey,
            from: incomingEdge.from,
            to: incomingEdge.to,
            status: shape === 'unknown' ? 'unknown' : 'error',
            shape: formatShape(shape),
            dataType: inferSocketDataType(fromRef.socketId),
            message: shapeResult.error,
            fixHint: shapeResult.fixHint,
          });
        }
      }
    }
  }

  // 3. Domain-specific warnings (Section 8)

  // Check 3a: Softmax before CrossEntropy (🟡)
  for (const edge of graph.edges) {
    try {
      const fromRef = parseSocketRef(edge.from);
      const toRef = parseSocketRef(edge.to);
      const fromNode = graph.nodes.find((n) => n.id === fromRef.nodeId);
      const toNode = graph.nodes.find((n) => n.id === toRef.nodeId);

      if (
        fromNode &&
        toNode &&
        fromNode.type === 'Activation' &&
        String(fromNode.params.fn).toLowerCase() === 'softmax' &&
        toNode.type === 'Loss' &&
        String(toNode.params.fn || 'cross_entropy').toLowerCase().includes('cross_entropy')
      ) {
        problems.push({
          nodeId: fromNode.id,
          edgeKey: `${edge.from}->${edge.to}`,
          severity: 'warning',
          message: 'CrossEntropy already applies softmax. Remove the Softmax node.',
          fixHint: 'Remove the Softmax node or connect logits directly to Loss.',
        });

        // Set warning status on node
        const current = nodeStatuses.get(fromNode.id);
        if (current && current.status !== 'error') {
          current.status = 'warning';
          current.problemMessage = 'CrossEntropy already applies softmax';
        }
      }
    } catch {
      // Ignore
    }
  }

  // Check 3b: Disconnected nodes (🟡)
  for (const node of graph.nodes) {
    const inCount = incomingCount.get(node.id) || 0;
    const outCount = outgoingCount.get(node.id) || 0;

    // Standalone un-connected nodes that aren't source nodes
    if (inCount === 0 && outCount === 0 && graph.nodes.length > 1) {
      problems.push({
        nodeId: node.id,
        severity: 'warning',
        message: `${node.id} is not connected. It will be ignored.`,
        fixHint: 'Connect this node to the graph or delete it.',
      });

      const current = nodeStatuses.get(node.id);
      if (current && current.status === 'ok') {
        current.status = 'warning';
        current.problemMessage = `${node.id} is not connected`;
      }
    }
  }

  // Check 3c: Missing Loss node for training (🟡)
  const hasLossOrClassifier = graph.nodes.some((n) => n.type === 'Loss' || n.type === 'Classifier');
  if (graph.nodes.length > 0 && !hasLossOrClassifier) {
    problems.push({
      severity: 'warning',
      message: 'Add a Classifier or Loss node to train.',
      fixHint: 'Add a Classifier node or Loss node to configure training loss.',
    });
  }

  // Check 3d: Graph completely valid (🟢)
  const hasErrors = problems.some((p) => p.severity === 'error');
  if (!hasErrors && graph.nodes.length > 0) {
    problems.push({
      severity: 'ok',
      message: `Graph valid. ${totalParameters.toLocaleString()} parameters.`,
    });
  }

  return {
    isValid: !hasErrors,
    problems,
    nodeStatuses,
    wireStatuses,
    executionOrder,
    totalParameters,
  };
}

function getExpectedInputSockets(type: string): string[] {
  switch (type) {
    case 'Linear':
    case 'Activation':
    case 'Flatten':
    case 'Conv2D':
    case 'MaxPool2D':
    case 'Dropout':
    case 'BatchNorm':
    case 'FeatureExtractor':
    case 'Classifier':
      return ['in', 'data'];
    case 'Shuffle':
    case 'TrainTestSplit':
    case 'Normalize':
    case 'Reshape':
      return ['data', 'in'];
    case 'Add':
    case 'Concat':
      return ['in1', 'in2', 'a', 'b'];
    case 'Loss':
      return ['logits', 'target', 'in'];
    case 'Input':
    case 'Dataset':
    case 'LoadDataset':
    case 'Optimizer':
      return [];
    case 'Train':
      return ['model', 'train_data', 'loss', 'opt'];
    case 'Evaluate':
      return ['trained_model', 'test_data'];
    case 'Metrics':
      return ['history', 'metrics', 'in'];
    case 'Predict':
      return ['trained_model', 'in'];
    default:
      return ['in', 'data'];
  }
}

