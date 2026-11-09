# Roadmap: Noodle (Node-Based Deep Learning Builder)

## Overview

A phased journey building a browser-based, visual node editor for designing, validating, and training neural networks on-device with live shape inference and clean PyTorch export. Each milestone produces concrete, visible proof before the next begins.

## Milestones (Phases)

- [x] **Phase 0 (M0): Project Setup** — Vite + React + TypeScript + React Flow + Vitest foundations.
- [x] **Phase 1 (M1): Graph Store & Core Nodes** — Canonical Graph JSON schema, Zustand store, and 3 starter nodes (Input, Linear, Activation).
- [x] **Phase 2 (M2): Shape Engine & Validator** — Pure TS shape inference, topological sort, validation rules, color-coded wires, and shape badges.
- [x] **Phase 3 (M3): Core CNN Layers** — Flatten, Conv2D, MaxPool2D, Dropout, BatchNorm; verifies worked example T2 shape math.
- [x] **Phase 4 (M4): Dataset & Web Worker MLP Training** — Dataset node (MNIST), TF.js Web Worker runtime, training T1 to >90% accuracy.
- [x] **Phase 5 (M5): Training Graph Nodes & Telemetry** — Loss, Optimizer, Train, Metrics nodes wired into canvas with live loss/accuracy charts.
- [x] **Phase 6 (M6): CNN Training & Layout Bridge** — Channels-first to channels-last layout bridge, training T2 CNN to >95% accuracy.
- [ ] **Phase 7 (M7): Multi-Branch & Merge Nodes** — Add and Concat nodes with shape validation; T3 (residual) and T4 (concat) pass.
- [ ] **Phase 8 (M8): Interactive Predict Node** — On-device digit drawing and test sample inference.
- [ ] **Phase 9 (M9): PyTorch Export & Parity Harness** — PyTorch Python codegen and automated numerical parity verification (within 4 decimals).
- [ ] **Phase 10 (M10): Polish & File Persistence** — Graph JSON import/export, undo/redo history, clean UX, and documentation.

---

## Phase Details

### Phase 0: Project Setup (M0)
**Goal**: Establish the project development environment with Vite, React, TypeScript (strict mode), React Flow, and Vitest, verifying the tooling pipeline with a blank interactive canvas and a passing test.  
**Depends on**: Nothing (first phase)  
**Requirements**: ENV-01, ENV-02, ENV-03  
**Success Criteria** (Visible proof):
1. Dev server runs with zero errors and loads a blank React Flow canvas with zoom/pan controls.
2. Vitest runs in watch/single-run mode and reports at least one passing green smoke test.
3. Strict TypeScript configuration compiles without errors.
4. Base project directory structure created (`/src/core`, `/src/nodes`, `/src/backends`, `/src/ui`, `/tests/graphs`).
**Plans**: 1 plan (`00-01-PLAN.md`)

Plans:
- [x] 00-01: Initialize Vite + React + TS project, install React Flow and Vitest, configure paths, and establish smoke test.

---

### Phase 1: Graph Store & Core Nodes (M1)
**Goal**: Implement the canonical Graph JSON data model, Zustand graph state management, node palette, and the first 3 nodes (`Input`, `Linear`, `Activation`) with a live synchronized JSON inspector.  
**Depends on**: Phase 0 (M0)  
**Requirements**: GRAPH-01, GRAPH-02, GRAPH-03, GRAPH-04, GRAPH-05, NODE-02, NODE-03, NODE-09  
**Success Criteria** (Visible proof):
1. User can drag or add `Input`, `Linear`, and `Activation` nodes onto the canvas.
2. User can drag wires between sockets (`from: nodeId.socket -> to: nodeId.socket`).
3. User can edit node parameters (`out_features`, activation `fn`, manual shape) on the nodes.
4. Live Graph JSON inspector panel updates instantly upon any node/edge/parameter mutation.
5. Node IDs are generated once upon creation and remain immutable.
6. Graph store unit tests pass in Vitest (testing node/edge additions, removals, param updates, JSON export/import).
**Plans**: 2 plans (`01-01-PLAN.md`, `01-02-PLAN.md`)

Plans:
- [x] 01-01: Implement canonical Graph JSON types, immutable ID generation, and Zustand graph store with unit tests.
- [x] 01-02: Create Input, Linear, Activation node components, socket handles, node palette, and live JSON inspector panel.

---

### Phase 2: Shape Engine & Validator (M2)
**Goal**: Build the pure TypeScript shape inference engine and graph validator, rendering live shape badges on wires and color-coding wires based on validity.  
**Depends on**: Phase 1 (M1)  
**Requirements**: SHAPE-01, SHAPE-02, SHAPE-03, SHAPE-04, VALID-01, VALID-02, VALID-03, VALID-04, VALID-05, VALID-06, VALID-07, UI-03, UI-04, UI-05, UI-06, UI-07, TEST-05, TEST-06, TEST-07, TEST-08  
**Success Criteria** (Visible proof):
1. Connecting incompatible shapes turns the wire red (🔴) with an actionable hover tooltip/popover message.
2. Valid connections turn the wire green (🟢) and display a shape badge directly on the wire (e.g. `[B, 128]`).
3. Upstream errors mark downstream nodes as unknown (⚪ grey wire) without cascading spurious errors.
4. Graph validator catches cycles, missing inputs, and invalid ranks without throwing runtime exceptions.
5. Debug panel (toggleable via key `D`) displays topological execution order, shape table, and problem list.
6. Golden error test graphs E1, E2, E3, and E4 fail with exact expected messages in automated Vitest tests.
**Plans**: 2 plans

---

### Phase 3: Core CNN Layers (M3)
**Goal**: Implement `Flatten`, `Conv2D`, `MaxPool2D`, `Dropout`, and `BatchNorm` nodes with complete 4-D shape inference formulas.  
**Depends on**: Phase 2 (M2)  
**Requirements**: NODE-04, NODE-05, NODE-06, NODE-07, NODE-08, TEST-02  
**Success Criteria** (Visible proof):
1. Adding Conv2D, MaxPool2D, and Flatten calculates exact spatial dimensions: $H' = \lfloor(H + 2p - k)/s\rfloor + 1$.
2. Golden test graph T2 (Section 7 worked example) runs through shape inference and matches the shape table line for line.
3. Node info strips display live output shape and parameter count for Conv2D, MaxPool2D, and Linear layers.
**Plans**: 2 plans

---

### Phase 4: Dataset & Web Worker MLP Training (M4)
**Goal**: Implement the `Dataset` node (MNIST) and an isolated Web Worker TensorFlow.js runtime that trains an MLP (T1) without freezing the UI.  
**Depends on**: Phase 3 (M3)  
**Requirements**: NODE-01, TRAIN-01, TRAIN-02, TRAIN-05, TRAIN-07, TEST-01  
**Success Criteria** (Visible proof):
1. MNIST dataset loads and pre-processes in the browser (normalized 0–1, integer labels).
2. Training executes completely inside a Web Worker; UI animations, dragging, and panning stay at smooth 60fps.
3. T1 MLP graph trains for 1 epoch on MNIST: initial loss starts near 2.3 and decreases, achieving >90% validation accuracy.
4. `tf.memory().numTensors` stays flat across training iterations (no memory leaks).
**Plans**: 2 plans

---

### Phase 5: Training Graph Nodes & Live Telemetry (M5)
**Goal**: Wire `Loss`, `Optimizer`, `Train`, and `Metrics` nodes into the visual graph, streaming epoch loss and accuracy directly to a real-time charting panel.  
**Depends on**: Phase 4 (M4)  
**Requirements**: NODE-12, NODE-13, NODE-14, NODE-15  
**Success Criteria** (Visible proof):
1. Graph supports connecting logits to `Loss.logits` and labels to `Loss.target`.
2. `Optimizer` node exposes configurable learning rate and algorithm selection (SGD/Adam).
3. `Train` node controls start, pause, and stop of the training loop.
4. `Metrics` node renders responsive, live-updating line charts for loss and accuracy over batches and epochs.
**Plans**: 2 plans

---

### Phase 6: CNN Training & Layout Bridge (M6)
**Goal**: Bridge PyTorch channels-first `[B, C, H, W]` layout with TF.js internal layout, train the T2 CNN model to >95% accuracy on MNIST, and handle train vs. eval modes.  
**Depends on**: Phase 5 (M5)  
**Requirements**: TRAIN-03, TRAIN-04, TRAIN-06, TRAIN-08  
**Success Criteria** (Visible proof):
1. T2 CNN model compiles and trains in TF.js with automated internal dimension transposition.
2. T2 achieves >95% accuracy on MNIST after 1 epoch.
3. Dropout and BatchNorm behave deterministically: active during training, deactivated during evaluation/metrics.
**Plans**: 2 plans

---

### Phase 7: Multi-Branch & Merge Nodes (M7)
**Goal**: Implement `Add` and `Concat` nodes to support residual connections and multi-branch networks, verified by T3 and T4 test graphs.  
**Depends on**: Phase 6 (M6)  
**Requirements**: NODE-10, NODE-11, TEST-03, TEST-04  
**Success Criteria** (Visible proof):
1. `Add` node merges two identical shape branches; mismatched shapes flag red.
2. `Concat` node merges along specified axis, verifying non-concat axes match.
3. Test graphs T3 (residual skip connection) and T4 (channel concatenation) pass shape inference and training smoke tests.
**Plans**: 1 plan

---

### Phase 8: Interactive Predict Node (M8)
**Goal**: Provide an interactive `Predict` node with a canvas drawing pad and sample selector for immediate visual testing of trained models.  
**Depends on**: Phase 7 (M7)  
**Requirements**: NODE-16  
**Success Criteria** (Visible proof):
1. Predict node embeds an HTML5 drawing canvas for user digit sketching.
2. User sketches a digit (e.g., "7") and model displays softmax probabilities and predicted class 7 with confidence bar.
3. User can click a random MNIST test image and see live classification with labeled ground truth.
**Plans**: 1 plan

---

### Phase 9: PyTorch Codegen & Parity Harness (M9)
**Goal**: Generate idiomatic PyTorch Python code from the validated graph and execute an automated headless numerical parity harness comparing TF.js and PyTorch outputs.  
**Depends on**: Phase 8 (M8)  
**Requirements**: EXPORT-01, EXPORT-02, PARITY-01  
**Success Criteria** (Visible proof):
1. Export button generates clean, formatted, executable PyTorch Python script matching the graph.
2. Headless parity script loads shared fixed weights and sample input: outputs between TF.js and PyTorch match to within 4 decimal places.
3. Debug panel displays live PyTorch code preview updating with canvas changes.
**Plans**: 2 plans

---

### Phase 10: Polish & File Persistence (M10)
**Goal**: Add JSON file save/load, undo/redo history, onboarding templates, and UX polish so anyone can design and train models without instructions.  
**Depends on**: Phase 9 (M9)  
**Requirements**: GRAPH-05, all UX refinements  
**Success Criteria** (Visible proof):
1. Graph can be exported to `.noodle.json` file and imported back with identical layout and parameters.
2. Undo/redo history (Ctrl+Z / Ctrl+Y) restores previous canvas and parameter states.
3. Pre-built templates for T1 (MLP) and T2 (CNN) loadable in one click.
4. "Expected vs. Actual" test screen available in UI displaying status of all golden test graphs.
**Plans**: 1 plan

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|---|---|---|---|---|
| Phase 0 | M0: Project Setup | 1/1 | Completed | 2026-11-09 |
| Phase 1 | M1: Graph Store & Core Nodes | 2/2 | Completed | 2026-11-09 |
| Phase 2 | M2: Shape Engine & Validator | 2/2 | Completed | 2026-11-09 |
| Phase 3 | M3: Core CNN Layers | 2/2 | Completed | 2026-11-09 |
| Phase 4 | M4: Dataset & Training Runtime | 0/2 | Ready to execute | - |
| Phase 5 | M5: Training Nodes & Telemetry | 0/2 | Pending | - |
| Phase 6 | M6: CNN Training & Layout Bridge | 0/2 | Pending | - |
| Phase 7 | M7: Add & Concat Merge Nodes | 0/1 | Pending | - |
| Phase 8 | M8: Interactive Predict Node | 0/1 | Pending | - |
| Phase 9 | M9: PyTorch Codegen & Parity | 0/2 | Pending | - |
| Phase 10 | M10: Polish & Persistence | 0/1 | Pending | - |

---
*Roadmap generated: 2026-11-09*

