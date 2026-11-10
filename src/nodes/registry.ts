import { NodeDefinition } from './types';
import { inputNodeDef } from './input';
import { datasetNodeDef } from './dataset';
import { linearNodeDef } from './linear';
import { conv2dNodeDef } from './conv2d';
import { maxpool2dNodeDef } from './maxpool2d';
import { flattenNodeDef } from './flatten';
import { dropoutNodeDef } from './dropout';
import { batchnormNodeDef } from './batchnorm';
import { activationNodeDef } from './activation';
import { addNodeDef } from './add';
import { concatNodeDef } from './concat';
import { lossNodeDef } from './loss';
import { optimizerNodeDef } from './optimizer';
import { trainNodeDef } from './train';
import { metricsNodeDef } from './metrics';

// v2 Pipeline Nodes
import { loadDatasetNodeDef } from './loadDataset';
import { shuffleNodeDef } from './shuffle';
import { trainTestSplitNodeDef } from './trainTestSplit';
import { normalizeNodeDef } from './normalize';
import { featureExtractorNodeDef } from './featureExtractor';
import { classifierNodeDef } from './classifier';
import { evaluateNodeDef } from './evaluate';
import { predictNodeDef } from './predict';

/**
 * Node Registry
 * 
 * Maps node type identifiers (e.g. "Train", "Metrics", "Classifier") to their NodeDefinition.
 */
export const nodeRegistry: Record<string, NodeDefinition> = {
  // Data (v1 & v2)
  LoadDataset: loadDatasetNodeDef,
  Dataset: datasetNodeDef,
  Input: inputNodeDef,

  // Pipeline (v2)
  Shuffle: shuffleNodeDef,
  TrainTestSplit: trainTestSplitNodeDef,
  Normalize: normalizeNodeDef,
  Flatten: flattenNodeDef,

  // Model Builders (v2)
  FeatureExtractor: featureExtractorNodeDef,
  Classifier: classifierNodeDef,

  // Layers (v1 & internal builder components)
  Conv2D: conv2dNodeDef,
  MaxPool2D: maxpool2dNodeDef,
  Linear: linearNodeDef,
  Dropout: dropoutNodeDef,
  BatchNorm: batchnormNodeDef,
  Activation: activationNodeDef,

  // Combine (Multi-branch / Merge)
  Add: addNodeDef,
  Concat: concatNodeDef,

  // Training & Evaluation (v1 & v2)
  Train: trainNodeDef,
  Evaluate: evaluateNodeDef,
  Predict: predictNodeDef,
  Metrics: metricsNodeDef,
  Loss: lossNodeDef,
  Optimizer: optimizerNodeDef,
};

export function getNodeDefinition(type: string): NodeDefinition {
  const def = nodeRegistry[type];
  if (!def) {
    // Return a generic fallback definition if an unknown type is encountered
    return {
      type,
      label: type,
      group: 'Utility',
      defaultParams: {},
      inputs: [{ id: 'in', label: 'in', type: 'tensor' }],
      outputs: [{ id: 'out', label: 'out', type: 'tensor' }],
      paramFields: [],
    };
  }
  return def;
}

export function getAllNodeDefinitions(): NodeDefinition[] {
  return Object.values(nodeRegistry);
}
