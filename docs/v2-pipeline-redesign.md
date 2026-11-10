# Noodle v2: The Pipeline Paradigm

> The node graph stops representing *the neural network architecture* and starts representing *the experiment workflow*. Neural network layers live inside builder nodes. Data ops, training, and evaluation are separate nodes on the canvas.

---

## Why v2?

In v1, every layer is a node. A simple CNN = 13 nodes, 12 wires. The graph IS the neural network — which means it only makes sense if you already understand neural networks.

v2 splits the two concerns:

| Concern | Where it lives |
|---------|---------------|
| **Neural network layers** | Inside **builder nodes**, as a vertical stack |
| **Experiment pipeline** | The node graph on the canvas |

---

## The Two Builders

Instead of one monolithic "Network Builder", v2 has two specialized builder nodes:

### Feature Extractor
Stacks convolutional and pooling layers. Learns spatial patterns from images.

**Available layers inside**: `Conv2D`, `MaxPool2D`, `BatchNorm`, `ReLU`, `Sigmoid`, `Dropout`

**Does NOT include Flatten** — Flatten is a separate node on the canvas (see below).

### Classifier (Dense Network)
Stacks linear (dense) layers. Takes flat feature vectors and produces predictions.

**Available layers inside**: `Linear`, `ReLU`, `Sigmoid`, `Dropout`, `BatchNorm`

---

## Flatten as a Separate Node

Flatten lives on the canvas as its own node, NOT inside either builder. This is deliberate:

1. **It's the bridge** between spatial (image) data and flat (vector) data. Making it visible teaches that transition.
2. **Flexibility** — the Feature Extractor's output (multi-dimensional feature maps) can connect to other things that accept spatial data: another Feature Extractor, a visualization node, or any future node that takes image-shaped tensors.
3. **For MLPs** (no convolutions), the user connects Reshape or Flatten directly to the Classifier — no Feature Extractor needed. The Flatten node serves the same role.

---

## Canvas Layouts

### CNN Pipeline
```
┌────────────┐   ┌─────────┐   ┌────────────┐   ┌───────────┐
│LoadDataset │──→│ Shuffle  │──→│Train/Test  │──→│ Normalize │
│  (MNIST)   │   │seed: 42 │   │Split 80/20 │   │  0 → 1    │
└────────────┘   └─────────┘   └──┬─────────┘   └─────┬─────┘
                                  │                    │
                             test_data            train_data
                                  │                    │
                                  ▼                    ▼
┌───────────────────┐   ┌─────────┐   ┌──────────────────┐   ┌──────────┐
│Feature Extractor  │──→│ Flatten  │──→│   Classifier     │──→│  Train   │
│                   │   │         │   │                  │   │ adam     │
│ 1. Conv2D(8,3×3)  │   └─────────┘   │ 1. Linear(128)   │   │ lr:0.001 │
│ 2. ReLU           │                 │ 2. ReLU          │   │ ep: 10   │
│ 3. MaxPool(2×2)   │                 │ 3. Linear(10)    │   └──┬───┬──┘
│ 4. Conv2D(16,3×3) │                 │                  │      │   │
│ 5. ReLU           │                 │ Loss: CrossEnt.  │      │   │
│ 6. MaxPool(2×2)   │                 └──────────────────┘      │   │
└───────────────────┘                                           │   │
                                                                ▼   ▼
                                                  ┌──────────┐  ┌─────────┐
                                                  │ Evaluate │  │ Metrics │
                                                  │ Acc:93%  │  │ 📈      │
                                                  └────┬─────┘  └─────────┘
                                                       │
                                                       ▼
                                                  ┌──────────┐
                                                  │ Predict  │
                                                  │ 🎨 Draw! │
                                                  └──────────┘
```

### MLP Pipeline (No Feature Extractor)
```
┌────────────┐   ┌─────────┐   ┌────────────┐   ┌─────────┐
│LoadDataset │──→│ Shuffle  │──→│Train/Test  │──→│ Flatten │
│  (MNIST)   │   │seed: 42 │   │Split 80/20 │   │28×28→784│
└────────────┘   └─────────┘   └──┬─────────┘   └────┬────┘
                                  │                   │
                             test_data           train_data
                                  │                   │
                                  ▼                   ▼
                            ┌──────────────────┐ ┌──────────┐
                            │   Classifier     │→│  Train   │→ Evaluate → Predict
                            │ 1. Linear(128)   │ │ adam     │
                            │ 2. ReLU          │ │ lr:0.001 │
                            │ 3. Linear(10)    │ └──────────┘
                            │ Loss: CrossEnt.  │
                            └──────────────────┘
```

### Feature Extractor → Feature Extractor (Advanced)
Because Flatten is separate, builders can chain:
```
[Feature Extractor A] → [Feature Extractor B] → [Flatten] → [Classifier]
   Conv2D(8) → ReLU       Conv2D(16) → ReLU
   MaxPool(2×2)            MaxPool(2×2)
```

This lets users experiment with modular architectures.

---

## All Node Types

### Data Source

#### LoadDataset
Loads a built-in dataset and outputs raw data.

| | |
|---|---|
| **Params** | `dataset`: select (mnist, fashion_mnist, cifar10) |
| **Outputs** | `data` (type: dataset) |
| **Display** | 3×3 grid of sample images, sample count, image dimensions |

```
┌──────────────────┐
│ 📂 Load Dataset  │
│                  │
│ Dataset: [MNIST▾]│
│                  │
│     data ●───    │
│                  │
│ 60,000 samples   │
│ 28×28 grayscale  │
└──────────────────┘
```

---

### Data Processing

#### Shuffle
Randomizes sample order. Seed-controllable for reproducibility.

| | |
|---|---|
| **Params** | `seed`: number (default: 42) |
| **Inputs** | `data` (dataset) |
| **Outputs** | `data` (dataset) |

#### TrainTestSplit
Splits dataset into training and testing portions.

| | |
|---|---|
| **Params** | `train_pct`: number (default: 80, range: 50–95) |
| **Inputs** | `data` (dataset) |
| **Outputs** | `train` (dataset), `test` (dataset) |

```
┌──────────────────────┐
│ ✂️ Train/Test Split   │
│                      │
│  ●─── data           │
│                      │
│ Train: [80]%         │
│ Test:   20%          │
│                      │
│     train ───● (48k) │
│      test ───● (12k) │
└──────────────────────┘
```

#### Normalize
Scales pixel values.

| | |
|---|---|
| **Params** | `method`: select (min_max, z_score); `range_min`, `range_max` |
| **Inputs** | `data` (dataset) |
| **Outputs** | `data` (dataset) |

#### Flatten
Reshapes multi-dimensional data into a flat vector. **Separate canvas node, not inside any builder.**

| | |
|---|---|
| **Inputs** | `in` (tensor — any shape) |
| **Outputs** | `out` (tensor — flat vector) |
| **Display** | Input shape → Output shape (e.g., `[8,14,14] → [1568]`) |

```
┌──────────────────────┐
│ ⬜ Flatten            │
│                      │
│  ●─── in             │
│       out ───●       │
│                      │
│ [8,14,14] → [1568]   │
└──────────────────────┘
```

#### Reshape *(optional)*
Reshapes data to a target shape.

| | |
|---|---|
| **Params** | `target_shape`: text (e.g., "1,28,28" or "784") |
| **Inputs** | `data` (dataset or tensor) |
| **Outputs** | `data` (dataset or tensor) |

#### Augment *(stretch goal)*
Basic data augmentation: random rotation, flip, noise.

---

### Model Builders

#### Feature Extractor
A builder node for convolutional/spatial layers. Stacks layers internally.

| | |
|---|---|
| **Inputs** | `in` (tensor — image-shaped, e.g. `[1, 28, 28]`) |
| **Outputs** | `out` (tensor — feature maps, e.g. `[16, 7, 7]`) |
| **Internal layers** | Conv2D, MaxPool2D, BatchNorm, ReLU, Sigmoid, Dropout |

```
┌──────────────────────────────────────────────────┐
│ 🔍 Feature Extractor                         n5  │
│                                                  │
│  ●─── in                          out ───●       │
│                                                  │
│  Input: [1, 28, 28]   Output: [16, 7, 7]        │
│ ─────────────────────────────────────────────     │
│                                                  │
│  ☰ 1 │ Conv2D     │ filters: 8  kernel: 3  │ 🗑  │
│       │            │ stride: 1   pad: 1     │    │
│       │            │ → [8, 28, 28]          │    │
│  ─────┼────────────┼───────────────────────────  │
│  ☰ 2 │ ReLU       │                        │ 🗑  │
│       │            │ → [8, 28, 28]          │    │
│  ─────┼────────────┼───────────────────────────  │
│  ☰ 3 │ MaxPool2D  │ kernel: 2   stride: 2  │ 🗑  │
│       │            │ → [8, 14, 14]          │    │
│  ─────┼────────────┼───────────────────────────  │
│  ☰ 4 │ Conv2D     │ filters: 16 kernel: 3  │ 🗑  │
│       │            │ stride: 1   pad: 1     │    │
│       │            │ → [16, 14, 14]         │    │
│  ─────┼────────────┼───────────────────────────  │
│  ☰ 5 │ ReLU       │                        │ 🗑  │
│       │            │ → [16, 14, 14]         │    │
│  ─────┼────────────┼───────────────────────────  │
│  ☰ 6 │ MaxPool2D  │ kernel: 2   stride: 2  │ 🗑  │
│       │            │ → [16, 7, 7]           │    │
│ ─────────────────────────────────────────────     │
│                                                  │
│  [+ Add Layer ▾]                                 │
│                                                  │
│  Params: 1,336                                   │
└──────────────────────────────────────────────────┘
```

**Key**: The Feature Extractor outputs raw feature maps (not flattened). Its output socket carries the spatial shape `[C, H, W]`. This keeps it composable — you can chain another Feature Extractor, or a Flatten, or anything that takes spatial data.

---

#### Classifier (Dense Network)
A builder node for linear/dense layers + the loss function.

| | |
|---|---|
| **Inputs** | `in` (tensor — flat vector, e.g. `[1568]` or `[784]`) |
| **Outputs** | `model` (type: model — the full compiled model including any upstream feature extractor) |
| **Params** | `loss`: select (cross_entropy, mse) |
| **Internal layers** | Linear, ReLU, Sigmoid, Dropout, BatchNorm |

```
┌──────────────────────────────────────────────────┐
│ 🧠 Classifier                                n7  │
│                                                  │
│  ●─── in                         model ───●      │
│                                                  │
│  Input: [1568]   Output: [10]                    │
│ ─────────────────────────────────────────────     │
│                                                  │
│  ☰ 1 │ Linear     │ neurons: 128           │ 🗑  │
│       │            │ → [128]                │    │
│  ─────┼────────────┼───────────────────────────  │
│  ☰ 2 │ ReLU       │                        │ 🗑  │
│       │            │ → [128]                │    │
│  ─────┼────────────┼───────────────────────────  │
│  ☰ 3 │ Dropout    │ rate: 0.5              │ 🗑  │
│       │            │ → [128]                │    │
│  ─────┼────────────┼───────────────────────────  │
│  ☰ 4 │ Linear     │ neurons: 10            │ 🗑  │
│       │            │ → [10]                 │    │
│ ─────────────────────────────────────────────     │
│                                                  │
│  [+ Add Layer ▾]                                 │
│                                                  │
│  Loss: [CrossEntropy ▾]                          │
│  Params: 201,738                                 │
└──────────────────────────────────────────────────┘
```

---

### Training & Evaluation

#### Train
Takes a compiled model and training data, runs the training loop.

| | |
|---|---|
| **Params** | `optimizer`: select (adam, sgd, rmsprop); `lr`: number; `epochs`: number; `batch_size`: number |
| **Inputs** | `model` (model), `train_data` (dataset) |
| **Outputs** | `trained_model` (model), `history` (metrics) |
| **Interactive** | Start/Stop button, live epoch counter, loss display, progress bar |

```
┌─────────────────────────────────┐
│ 🏋️ Train                        │
│                                 │
│  ●─── model                     │
│  ●─── train_data                │
│                                 │
│  Optimizer: [Adam ▾]            │
│  Learning Rate: [0.001 ]        │
│  Epochs: [10    ]               │
│  Batch Size: [32    ]           │
│                                 │
│  ▶ Start Training               │
│                                 │
│  trained_model ───●             │
│       history ───●              │
│                                 │
│  Ep 7/10 │ Loss: 0.152         │
│  ████████████████░░░░ 70%       │
└─────────────────────────────────┘
```

#### Evaluate
Takes a trained model and test data, returns metrics.

| | |
|---|---|
| **Inputs** | `trained_model` (model), `test_data` (dataset) |
| **Outputs** | `metrics` (metrics) |
| **Display** | Test accuracy, test loss |

```
┌────────────────────────────────┐
│ 📊 Evaluate                    │
│                                │
│  ●─── trained_model            │
│  ●─── test_data                │
│                                │
│  Test Accuracy: 93.2%          │
│  Test Loss: 0.241              │
│                                │
│     metrics ───●               │
│                                │
│  [Run Evaluation]              │
└────────────────────────────────┘
```

#### Predict
Trained model + user input → live prediction. The hero node.

| | |
|---|---|
| **Inputs** | `trained_model` (model) |
| **Display** | 28×28 drawing canvas, confidence bars for all 10 classes |

```
┌────────────────────────────────────────┐
│ 🎯 Predict                             │
│                                        │
│  ●─── trained_model                    │
│                                        │
│  ┌──────────────┐   Prediction: 7      │
│  │              │   Confidence: 94.2%  │
│  │   Draw       │                      │
│  │   here       │   0 ▏░░░░░░░░░ 0.1%  │
│  │      ╱       │   1 ▏██░░░░░░░ 3.2%  │
│  │     ╱        │   2 ▏░░░░░░░░░ 0.4%  │
│  │              │   3 ▏░░░░░░░░░ 0.2%  │
│  └──────────────┘   4 ▏░░░░░░░░░ 0.1%  │
│                     5 ▏░░░░░░░░░ 0.3%  │
│  [Clear] [Random]   6 ▏█░░░░░░░░ 1.2%  │
│                     7 ▏████████ 94.2%  │
│                     8 ▏░░░░░░░░░ 0.2%  │
│                     9 ▏░░░░░░░░░ 0.1%  │
└────────────────────────────────────────┘
```

#### Metrics (Chart)
Receives training history and displays live loss/accuracy curves.

| | |
|---|---|
| **Inputs** | `history` (metrics) |
| **Display** | SVG chart — loss (orange) and accuracy (green) curves |

---

## Wire Data Types & Colors

| Type | Wire Color | What flows through |
|------|------------|-------------------|
| `dataset` | 🔵 Blue | Raw or preprocessed data (images + labels) |
| `tensor` | ⚪ White/Grey | Raw tensor data (feature maps, flat vectors) |
| `model` | 🟣 Purple | Compiled or trained neural network |
| `metrics` | 🟠 Orange | Training/eval history (loss, accuracy per epoch) |

Color-coded wires give the graph instant visual structure. Blue lines are data prep. Purple lines connect the model to training. Orange lines carry results.

---

## Graph JSON v2

### New types

```typescript
/** A single layer inside a builder node */
interface LayerEntry {
  id: string;                      // "l1", "l2", etc.
  type: string;                    // "Linear", "Conv2D", "ReLU", "MaxPool2D", "Dropout", "BatchNorm"
  params: Record<string, any>;     // type-specific: { neurons: 128 } or { filters: 8, kernel: 3 }
}

/** Updated graph node — gains optional layers field */
interface GraphNode {
  id: string;
  type: string;                    // "LoadDataset", "Shuffle", "TrainTestSplit", "FeatureExtractor", "Classifier", "Train", etc.
  params: NodeParams;
  position?: { x: number; y: number };
  layers?: LayerEntry[];           // Present only on FeatureExtractor and Classifier nodes
}

interface Graph {
  version: 2;                      // Bumped from 1
  nodes: GraphNode[];
  edges: GraphEdge[];              // Same as v1
}
```

### Example: CNN Pipeline

```json
{
  "version": 2,
  "nodes": [
    {
      "id": "n1", "type": "LoadDataset",
      "params": { "dataset": "mnist" },
      "position": { "x": 80, "y": 150 }
    },
    {
      "id": "n2", "type": "Shuffle",
      "params": { "seed": 42 },
      "position": { "x": 300, "y": 150 }
    },
    {
      "id": "n3", "type": "TrainTestSplit",
      "params": { "train_pct": 80 },
      "position": { "x": 520, "y": 150 }
    },
    {
      "id": "n4", "type": "Normalize",
      "params": { "method": "min_max" },
      "position": { "x": 740, "y": 100 }
    },
    {
      "id": "n5", "type": "FeatureExtractor",
      "params": {},
      "layers": [
        { "id": "l1", "type": "Conv2D", "params": { "filters": 8, "kernel": 3, "stride": 1, "padding": 1 } },
        { "id": "l2", "type": "ReLU", "params": {} },
        { "id": "l3", "type": "MaxPool2D", "params": { "kernel": 2, "stride": 2 } },
        { "id": "l4", "type": "Conv2D", "params": { "filters": 16, "kernel": 3, "stride": 1, "padding": 1 } },
        { "id": "l5", "type": "ReLU", "params": {} },
        { "id": "l6", "type": "MaxPool2D", "params": { "kernel": 2, "stride": 2 } }
      ],
      "position": { "x": 200, "y": 380 }
    },
    {
      "id": "n6", "type": "Flatten",
      "params": {},
      "position": { "x": 520, "y": 380 }
    },
    {
      "id": "n7", "type": "Classifier",
      "params": { "loss": "cross_entropy" },
      "layers": [
        { "id": "l1", "type": "Linear", "params": { "neurons": 128 } },
        { "id": "l2", "type": "ReLU", "params": {} },
        { "id": "l3", "type": "Dropout", "params": { "rate": 0.5 } },
        { "id": "l4", "type": "Linear", "params": { "neurons": 10 } }
      ],
      "position": { "x": 740, "y": 380 }
    },
    {
      "id": "n8", "type": "Train",
      "params": { "optimizer": "adam", "lr": 0.001, "epochs": 10, "batch_size": 32 },
      "position": { "x": 960, "y": 200 }
    },
    {
      "id": "n9", "type": "Evaluate",
      "params": {},
      "position": { "x": 1180, "y": 100 }
    },
    {
      "id": "n10", "type": "Predict",
      "params": {},
      "position": { "x": 1180, "y": 300 }
    },
    {
      "id": "n11", "type": "Metrics",
      "params": {},
      "position": { "x": 1180, "y": 500 }
    }
  ],
  "edges": [
    { "from": "n1.data", "to": "n2.data" },
    { "from": "n2.data", "to": "n3.data" },
    { "from": "n3.train", "to": "n4.data" },
    { "from": "n4.data", "to": "n8.train_data" },
    { "from": "n3.test", "to": "n9.test_data" },
    { "from": "n5.out", "to": "n6.in" },
    { "from": "n6.out", "to": "n7.in" },
    { "from": "n7.model", "to": "n8.model" },
    { "from": "n8.trained_model", "to": "n9.trained_model" },
    { "from": "n8.trained_model", "to": "n10.trained_model" },
    { "from": "n8.history", "to": "n11.metrics" }
  ]
}
```

### Example: MLP Pipeline (no Feature Extractor)

```json
{
  "version": 2,
  "nodes": [
    { "id": "n1", "type": "LoadDataset", "params": { "dataset": "mnist" } },
    { "id": "n2", "type": "Shuffle", "params": { "seed": 42 } },
    { "id": "n3", "type": "TrainTestSplit", "params": { "train_pct": 80 } },
    { "id": "n4", "type": "Flatten", "params": {} },
    {
      "id": "n5", "type": "Classifier",
      "params": { "loss": "cross_entropy" },
      "layers": [
        { "id": "l1", "type": "Linear", "params": { "neurons": 128 } },
        { "id": "l2", "type": "ReLU", "params": {} },
        { "id": "l3", "type": "Linear", "params": { "neurons": 10 } }
      ]
    },
    { "id": "n6", "type": "Train", "params": { "optimizer": "adam", "lr": 0.001, "epochs": 5, "batch_size": 32 } },
    { "id": "n7", "type": "Predict", "params": {} }
  ],
  "edges": [
    { "from": "n1.data", "to": "n2.data" },
    { "from": "n2.data", "to": "n3.data" },
    { "from": "n3.train", "to": "n4.in" },
    { "from": "n4.out", "to": "n5.in" },
    { "from": "n5.model", "to": "n6.model" },
    { "from": "n3.train", "to": "n6.train_data" },
    { "from": "n6.trained_model", "to": "n7.trained_model" }
  ]
}
```

---

## How Model Compilation Works

The Classifier node is the "terminal" builder — it's the one that outputs `model`. When compiling:

1. **Walk backwards** from the Classifier: is there a Flatten connected? Is there a Feature Extractor before the Flatten?
2. **Collect all layers** in order:
   - Feature Extractor layers (if present): `[Conv2D, ReLU, MaxPool, ...]`
   - Flatten (auto-inserted if Feature Extractor → Flatten → Classifier)
   - Classifier layers: `[Linear, ReLU, Dropout, Linear]`
3. **Build a single `tf.sequential()` model** from the combined stack.

Since the layer stack is always sequential (no branching), `tf.sequential()` works perfectly — **no functional API needed**.

```typescript
function compileModel(
  classifierNode: GraphNode,
  featureExtractorNode: GraphNode | null,
  hasFlatten: boolean,
  inputShape: number[]
): tf.LayersModel {
  const model = tf.sequential();
  let isFirst = true;
  const allLayers: LayerEntry[] = [];

  // 1. Feature Extractor layers (if connected)
  if (featureExtractorNode?.layers) {
    allLayers.push(...featureExtractorNode.layers);
  }

  // 2. Flatten (if present between them)
  if (hasFlatten) {
    allLayers.push({ id: 'auto_flatten', type: 'Flatten', params: {} });
  }

  // 3. Classifier layers
  if (classifierNode.layers) {
    allLayers.push(...classifierNode.layers);
  }

  // 4. Compile each layer
  for (const layer of allLayers) {
    const config: any = {};
    if (isFirst) {
      config.inputShape = inputShape; // e.g., [28, 28, 1] for NHWC
    }

    switch (layer.type) {
      case 'Conv2D':
        model.add(tf.layers.conv2d({
          ...config,
          filters: layer.params.filters,
          kernelSize: layer.params.kernel,
          strides: layer.params.stride,
          padding: layer.params.padding > 0 ? 'same' : 'valid',
        }));
        break;
      case 'MaxPool2D':
        model.add(tf.layers.maxPooling2d({
          ...config,
          poolSize: layer.params.kernel,
          strides: layer.params.stride,
        }));
        break;
      case 'Flatten':
        model.add(tf.layers.flatten(config));
        break;
      case 'Linear':
        model.add(tf.layers.dense({
          ...config,
          units: layer.params.neurons,
        }));
        break;
      case 'ReLU':
        model.add(tf.layers.activation({ ...config, activation: 'relu' }));
        break;
      case 'Sigmoid':
        model.add(tf.layers.activation({ ...config, activation: 'sigmoid' }));
        break;
      case 'Dropout':
        model.add(tf.layers.dropout({ ...config, rate: layer.params.rate }));
        break;
      case 'BatchNorm':
        model.add(tf.layers.batchNormalization(config));
        break;
    }
    isFirst = false;
  }

  return model;
}
```

---

## Shape Engine

### Two levels of shape inference

**1. Internal Builder Shape Propagation** — walks the `layers[]` array inside a builder node:

```typescript
function inferBuilderShapes(
  layers: LayerEntry[],
  inputShape: TensorShape
): {
  layerShapes: Array<{ layerId: string; outputShape: TensorShape }>;
  totalParams: number;
  finalOutputShape: TensorShape;
  errors: Array<{ layerId: string; message: string }>;
}
```

This reuses the exact shape math from v1 (Conv2D formula, Flatten product, etc.) — it just iterates over the `layers[]` array instead of traversing graph edges.

**2. Pipeline-Level Shape Propagation** — walks the canvas graph:

| Node Type | Input Shape → Output Shape |
|-----------|---------------------------|
| LoadDataset | → `{ images: [1, 28, 28], labels: [10] }` (or dataset metadata) |
| Shuffle | pass-through |
| TrainTestSplit | pass-through (same shapes, different counts) |
| Normalize | pass-through |
| Flatten | `[C, H, W]` → `[C*H*W]` |
| Reshape | any → target_shape |
| FeatureExtractor | runs `inferBuilderShapes` on its `layers[]` |
| Classifier | runs `inferBuilderShapes` on its `layers[]` |
| Train | model in → trained_model out |
| Evaluate | model + data → metrics |
| Predict | model → prediction |

---

## What Survives From v1

### ✅ Reuse directly
| Component | Status |
|-----------|--------|
| `core/graph.ts` | Update types for `layers` field + version 2 |
| `core/topoSort.ts` | Unchanged — still sorts the pipeline graph |
| `core/shapeEngine.ts` | Layer-level math (Conv2D, Linear, MaxPool, Flatten formulas) moves into `inferBuilderShapes` |
| `backends/tfjs/training.worker.ts` | Mostly unchanged — still runs `model.fit()` |
| `backends/tfjs/mnistLoader.ts` | Unchanged |
| `backends/tfjs/TrainingContext.tsx` | Unchanged |
| `ui/Editor.tsx` | Unchanged — React Flow canvas |
| `ui/MetricsChart.tsx` | Unchanged |
| `ui/CustomEdge.tsx` | Extend with wire color by data type |

### 🔄 Major refactors
| Component | What changes |
|-----------|-------------|
| `core/store.ts` | Add layer CRUD: `addLayer(nodeId, layer)`, `removeLayer(nodeId, layerId)`, `reorderLayer(nodeId, layerId, newIndex)`, `updateLayerParams(nodeId, layerId, params)` |
| `core/validator.ts` | Rewrite for new node types + validate layers inside builders |
| `backends/tfjs/modelCompiler.ts` | Simplified — reads `layers[]` from builder nodes, no graph traversal |
| `nodes/*` | Current layer files become layer-type definitions used inside builders. New node definition files for LoadDataset, Shuffle, TrainTestSplit, etc. |
| `ui/CustomNode.tsx` | New rendering branch for builder nodes (layer stack with drag-reorder) |
| `ui/NodePalette.tsx` | New categories, new node list |
| `App.tsx` | New templates, updated default graphs |

### 🗑 Removed / Merged
| Component | Why |
|-----------|-----|
| `nodes/loss.ts` | Loss dropdown moves into Classifier node |
| `nodes/optimizer.ts` | Optimizer config moves into Train node |
| `nodes/input.ts` | Replaced by LoadDataset |
| `nodes/train.ts` | Merged into new Train node definition |
| `nodes/metrics.ts` | Merged into new Metrics node definition |
| `nodes/add.ts`, `concat.ts` | Multi-branch deferred |

---

## Template Gallery

| Template | Canvas Nodes | Feature Extractor | Classifier | Difficulty |
|----------|-------------|-------------------|------------|------------|
| **"Simplest NN"** | LoadDataset → Flatten → Classifier → Train → Predict | — | Linear(10) | ⭐ |
| **"Your First MLP"** | LoadDataset → Shuffle → Split → Flatten → Classifier → Train → Evaluate → Predict → Metrics | — | Linear(128) → ReLU → Linear(10) | ⭐⭐ |
| **"Image Classifier (CNN)"** | Full pipeline with Feature Extractor | Conv2D(8) → ReLU → MaxPool | Linear(128) → ReLU → Linear(10) | ⭐⭐⭐ |
| **"Deep CNN"** | Full pipeline | Conv2D(8)→ReLU→MaxPool → Conv2D(16)→ReLU→MaxPool | Linear(128)→ReLU→Dropout(0.5)→Linear(10) | ⭐⭐⭐⭐ |

---

## Builder Node UI — Layer Stack Component

The core new UI component. Inside Feature Extractor and Classifier nodes:

### Adding a layer
Click `[+ Add Layer ▾]` → dropdown shows only the layer types valid for this builder:
- Feature Extractor: Conv2D, MaxPool2D, ReLU, Sigmoid, Dropout, BatchNorm
- Classifier: Linear, ReLU, Sigmoid, Dropout, BatchNorm

### Layer row
Each row shows:
```
[☰ drag] [index] │ [type label] │ [inline params] │ [output shape] │ [🗑 delete]
```

### Reordering
Drag the `☰` handle to reorder. Shapes update live as the stack changes.

### Shape error inside a builder
If layer 3 creates a shape mismatch with layer 4, layer 4's row turns red with an inline error message. Same error visualization as v1 node borders, but per-row inside the stack.

### Layer descriptions
Each layer type has a one-line description in the `[+ Add Layer]` dropdown:
```
Conv2D        — Scan for spatial patterns (edges, textures)
MaxPool2D     — Shrink feature maps, keep strongest signals
ReLU          — Let positive values through, block negatives
Dropout       — Randomly disable neurons (prevents overfitting)
BatchNorm     — Stabilize learning by normalizing layer outputs
```

---

## Migration Plan

### Phase A: Core Data Model & Store
1. Update `graph.ts` — version 2, `LayerEntry`, `layers` field
2. Refactor `store.ts` — layer CRUD actions, new node types
3. Split shape engine — `inferBuilderShapes` + pipeline-level inference
4. New validator for v2 node types + internal builder validation

### Phase B: Builder Node UI
1. Layer stack component — add, delete, reorder, inline param editing
2. Live per-layer shape display
3. `[+ Add Layer]` dropdown per builder type
4. Drag-to-reorder (native HTML drag or lightweight library)

### Phase C: Pipeline Nodes
1. Implement LoadDataset, Shuffle, TrainTestSplit, Normalize, Flatten nodes
2. Wire color-coding by data type
3. Updated NodePalette with new categories

### Phase D: Compiler & Training
1. Simplified `modelCompiler.ts` — read `layers[]` from connected builders
2. Update `training.worker.ts` to receive preprocessed data
3. Evaluate node implementation
4. Predict node with 28×28 drawing canvas

### Phase E: Templates & Polish
1. Build 4 templates (⭐ through ⭐⭐⭐⭐)
2. Node descriptions and parameter hints
3. v1 → v2 graph converter for backwards compatibility

---

## Open Questions

1. **Classifier naming** — "Classifier" implies classification tasks only. Alternatives: "Dense Network", "Decision Network", "Neural Network". For MNIST MVP, "Classifier" is fine and descriptive.

2. **How does the Classifier know the full model?** — It needs to trace back through Flatten → Feature Extractor to compile the full `tf.sequential()`. Should this happen at compile time (the compiler walks the graph backwards) or should the Classifier explicitly receive model layers from upstream?

3. **Multiple Feature Extractors** — Since we allow chaining (FE → FE → Flatten → Classifier), the compiler needs to handle N upstream builders. Simple: collect all builder layers in topological order.

4. **Data flow semantics** — Do the data processing nodes (Shuffle, Split, Normalize) actually transform data at graph-wire time, or are they configuration that the training worker reads? Likely the latter for MVP: the worker reads the full pipeline config and applies transforms in order.

5. **Do we keep the Debug Panel and JSON Inspector?** — Hide behind an "Advanced" toggle for clean beginner UX.

