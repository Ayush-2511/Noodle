/**
 * Noodle - Shape Inference Engine
 * 
 * GOLDEN RULE (mvp-guide.md § 2, § 6, § 7):
 * - Pure TypeScript functions with no UI or TF.js imports.
 * - Shapes are shown in PyTorch style: [B, C, H, W], [B, F], [B], or scalar.
 * - B is symbolic ('B') and never a hardcoded number.
 * - If one node fails, downstream nodes receive 'unknown' instead of cascading dozens of errors.
 */

import { LayerEntry } from './graph';

export type Dimension = 'B' | number;
export type TensorShape = Dimension[] | 'scalar' | 'unknown';

export interface ShapeInferenceSuccess {
  success: true;
  outputShapes: Record<string, TensorShape>; // socketId -> TensorShape
  paramCount: number;
}

export interface ShapeInferenceError {
  success: false;
  error: string;
  fixHint?: string;
  outputShapes: Record<string, TensorShape>; // socketId -> 'unknown'
  paramCount: number;
}

export type NodeShapeResult = ShapeInferenceSuccess | ShapeInferenceError;

/**
 * Parses a shape string like "[B, 1, 28, 28]" into a TensorShape array
 */
export function parseShape(shapeStr: string): TensorShape {
  if (!shapeStr || typeof shapeStr !== 'string') return 'unknown';
  const clean = shapeStr.trim().replace(/^\[|\]$/g, '').trim();
  if (clean === '' || clean.toLowerCase() === 'scalar') return 'scalar';
  if (clean.toLowerCase() === 'unknown') return 'unknown';

  const parts = clean.split(',').map((p) => p.trim());
  const dims: Dimension[] = [];

  for (const p of parts) {
    if (p.toUpperCase() === 'B') {
      dims.push('B');
    } else {
      const num = parseInt(p, 10);
      if (isNaN(num)) return 'unknown';
      dims.push(num);
    }
  }

  return dims;
}

/**
 * Formats a TensorShape into a standard PyTorch string representation
 */
export function formatShape(shape: TensorShape): string {
  if (shape === 'scalar') return 'scalar';
  if (shape === 'unknown') return 'unknown';
  if (Array.isArray(shape)) {
    return `[${shape.join(',')}]`;
  }
  return 'unknown';
}

/**
 * Compares two tensor shapes for equality
 */
export function areShapesEqual(s1: TensorShape, s2: TensorShape): boolean {
  if (s1 === s2) return true;
  if (!Array.isArray(s1) || !Array.isArray(s2)) return false;
  if (s1.length !== s2.length) return false;
  for (let i = 0; i < s1.length; i++) {
    if (s1[i] !== s2[i]) return false;
  }
  return true;
}

/**
 * Returns rank (number of dimensions) of a tensor, or -1 for scalar/unknown
 */
export function getTensorRank(shape: TensorShape): number {
  if (Array.isArray(shape)) return shape.length;
  if (shape === 'scalar') return 0;
  return -1;
}

export interface LayerShapeResult {
  layerId: string;
  type: string;
  outputShape: TensorShape;
  paramCount: number;
  error?: string;
  fixHint?: string;
}

export interface BuilderShapeResult {
  layerShapes: LayerShapeResult[];
  totalParams: number;
  finalOutputShape: TensorShape;
  errors: Array<{ layerId: string; message: string; fixHint?: string }>;
}

/**
 * Sequential shape inference over internal builder layer stacks (FeatureExtractor, Classifier)
 */
export function inferBuilderShapes(
  layers: LayerEntry[],
  inputShape: TensorShape
): BuilderShapeResult {
  const layerShapes: LayerShapeResult[] = [];
  const errors: Array<{ layerId: string; message: string; fixHint?: string }> = [];
  let totalParams = 0;
  let currentShape: TensorShape = inputShape;

  for (const layer of layers) {
    if (currentShape === 'unknown') {
      layerShapes.push({
        layerId: layer.id,
        type: layer.type,
        outputShape: 'unknown',
        paramCount: 0,
      });
      continue;
    }

    switch (layer.type) {
      case 'Conv2D': {
        if (!Array.isArray(currentShape) || (currentShape.length !== 3 && currentShape.length !== 4)) {
          const err = `Conv2D requires 3-D [C, H, W] or 4-D [B, C, H, W] input, got ${formatShape(currentShape)}`;
          const hint = 'Feature Extractor layers require spatial image shapes';
          errors.push({ layerId: layer.id, message: err, fixHint: hint });
          layerShapes.push({ layerId: layer.id, type: layer.type, outputShape: 'unknown', paramCount: 0, error: err, fixHint: hint });
          currentShape = 'unknown';
          break;
        }

        const isRank4 = currentShape.length === 4;
        const inC = Number(isRank4 ? currentShape[1] : currentShape[0]);
        const inH = Number(isRank4 ? currentShape[2] : currentShape[1]);
        const inW = Number(isRank4 ? currentShape[3] : currentShape[2]);

        const filters = Number(layer.params.filters || layer.params.out_channels) || 8;
        const kernel = Number(layer.params.kernel || layer.params.kernel_size) || 3;
        const stride = Number(layer.params.stride) || 1;
        const padding = layer.params.padding !== undefined ? Number(layer.params.padding) : (layer.params.pad !== undefined ? Number(layer.params.pad) : 0);

        const outH = Math.floor((inH - kernel + 2 * padding) / stride) + 1;
        const outW = Math.floor((inW - kernel + 2 * padding) / stride) + 1;

        if (outH <= 0 || outW <= 0) {
          const err = `Conv2D output collapsed to ${outH}×${outW}.`;
          const hint = 'Decrease kernel size or increase padding';
          errors.push({ layerId: layer.id, message: err, fixHint: hint });
          layerShapes.push({ layerId: layer.id, type: layer.type, outputShape: 'unknown', paramCount: 0, error: err, fixHint: hint });
          currentShape = 'unknown';
          break;
        }

        const params = (kernel * kernel * inC + 1) * filters;
        totalParams += params;
        const outShape: TensorShape = isRank4 ? ['B', filters, outH, outW] : [filters, outH, outW];
        currentShape = outShape;
        layerShapes.push({ layerId: layer.id, type: layer.type, outputShape: outShape, paramCount: params });
        break;
      }

      case 'MaxPool2D': {
        if (!Array.isArray(currentShape) || (currentShape.length !== 3 && currentShape.length !== 4)) {
          const err = `MaxPool2D requires 3-D or 4-D spatial input, got ${formatShape(currentShape)}`;
          errors.push({ layerId: layer.id, message: err });
          layerShapes.push({ layerId: layer.id, type: layer.type, outputShape: 'unknown', paramCount: 0, error: err });
          currentShape = 'unknown';
          break;
        }

        const isRank4 = currentShape.length === 4;
        const inC = currentShape[isRank4 ? 1 : 0];
        const inH = Number(currentShape[isRank4 ? 2 : 1]);
        const inW = Number(currentShape[isRank4 ? 3 : 2]);

        const kernel = Number(layer.params.kernel || layer.params.kernel_size) || 2;
        const stride = Number(layer.params.stride) || kernel;

        const outH = Math.floor((inH - kernel) / stride) + 1;
        const outW = Math.floor((inW - kernel) / stride) + 1;

        if (outH <= 0 || outW <= 0) {
          const err = `MaxPool2D output collapsed to ${outH}×${outW}.`;
          const hint = 'Decrease pool kernel size';
          errors.push({ layerId: layer.id, message: err, fixHint: hint });
          layerShapes.push({ layerId: layer.id, type: layer.type, outputShape: 'unknown', paramCount: 0, error: err, fixHint: hint });
          currentShape = 'unknown';
          break;
        }

        const outShape: TensorShape = isRank4 ? ['B', inC, outH, outW] : [inC, outH, outW];
        currentShape = outShape;
        layerShapes.push({ layerId: layer.id, type: layer.type, outputShape: outShape, paramCount: 0 });
        break;
      }

      case 'Linear': {
        if (!Array.isArray(currentShape) || currentShape.length > 2) {
          const err = `Linear requires 1-D or 2-D flat input [B, F], got ${formatShape(currentShape)}`;
          const hint = 'Insert a Flatten node before Classifier or Linear layer';
          errors.push({ layerId: layer.id, message: err, fixHint: hint });
          layerShapes.push({ layerId: layer.id, type: layer.type, outputShape: 'unknown', paramCount: 0, error: err, fixHint: hint });
          currentShape = 'unknown';
          break;
        }

        const isRank2 = currentShape.length === 2;
        const inFeatures = Number(isRank2 ? currentShape[1] : currentShape[0]);
        const neurons = Number(layer.params.neurons || layer.params.out_features || layer.params.units) || 10;

        const params = (inFeatures + 1) * neurons;
        totalParams += params;
        const outShape: TensorShape = isRank2 ? ['B', neurons] : [neurons];
        currentShape = outShape;
        layerShapes.push({ layerId: layer.id, type: layer.type, outputShape: outShape, paramCount: params });
        break;
      }

      case 'Flatten': {
        if (!Array.isArray(currentShape)) {
          layerShapes.push({ layerId: layer.id, type: layer.type, outputShape: currentShape, paramCount: 0 });
          break;
        }
        if (currentShape.length <= 2) {
          // Already flat
          layerShapes.push({ layerId: layer.id, type: layer.type, outputShape: currentShape, paramCount: 0 });
          break;
        }
        const isRank4 = currentShape.length === 4;
        let product = 1;
        const startIdx = isRank4 ? 1 : 0;
        for (let i = startIdx; i < currentShape.length; i++) {
          product *= Number(currentShape[i]);
        }
        const outShape: TensorShape = isRank4 ? ['B', product] : [product];
        currentShape = outShape;
        layerShapes.push({ layerId: layer.id, type: layer.type, outputShape: outShape, paramCount: 0 });
        break;
      }

      case 'Dropout': {
        layerShapes.push({ layerId: layer.id, type: layer.type, outputShape: currentShape, paramCount: 0 });
        break;
      }

      case 'BatchNorm': {
        let params = 0;
        if (Array.isArray(currentShape)) {
          const featDim = currentShape.length >= 3 ? (currentShape.length === 4 ? currentShape[1] : currentShape[0]) : (currentShape.length === 2 ? currentShape[1] : currentShape[0]);
          params = 2 * Number(featDim || 0);
        }
        totalParams += params;
        layerShapes.push({ layerId: layer.id, type: layer.type, outputShape: currentShape, paramCount: params });
        break;
      }

      case 'ReLU':
      case 'Sigmoid':
      case 'Activation':
      default: {
        layerShapes.push({ layerId: layer.id, type: layer.type, outputShape: currentShape, paramCount: 0 });
        break;
      }
    }
  }

  return {
    layerShapes,
    totalParams,
    finalOutputShape: currentShape,
    errors,
  };
}

/**
 * Pure shape inference for a single node given its input socket shapes and parameters
 */
export function inferNodeOutputShape(
  type: string,
  params: Record<string, any>,
  inputShapes: Record<string, TensorShape>, // socketId -> TensorShape
  layers?: LayerEntry[]
): NodeShapeResult {
  switch (type) {
    case 'Input': {
      const shapeStr = typeof params.shape === 'string' ? params.shape : '[B, 1, 28, 28]';
      const shape = parseShape(shapeStr);
      if (shape === 'unknown') {
        return {
          success: false,
          error: `Invalid input shape format: "${shapeStr}"`,
          fixHint: 'Use format like [B, 1, 28, 28] or [B, 784]',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }
      return {
        success: true,
        outputShapes: { out: shape },
        paramCount: 0,
      };
    }

    case 'Dataset': {
      const name = String(params.name || 'mnist').toLowerCase();
      if (name.includes('cifar')) {
        return {
          success: true,
          outputShapes: {
            images: ['B', 3, 32, 32],
            labels: ['B'],
          },
          paramCount: 0,
        };
      }
      // Default: MNIST / Fashion-MNIST
      return {
        success: true,
        outputShapes: {
          images: ['B', 1, 28, 28],
          labels: ['B'],
        },
        paramCount: 0,
      };
    }

    case 'Linear': {
      const inShape = inputShapes['in'];
      if (inShape === undefined) {
        return {
          success: false,
          error: 'Linear has no input connected.',
          fixHint: 'Connect an output from an upstream layer (e.g. Flatten or Input)',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      if (inShape === 'unknown') {
        // Upstream error suppression (Trap 8)
        return {
          success: true,
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      if (!Array.isArray(inShape) || inShape.length !== 2) {
        return {
          success: false,
          error: `Linear needs a 2-D input, got ${formatShape(inShape)}. Add a Flatten before it.`,
          fixHint: 'Insert a Flatten node before Linear',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      const inFeatures = typeof inShape[1] === 'number' ? inShape[1] : 0;
      const outFeatures = Number(params.out_features) || 10;
      const paramCount = inFeatures > 0 ? inFeatures * outFeatures + outFeatures : 0;

      return {
        success: true,
        outputShapes: { out: ['B', outFeatures] },
        paramCount,
      };
    }

    case 'Activation': {
      const inShape = inputShapes['in'];
      if (inShape === undefined) {
        return {
          success: false,
          error: 'Activation has no input connected.',
          fixHint: 'Connect an input tensor',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      if (inShape === 'unknown') {
        // Upstream error suppression (Trap 8)
        return {
          success: true,
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      return {
        success: true,
        outputShapes: { out: inShape },
        paramCount: 0,
      };
    }

    case 'Flatten': {
      const inShape = inputShapes['in'] || inputShapes['data'];
      if (inShape === undefined) {
        return {
          success: false,
          error: 'Flatten has no input connected.',
          fixHint: 'Connect an upstream 3D or 4D layer (e.g. Conv2D or MaxPool)',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      if (inShape === 'unknown') {
        return {
          success: true,
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      if (!Array.isArray(inShape) || inShape.length < 2) {
        return {
          success: false,
          error: `Flatten input has fewer than 2 dims: got ${formatShape(inShape)}.`,
          fixHint: 'Flatten requires a tensor with at least 2 dimensions',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      // If already 2-D, output is identical [B, F]
      if (inShape.length === 2) {
        return {
          success: true,
          outputShapes: { out: inShape },
          paramCount: 0,
        };
      }

      // Product of all non-batch dimensions
      let totalFeatures = 1;
      for (let i = 1; i < inShape.length; i++) {
        const dim = inShape[i];
        if (typeof dim === 'number') {
          totalFeatures *= dim;
        } else {
          return {
            success: false,
            error: `Cannot compute Flatten product on non-numeric dimension ${dim}`,
            outputShapes: { out: 'unknown' },
            paramCount: 0,
          };
        }
      }

      return {
        success: true,
        outputShapes: { out: ['B', totalFeatures] },
        paramCount: 0,
      };
    }

    case 'Conv2D': {
      const inShape = inputShapes['in'];
      if (inShape === undefined) {
        return {
          success: false,
          error: 'Conv2D has no input connected.',
          fixHint: 'Connect a 4-D image batch [B, C, H, W]',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      if (inShape === 'unknown') {
        return {
          success: true,
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      if (!Array.isArray(inShape) || inShape.length !== 4) {
        return {
          success: false,
          error: `Conv2D requires 4-D input [B, C, H, W], got ${formatShape(inShape)}.`,
          fixHint: 'Feed a 4-D image tensor to Conv2D',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      const inChannels = inShape[1];
      const inH = inShape[2];
      const inW = inShape[3];

      if (typeof inChannels !== 'number' || typeof inH !== 'number' || typeof inW !== 'number') {
        return {
          success: false,
          error: 'Conv2D input dimensions must be numbers',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      const outChannels = Number(params.out_channels) || 16;
      const kernel = Number(params.kernel) || 3;
      const stride = Number(params.stride) || 1;
      const padding = Number(params.padding) || 0;

      if (kernel > inH + 2 * padding || kernel > inW + 2 * padding) {
        return {
          success: false,
          error: `Conv2D kernel (${kernel}) is larger than padded input (${inH + 2 * padding}).`,
          fixHint: 'Reduce kernel size or increase padding',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      // H' = floor((H + 2*padding - kernel) / stride) + 1
      const outH = Math.floor((inH + 2 * padding - kernel) / stride) + 1;
      const outW = Math.floor((inW + 2 * padding - kernel) / stride) + 1;

      // Parameters = (kernel * kernel * inChannels * outChannels) + outChannels (bias)
      const paramCount = kernel * kernel * inChannels * outChannels + outChannels;

      return {
        success: true,
        outputShapes: { out: ['B', outChannels, outH, outW] },
        paramCount,
      };
    }

    case 'MaxPool2D': {
      const inShape = inputShapes['in'];
      if (inShape === undefined) {
        return {
          success: false,
          error: 'MaxPool2D has no input connected.',
          fixHint: 'Connect a 4-D tensor [B, C, H, W]',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      if (inShape === 'unknown') {
        return {
          success: true,
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      if (!Array.isArray(inShape) || inShape.length !== 4) {
        return {
          success: false,
          error: `MaxPool2D requires 4-D input [B, C, H, W], got ${formatShape(inShape)}.`,
          fixHint: 'Feed a 4-D image tensor to MaxPool2D',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      const inChannels = inShape[1];
      const inH = inShape[2];
      const inW = inShape[3];

      if (typeof inH !== 'number' || typeof inW !== 'number') {
        return {
          success: false,
          error: 'MaxPool2D input spatial dimensions must be numbers',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      const kernel = Number(params.kernel) || 2;
      const stride = Number(params.stride) || 2;

      if (kernel > inH || kernel > inW) {
        return {
          success: false,
          error: `MaxPool2D kernel (${kernel}) is larger than input size (${inH}).`,
          fixHint: 'Reduce kernel size',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      // H' = floor((H - kernel) / stride) + 1
      const outH = Math.floor((inH - kernel) / stride) + 1;
      const outW = Math.floor((inW - kernel) / stride) + 1;

      return {
        success: true,
        outputShapes: { out: ['B', inChannels, outH, outW] },
        paramCount: 0,
      };
    }

    case 'Dropout': {
      const inShape = inputShapes['in'];
      if (inShape === undefined) {
        return {
          success: false,
          error: 'Dropout has no input connected.',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }
      return {
        success: true,
        outputShapes: { out: inShape },
        paramCount: 0,
      };
    }

    case 'BatchNorm': {
      const inShape = inputShapes['in'];
      if (inShape === undefined) {
        return {
          success: false,
          error: 'BatchNorm has no input connected.',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      if (inShape === 'unknown') {
        return {
          success: true,
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      let paramCount = 0;
      if (Array.isArray(inShape) && inShape.length >= 2) {
        const channels = typeof inShape[1] === 'number' ? inShape[1] : 0;
        paramCount = channels * 2; // gamma and beta
      }

      return {
        success: true,
        outputShapes: { out: inShape },
        paramCount,
      };
    }

    case 'Add': {
      const inA = inputShapes['in1'] || inputShapes['a'];
      const inB = inputShapes['in2'] || inputShapes['b'];

      if (!inA || inA === 'unknown' || !inB || inB === 'unknown') {
        return {
          success: false,
          error: 'Add requires two input connections.',
          fixHint: 'Connect both input branches to Add',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      if (!areShapesEqual(inA, inB)) {
        return {
          success: false,
          error: `Add: got ${formatShape(inA)} and ${formatShape(inB)}. Shapes must match.`,
          fixHint: 'Ensure both branches produce identical tensor shapes',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      return {
        success: true,
        outputShapes: { out: inA },
        paramCount: 0,
      };
    }

    case 'Concat': {
      const inA = inputShapes['in1'] || inputShapes['a'];
      const inB = inputShapes['in2'] || inputShapes['b'];

      if (!inA || inA === 'unknown' || !inB || inB === 'unknown') {
        return {
          success: false,
          error: 'Concat requires two input connections.',
          fixHint: 'Connect both input branches to Concat',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      if (!Array.isArray(inA) || !Array.isArray(inB)) {
        return {
          success: false,
          error: 'Concat inputs must be tensors.',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      if (inA.length !== inB.length) {
        return {
          success: false,
          error: `Concat inputs have different ranks: ${formatShape(inA)} vs ${formatShape(inB)}`,
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      const axis = Number(params.axis ?? 1); // default channel axis (1)
      if (axis < 0 || axis >= inA.length) {
        return {
          success: false,
          error: `Invalid concat axis ${axis} for rank ${inA.length}`,
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      const outShape: Dimension[] = [];
      for (let i = 0; i < inA.length; i++) {
        if (i === axis) {
          const dimA = inA[i];
          const dimB = inB[i];
          if (typeof dimA === 'number' && typeof dimB === 'number') {
            outShape.push(dimA + dimB);
          } else {
            return {
              success: false,
              error: 'Cannot concat non-numeric dimension values',
              outputShapes: { out: 'unknown' },
              paramCount: 0,
            };
          }
        } else {
          if (inA[i] !== inB[i]) {
            return {
              success: false,
              error: `Concat: non-concatenated dimension ${i} mismatch (${inA[i]} vs ${inB[i]}).`,
              fixHint: 'All dimensions except the concatenation axis must match',
              outputShapes: { out: 'unknown' },
              paramCount: 0,
            };
          }
          outShape.push(inA[i]);
        }
      }

      return {
        success: true,
        outputShapes: { out: outShape },
        paramCount: 0,
      };
    }

    case 'Loss': {
      const logits = inputShapes['logits'] || inputShapes['in'];

      if (!logits || logits === 'unknown') {
        return {
          success: false,
          error: 'Loss node has no prediction/logits input connected.',
          outputShapes: { out: 'scalar' },
          paramCount: 0,
        };
      }

      const fn = String(params.fn || 'cross_entropy').toLowerCase();
      if (fn.includes('cross_entropy')) {
        if (!Array.isArray(logits) || logits.length !== 2) {
          return {
            success: false,
            error: `CrossEntropy loss requires 2-D logits [B, K], got ${formatShape(logits)}.`,
            fixHint: 'Connect 2-D logits from a Linear layer',
            outputShapes: { out: 'scalar' },
            paramCount: 0,
          };
        }
      }

      return {
        success: true,
        outputShapes: { out: 'scalar' },
        paramCount: 0,
      };
    }

    case 'Optimizer': {
      return {
        success: true,
        outputShapes: { opt: 'scalar' },
        paramCount: 0,
      };
    }

    case 'LoadDataset': {
      const name = String(params.dataset || params.name || 'mnist').toLowerCase();
      if (name.includes('cifar')) {
        return {
          success: true,
          outputShapes: {
            data: ['B', 3, 32, 32],
            images: ['B', 3, 32, 32],
            labels: ['B'],
          },
          paramCount: 0,
        };
      }
      return {
        success: true,
        outputShapes: {
          data: ['B', 1, 28, 28],
          images: ['B', 1, 28, 28],
          labels: ['B'],
        },
        paramCount: 0,
      };
    }

    case 'Shuffle': {
      const inData = inputShapes['data'] || inputShapes['in'];
      return {
        success: true,
        outputShapes: { data: inData || 'unknown' },
        paramCount: 0,
      };
    }

    case 'TrainTestSplit': {
      const inData = inputShapes['data'] || inputShapes['in'];
      return {
        success: true,
        outputShapes: {
          train: inData || 'unknown',
          test: inData || 'unknown',
        },
        paramCount: 0,
      };
    }

    case 'Normalize': {
      const inData = inputShapes['data'] || inputShapes['in'];
      return {
        success: true,
        outputShapes: { data: inData || 'unknown' },
        paramCount: 0,
      };
    }

    case 'FeatureExtractor': {
      const inShape = inputShapes['in'] || inputShapes['data'];
      if (inShape === undefined) {
        return {
          success: false,
          error: 'Feature Extractor has no input connected.',
          fixHint: 'Connect an image data source (e.g. LoadDataset, Normalize)',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }
      if (inShape === 'unknown') {
        return {
          success: true,
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      const rank = getTensorRank(inShape);
      if (rank !== 3 && rank !== 4) {
        return {
          success: false,
          error: `Feature Extractor requires spatial image input [B, C, H, W], got ${formatShape(inShape)}.`,
          fixHint: 'Connect spatial image data before Flattening',
          outputShapes: { out: 'unknown' },
          paramCount: 0,
        };
      }

      const builderResult = inferBuilderShapes(layers || [], inShape);
      if (builderResult.errors.length > 0) {
        return {
          success: false,
          error: builderResult.errors[0].message,
          fixHint: builderResult.errors[0].fixHint,
          outputShapes: { out: 'unknown' },
          paramCount: builderResult.totalParams,
        };
      }

      return {
        success: true,
        outputShapes: { out: builderResult.finalOutputShape },
        paramCount: builderResult.totalParams,
      };
    }

    case 'Classifier': {
      const inShape = inputShapes['in'] || inputShapes['data'];
      if (inShape === undefined) {
        return {
          success: false,
          error: 'Classifier has no input connected.',
          fixHint: 'Connect a Flatten node output or 1D vector features',
          outputShapes: { model: 'scalar' },
          paramCount: 0,
        };
      }
      if (inShape === 'unknown') {
        return {
          success: true,
          outputShapes: { model: 'scalar' },
          paramCount: 0,
        };
      }

      const rank = getTensorRank(inShape);
      if (rank > 2) {
        return {
          success: false,
          error: `Classifier requires 1D flat input [B, F], got ${formatShape(inShape)}.`,
          fixHint: 'Connect a Flatten node between Feature Extractor and Classifier',
          outputShapes: { model: 'scalar' },
          paramCount: 0,
        };
      }

      const builderResult = inferBuilderShapes(layers || [], inShape);
      if (builderResult.errors.length > 0) {
        return {
          success: false,
          error: builderResult.errors[0].message,
          fixHint: builderResult.errors[0].fixHint,
          outputShapes: { model: 'scalar' },
          paramCount: builderResult.totalParams,
        };
      }

      return {
        success: true,
        outputShapes: { model: 'scalar' },
        paramCount: builderResult.totalParams,
      };
    }

    case 'Train': {
      return {
        success: true,
        outputShapes: {
          trained_model: 'scalar',
          history: 'scalar',
          metrics: 'scalar',
        },
        paramCount: 0,
      };
    }

    case 'Evaluate': {
      return {
        success: true,
        outputShapes: { metrics: 'scalar' },
        paramCount: 0,
      };
    }

    case 'Metrics':
    case 'Predict': {
      return {
        success: true,
        outputShapes: {},
        paramCount: 0,
      };
    }

    default: {
      // Fallback pass-through
      const firstIn = Object.values(inputShapes)[0];
      return {
        success: true,
        outputShapes: { out: firstIn || 'unknown' },
        paramCount: 0,
      };
    }
  }
}

