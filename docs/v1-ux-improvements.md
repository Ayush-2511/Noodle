# Noodle v1: UX & Beginner-Friendliness Improvements

> Improvements to the current layer-per-node architecture that make Noodle approachable to people who are new to deep learning, without dumbing it down.

---

## The Core Problem

Noodle v1 assumes you already know:
- What a `Conv2D`, `Flatten`, `Linear`, or `BatchNorm` is
- Why you'd connect them in a specific order
- What `out_channels: 16`, `kernel: 3`, `stride: 1`, `padding: 1` means
- What `[B, 1, 28, 28]` → `[B, 8, 28, 28]` represents
- Why your graph is red and what to do about it
- That you need Loss → Optimizer → Train → Metrics nodes to actually train

A beginner sees a palette of cryptic names, a blank canvas, and zero guidance.

---

## Proposal 1: Guided Templates with Annotations

**Current**: Buttons say "Load T1 (MLP)" and "Load T2 (CNN)". Meaningless to a beginner.

**Proposed**: Replace with a **Template Gallery** — a modal/panel with visual cards:

| Template | Description | Difficulty |
|----------|-------------|------------|
| **"Your First Neural Network"** | A 2-layer MLP. Comes with annotations explaining each node. | ⭐ |
| **"See with Convolutions"** | A CNN that scans images for patterns. | ⭐⭐ |
| **"The Full Pipeline"** | Complete train-evaluate loop with everything. | ⭐⭐⭐ |
| **"Residual Skip Connection"** | Why ResNets work. | ⭐⭐⭐⭐ |

Each template loads the graph AND activates **annotation mode** — floating comment bubbles attached to nodes/edges explaining what each piece does and why.

Templates are the **primary learning tool**. A beginner loads one, reads annotations, tweaks, retrains, observes.

---

## Proposal 2: Contextual Node Descriptions

Add `description` and `hint` fields to `NodeDefinition`. Show a collapsible info section or tooltip on a `ⓘ` icon per node:

```
Conv2D — Image Feature Scanner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Slides a small window (kernel) across the image to detect
patterns like edges, corners, and textures. Each "output
channel" learns to detect a different pattern.

┌ Kernel Size: How big the scanning window is (3 = 3×3 pixels)
├ Out Channels: How many different patterns to look for
├ Stride: How far to slide the window each step
└ Padding: Extra border pixels to preserve image size
```

More examples:
- **Flatten**: *"Reshapes a multi-dimensional feature map into a single row of numbers. Required before feeding image features into a Linear layer."*
- **Loss (CrossEntropy)**: *"Measures how wrong the network's predictions are. Lower = better. CrossEntropy is used when classifying into categories (like digits 0-9)."*
- **Optimizer (Adam)**: *"The algorithm that adjusts the network's weights to reduce the loss. Adam adapts the learning rate automatically."*
- **Learning Rate**: *"How big each adjustment step is. Too high = overshoots. Too low = painfully slow. Try 0.001-0.01."*

Feels like a reference tooltip, not a tutorial popup. Technical users collapse/ignore it.

---

## Proposal 3: Human-Readable Error Messages

**Current**: `"Shape mismatch at n4.in: expected [B, 784] got [B, 1568]"`

**Proposed**: Errors explain *why* and suggest a *fix*:

```
❌ Shape mismatch
The Linear layer expects 784 inputs but is receiving 1568.

Why: The image passed through Conv2D and MaxPool layers that
produced a larger feature map than this Linear layer can handle.

Fix: Either increase out_features to 1568, or add a MaxPool2D
before Flatten to shrink the feature map.
```

The `Problem` interface already has a `fixHint` field — it's just almost never populated. Fill it for every common error case.

---

## Proposal 4: Data Flow Visualization ("Peek Mode")

When toggled per-node or globally:

1. **Dataset node**: Shows a 4×4 grid of sample MNIST images
2. **After Conv2D**: Feature map thumbnails — the 8 channels as tiny grayscale images
3. **After Flatten**: Horizontal bar showing values as a heatmap strip
4. **After Linear + Softmax**: Bar chart of class probabilities (0-9)

Runs a forward pass on a single sample, captures intermediate activations. Compute-cheap.

This is the "aha" feature. Watching feature maps evolve from random noise to recognizable edge detectors *across training epochs* teaches CNNs intuitively.

---

## Proposal 5: Smart Wiring Suggestions

When placing a new node:
- Highlight compatible sockets on existing nodes with a subtle pulse
- Offer ghost wires for obvious connections (e.g., `Linear` after unconnected `Activation.out`)
- Show tooltip on incompatible hover explaining why it won't connect
- "Suggest next node" chip: after `Conv2D`, show `Suggested: ReLU →`

---

## Proposal 6: Interactive Onboarding Walkthrough

First visit triggers a short step-by-step overlay (skippable):

1. "This is the canvas" — highlight editor
2. "These are your building blocks" — highlight palette
3. "Drag a Dataset node" — wait for user action
4. "Now add Flatten and Linear" — guide MLP build
5. "Connect them" — show drag from/to
6. "See the shapes update?" — explain wire badges
7. "Add Loss, Optimizer, Train" — complete pipeline
8. "Hit Train and watch it learn" — the payoff

< 3 minutes. Re-accessible from a "?" button in the header.

---

## Proposal 7: Glossary Panel

Slide-out panel (toggled with `G` key):

- **Neural Network**: A function that learns patterns from data by adjusting millions of tiny numbers.
- **Epoch**: One complete pass through all training data.
- **Batch Size**: How many examples the network sees before adjusting weights.
- **Loss**: A number measuring how wrong the network is. Training = making this go down.
- **Overfitting**: Memorizing training data instead of learning general patterns.
- **Feature Map**: What a Conv layer outputs — images highlighting different detected patterns.

Cross-linked entries. Apple developer documentation vibe — clean, dense, no fluff.

---

## Proposal 8: Experiment Snapshots

Save graph state as a **snapshot**, modify, retrain, compare side-by-side.

1. Train 2-layer MLP → 90%
2. "📷 Save Snapshot" → "2-layer baseline"
3. Add third layer, retrain → 93%
4. Compare: two loss curves overlaid, metrics table

Teaches hyperparameter intuition.

---

## Proposal 9: Enriched Node Palette

- Search/filter bar at top
- One-line description below each node name:
  ```
  Conv2D
  Scans image for patterns (edges, textures)
  ```
- Color-code groups: Data = blue, Layers = green, Training = purple

---

## Proposal 10: Predict Node as Hero (M8)

After training completes, Predict node auto-activates: "Draw a digit to test it →"
- Confidence bars for all 10 classes
- "Test random samples" button from test set
- Adversarial examples: shifted digits where the network fails

---

## Priority Ranking

| Priority | Proposal | Effort | Impact |
|----------|----------|--------|--------|
| 🥇 | P2: Node descriptions + hints | Low | High |
| 🥈 | P1: Template gallery | Medium | High |
| 🥉 | P3: Human-readable errors | Low | High |
| 4 | P10: Predict node hero | Planned (M8) | Critical |
| 5 | P6: Onboarding walkthrough | Medium | High |
| 6 | P9: Enriched palette | Low | Medium |
| 7 | P4: Peek mode / data viz | High | Very high |
| 8 | P5: Smart wiring | Medium | Medium-high |
| 9 | P7: Glossary panel | Low-Medium | Medium |
| 10 | P8: Experiment snapshots | High | Medium |

---

## Design Philosophy

- **Don't rename** `Conv2D` to "Image Scanner". Technical terms stay — explained, not replaced.
- **Don't remove parameters**. All knobs stay, each described.
- **Don't auto-build networks**. Guide and suggest, never automate architecture decisions away.
- **Don't gamify with points/badges**. Watching your network learn is the reward.

> Noodle should feel like a well-equipped workshop, not a theme park. Every tool is labeled, there are guides on the wall, an experienced friend can explain things — but you're the one building.

