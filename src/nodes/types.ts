/**
 * Noodle - Node Type Definitions
 * 
 * Every node in the library has a pure metadata definition that specifies:
 * - Its visual label and group (Data, Layers, Activation, Combine, Training, Utility)
 * - Its input and output sockets
 * - Its default parameters and UI field configuration
 * 
 * Rule 8: Keep files small: one file per node type under /src/nodes/
 */

export type NodeGroup =
  | 'Data'
  | 'Layers'
  | 'Activation'
  | 'Combine'
  | 'Training'
  | 'Utility';

export type SocketDataType = 'tensor' | 'scalar' | 'optimizer' | 'dataset';

export interface NodeSocket {
  id: string; // socket identifier, e.g. "in", "out", "logits", "target"
  label: string; // human-readable label shown next to handle
  type: SocketDataType;
}

export type ParamFieldType = 'number' | 'select' | 'text';

export interface ParamFieldDescriptor {
  key: string;
  label: string;
  type: ParamFieldType;
  options?: Array<{ label: string; value: string }>;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  help?: string;
}

export interface NodeDefinition {
  type: string;
  label: string;
  group: NodeGroup;
  description?: string; // Clear 1-2 sentence human description of what this does
  summary?: string;     // Short one-line summary for palette and badges
  defaultParams: Record<string, any>;
  inputs: NodeSocket[];
  outputs: NodeSocket[];
  paramFields: ParamFieldDescriptor[];
}

