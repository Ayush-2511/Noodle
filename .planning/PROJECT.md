# Noodle: Node-Based Deep Learning Builder

## What This Is

A Blender-style node editor for deep learning where every neural network layer is an interactive node. It runs fully in the browser (on-device via WebGPU with WebGL fallback) to design, validate, and train neural networks (e.g., MLPs and CNNs on MNIST), inspect live tensor shapes on every wire, and export clean, standalone PyTorch code.

## Core Value

Drag nodes, connect wires, see tensor shapes update live, train on MNIST in the browser, export clean PyTorch code.

## Architecture & Golden Rules

- **Golden Rule (Decoupled Engine)**: The Graph JSON and the Shape Engine know nothing about TensorFlow.js or PyTorch. Backends only *read* the validated graph.
- **Single Interface**: The node editor and the execution engine communicate ONLY through the canonical Graph JSON. No hidden state.
- **Pure Functions**: The Shape Engine and Validator are pure TypeScript functions with zero UI or TF.js imports. `validate(graph)` returns problems; it never throws.
- **Shape Convention**: UI shapes use PyTorch style `[B, C, H, W]` (or `[B, F]`, `[B]`). Batch dimension `B` stays symbolic (`B`), never a hardcoded number. TF.js converts internally.
- **Execution Threading**: Training runs strictly in a Web Worker so the main UI thread never freezes.
- **Memory Safety**: TF.js ops must be wrapped in `tf.tidy()` to prevent tensor memory leaks; `tf.memory().numTensors` must stay flat across epochs.

## Scope

### Active (MVP Scope - 16 Nodes)

- **Data Nodes**:
  - `Dataset`: Preloaded datasets (MNIST, Fashion-MNIST, CIFAR-10) outputting `images` [B, C, H, W] and `labels` [B].
  - `Input`: Manual input shape specification.
- **Layer Nodes**:
  - `Linear`: Fully-connected layer (`out_features`).
  - `Conv2D`: 2D convolution (`out_channels`, `kernel`, `stride`, `padding`).
  - `MaxPool2D`: 2D max pooling (`kernel`, `stride`).
  - `Flatten`: Flattens multi-dimensional tensors to 2D `[B, product of rest]`.
  - `Dropout`: Regularization (`p`).
  - `BatchNorm`: Batch normalization.
- **Activation Nodes**:
  - `Activation`: Activation functions (`ReLU`, `Sigmoid`, `Tanh`, `GELU`, `Softmax`).
- **Combine Nodes**:
  - `Add`: Element-wise addition for skip/residual connections (requires identical shapes).
  - `Concat`: Concatenation along channel/feature axis.
- **Training Nodes**:
  - `Loss`: Loss function (`CrossEntropy`, `MSE`) - exactly one loss node per graph in MVP.
  - `Optimizer`: Optimizer configuration (`SGD`, `Adam`, learning rate).
  - `Train`: Training loop configuration (`epochs`, `batch_size`).
  - `Metrics`: Real-time loss and accuracy live charting.
- **Utility Nodes**:
  - `Predict`: Interactive inference on test images or user-drawn canvas digits.

### Out of Scope (Explicitly Deferred Post-MVP)

- RNN / LSTM / GRU (requires cyclical loop execution design).
- Attention / Transformer (requires multi-head self-attention sub-pieces).
- Reinforcement Learning nodes (agent-environment loop is not a DAG).
- Node groups / subgraphs (requires hierarchical graph nesting).
- User-defined custom nodes (requires sandbox plugin API).
- Cloud saving / user accounts (not needed for core concept proof).
- Custom scratch WebGPU engine (Phase 2).
- Pretrained model import / ONNX (Phase 2).

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Editor UI**: React Flow (`@xyflow/react`)
- **State Management**: Zustand
- **ML Runtime**: TensorFlow.js (WebGPU with WebGL fallback)
- **Training Worker**: Web Worker
- **Testing**: Vitest (pure unit tests and graph test fixtures)
- **Export**: String templates generating pure PyTorch Python code

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Canonical Graph JSON as single interface | Prevents UI coupling to ML backends and enables headless validation/testing | ✓ Locked |
| PyTorch shape convention `[B, C, H, W]` | Intuitive standard; symbolic batch size `B` preserves dynamic batching | ✓ Locked |
| TF.js backend with internal layout transpose | Allows immediate in-browser execution while keeping UI aligned with PyTorch export | ✓ Locked |
| Web Worker for model training | Prevents UI freezing during epochs; communicates loss/accuracy via worker messages | ✓ Locked |
| Pure TypeScript validator returning problems | Deterministic testing, no exceptions thrown, easy live error reporting on wires | ✓ Locked |
| Strict milestone progression (M0 -> M10) | Ensures visible, test-backed proof at every stage before advancing | ✓ Locked |

---
*Created: 2026-11-09 from `docs/mvp-guide.md`*
