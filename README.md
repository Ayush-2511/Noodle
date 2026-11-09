# Noodle

(working name)

This repo is empty for now. No code yet, just the plan.

The idea: a node editor for neural networks that runs in the browser, like Blender's shader nodes but for models. Wire up Conv2D, ReLU, Pool and so on to build a CNN, see tensor shapes on every wire, train small models on your own device, and export plain PyTorch when you outgrow it.

First goal is small: build an MLP and a CNN from nodes, train on MNIST in the browser, export the code.

The full plan is in [`docs/mvp-guide.md`](docs/mvp-guide.md).