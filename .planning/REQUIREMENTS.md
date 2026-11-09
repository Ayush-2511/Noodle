# Requirements: Noodle (Node-Based Deep Learning Builder)

**Defined:** 2026-11-09  
**Source:** `docs/mvp-guide.md`  
**Core Value:** Drag nodes, connect wires, see tensor shapes update live, train on MNIST in the browser, export clean PyTorch code.

## v1 Requirements (MVP)

### Project Foundation & Tooling (ENV)
- [ ] **ENV-01**: Project scaffolds with Vite, React, TypeScript (strict mode), and React Flow.
- [ ] **ENV-02**: Vitest test runner is configured and passes initial smoke tests.
- [ ] **ENV-03**: Directory structure strictly adheres to `/src/core`, `/src/nodes`, `/src/backends`, `/src/ui`, and `/tests/graphs`.

### Graph Data Model & State (GRAPH)
- [ ] **GRAPH-01**: Canonical Graph JSON matches version 1 schema with `nodes` and `edges` arrays.
- [ ] **GRAPH-02**: Edges connect specific sockets in format `{ "from": "nodeId.socket", "to": "nodeId.socket" }`.
- [ ] **GRAPH-03**: Node IDs are generated once upon creation and are immutable.
- [ ] **GRAPH-04**: Zustand graph store manages nodes, edges, selections, and serialization with no hidden state.
- [ ] **GRAPH-05**: Graph JSON updates live on canvas changes and can be inspected/copied in real time.

### Shape Inference & Validation Engine (SHAPE & VALID)
- [ ] **SHAPE-01**: Shape engine represents shapes in PyTorch format `[B, C, H, W]` or `[B, F]` with symbolic `B`.
- [ ] **SHAPE-02**: Topological sort executes graph dependency ordering before shape inference.
- [ ] **SHAPE-03**: Shape inference runs as pure TypeScript functions without UI or TF.js imports.
- [ ] **SHAPE-04**: Downstream shapes mark as "unknown" upon upstream errors to prevent cascading noise.
- [ ] **VALID-01**: Validator detects directed cycles and reports error with loop cycle path.
- [ ] **VALID-02**: Validator checks missing required inputs for each node type.
- [ ] **VALID-03**: Validator checks tensor rank and dimension compatibility across connected sockets.
- [ ] **VALID-04**: Validator issues warning (🟡) if `Softmax` is wired immediately before `CrossEntropy`.
- [ ] **VALID-05**: Validator issues warning (🟡) if nodes are disconnected from the primary graph.
- [ ] **VALID-06**: Validator issues warning (🟡) if no Loss node is present when training.
- [ ] **VALID-07**: Validator returns list of problems `{ nodeId, severity, message, fixHint }` and never throws.

### Node Library (NODES - 16 Nodes)
- [ ] **NODE-01**: `Dataset` node supporting MNIST `[B, 1, 28, 28]`, Fashion-MNIST `[B, 1, 28, 28]`, and CIFAR-10 `[B, 3, 32, 32]`.
- [ ] **NODE-02**: `Input` node with configurable manual shape.
- [ ] **NODE-03**: `Linear` node with `out_features` parameter (validates 2-D `[B, F]` input).
- [ ] **NODE-04**: `Conv2D` node with `out_channels`, `kernel`, `stride`, `padding` ($H' = \lfloor(H + 2p - k)/s\rfloor + 1$).
- [ ] **NODE-05**: `MaxPool2D` node with `kernel`, `stride` ($H' = \lfloor(H - k)/s\rfloor + 1$).
- [ ] **NODE-06**: `Flatten` node converting `[B, C, H, W]` to `[B, C \times H \times W]` (validates input rank $\ge 2$).
- [ ] **NODE-07**: `Dropout` node with parameter `p` (preserves shape).
- [ ] **NODE-08**: `BatchNorm` node (preserves shape).
- [ ] **NODE-09**: `Activation` node supporting `ReLU`, `Sigmoid`, `Tanh`, `GELU`, `Softmax`.
- [ ] **NODE-10**: `Add` node for residual connections (verifies identical input shapes).
- [ ] **NODE-11**: `Concat` node along specified axis (verifies matching non-concatenated dimensions).
- [ ] **NODE-12**: `Loss` node supporting `CrossEntropy` (logits + target) and `MSE` (pred + target).
- [ ] **NODE-13**: `Optimizer` node supporting `SGD` and `Adam` with learning rate.
- [ ] **NODE-14**: `Train` node with `epochs` and `batch_size` settings.
- [ ] **NODE-15**: `Metrics` node displaying real-time loss and accuracy curves.
- [ ] **NODE-16**: `Predict` node for interactive inference on test samples and user-drawn digits.

### Visual Editor & Feedback UI (UI)
- [ ] **UI-01**: React Flow interactive canvas supporting pan, zoom, node dragging, and edge wiring.
- [ ] **UI-02**: Node palette allowing drag-and-drop or click-to-add for all available nodes.
- [ ] **UI-03**: Color-coded wires: green for valid shapes, red for shape errors, grey for upstream errors.
- [ ] **UI-04**: Live shape badge displayed directly on every wire (e.g. `[B, 8, 28, 28]`).
- [ ] **UI-05**: Node info strip showing output shape, parameter count, and status dot (🟢 / 🟡 / 🔴).
- [ ] **UI-06**: Collapsible Debug Panel (hotkey `D`) displaying raw Graph JSON, shape table, validation list, topological order, and PyTorch export.
- [ ] **UI-07**: Expected vs. Actual visual test view displaying Section 11 test graphs.

### ML Backend & Browser Training (TRAIN)
- [ ] **TRAIN-01**: TensorFlow.js runtime targeting WebGPU backend with graceful WebGL fallback.
- [ ] **TRAIN-02**: Training execution isolated strictly within a Web Worker to ensure 60fps UI responsiveness.
- [ ] **TRAIN-03**: Automatic channel layout transposition handling `[B, C, H, W]` to TF.js internal format.
- [ ] **TRAIN-04**: Consistent Flatten order between TF.js and PyTorch.
- [ ] **TRAIN-05**: Strict tensor cleanup with `tf.tidy()` and explicit tensor disposal; zero memory leaks across epochs.
- [ ] **TRAIN-06**: Proper train/eval mode toggling for Dropout and BatchNorm between training and inference.
- [ ] **TRAIN-07**: T1 MLP model trains on MNIST in browser: initial loss ~2.3, decreasing, accuracy >90%.
- [ ] **TRAIN-08**: T2 CNN model trains on MNIST in browser: accuracy >95%.

### Code Generation & Parity Verification (EXPORT & PARITY)
- [ ] **EXPORT-01**: Codegen produces clean, standalone, idiomatic PyTorch Python script from validated graph.
- [ ] **EXPORT-02**: PyTorch shapes and layer definitions match the canvas shapes exactly.
- [ ] **PARITY-01**: Headless parity harness verifies identical weights produce identical outputs between TF.js and PyTorch (within 4 decimal places).

### Golden Test Graph Suite (TESTS)
- [ ] **TEST-01 (T1)**: MLP graph (Dataset -> Flatten -> Linear -> ReLU -> Linear -> Loss) passes shape & validation.
- [ ] **TEST-02 (T2)**: CNN graph (Dataset -> Conv -> ReLU -> Pool -> Conv -> ReLU -> Pool -> Flatten -> Linear -> Loss) matches Section 7 worked example exactly.
- [ ] **TEST-03 (T3)**: Residual graph (Conv -> ReLU -> Conv + skip -> Add) passes shape & validation.
- [ ] **TEST-04 (T4)**: Concat graph (two branches merged on channel axis) passes shape & validation.
- [ ] **TEST-05 (E1)**: Linear connected straight to 4-D Dataset images produces error "needs 2-D, add Flatten".
- [ ] **TEST-06 (E2)**: Add node with mismatched input shapes produces shape mismatch error.
- [ ] **TEST-07 (E3)**: Cyclic graph produces cycle detection error.
- [ ] **TEST-08 (E4)**: Softmax followed by CrossEntropy produces double softmax warning.

## Traceability to Milestones

| Requirement IDs | Milestone Phase | Description |
|-----------------|-----------------|-------------|
| ENV-01, ENV-02, ENV-03 | M0 | Project Setup & Tooling |
| GRAPH-01..05, NODE-02, NODE-03, NODE-09 | M1 | Graph Store, JSON, Input, Linear, Activation |
| SHAPE-01..04, VALID-01..07, UI-03..07, TEST-05..08 | M2 | Shape Engine, Validator & Wire Badges |
| NODE-04..08, TEST-02 | M3 | Flatten, Conv2D, MaxPool2D, Dropout, BatchNorm |
| NODE-01, TRAIN-01..07, TEST-01 | M4 | Dataset Node & TF.js Web Worker MLP Training |
| NODE-12..15 | M5 | Loss, Optimizer, Train, Metrics & Live Telemetry |
| TRAIN-03..05, TRAIN-08 | M6 | CNN Training & Layout Bridge |
| NODE-10, NODE-11, TEST-03, TEST-04 | M7 | Add & Concat Merge Nodes |
| NODE-16, TRAIN-06 | M8 | Interactive Predict Node |
| EXPORT-01, EXPORT-02, PARITY-01 | M9 | PyTorch Export & Parity Verification |
| Polish, persistence, undo/redo | M10 | Project Polish & UX |

---
*Generated: 2026-11-09*

