import { describe, it, expect } from 'vitest';

describe('M0 Smoke & Tooling Test Suite', () => {
  it('should run Vitest in strict TypeScript environment', () => {
    expect(true).toBe(true);
  });

  it('should accurately calculate Conv2D spatial output size according to Section 7', () => {
    // Formula: H' = floor((H + 2*padding - kernel) / stride) + 1
    const calculateConvOutput = (h: number, padding: number, kernel: number, stride: number): number => {
      return Math.floor((h + 2 * padding - kernel) / stride) + 1;
    };

    // Worked example from Section 7:
    // Input 28x28, Conv2D(kernel=3, padding=1, stride=1) -> 28x28
    const conv1 = calculateConvOutput(28, 1, 3, 1);
    expect(conv1).toBe(28);

    // MaxPool2D(kernel=2, stride=2) -> (28 - 2)/2 + 1 = 14
    const maxpool1 = Math.floor((28 - 2) / 2) + 1;
    expect(maxpool1).toBe(14);
  });
});

