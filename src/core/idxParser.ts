/**
 * Noodle - Official Yann LeCun MNIST IDX & Binary Dataset Parser
 * 
 * Supports:
 * - train-images-idx3-ubyte / train-images-idx3-ubyte.gz (Magic: 2051 / 0x00000803)
 * - train-labels-idx1-ubyte / train-labels-idx1-ubyte.gz (Magic: 2049 / 0x00000801)
 * - t10k-images-idx3-ubyte / t10k-labels-idx1-ubyte
 * - Automatic Gzip decompression via native DecompressionStream
 */

import { TabularDataset } from './authenticDatasets';

export async function decompressGzipIfNeeded(buffer: Uint8Array): Promise<Uint8Array> {
  // Check for gzip magic bytes 0x1f, 0x8b
  if (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    await writer.write(buffer as any);
    await writer.close();

    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
  return buffer;
}

export function parseIdxImages(buffer: Uint8Array): {
  numImages: number;
  rows: number;
  cols: number;
  data: Uint8Array;
} {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const magic = view.getUint32(0, false);
  if (magic !== 2051 && magic !== 0x00000803) {
    throw new Error(`Invalid IDX image magic header: ${magic} (expected 2051 for idx3-ubyte)`);
  }
  const numImages = view.getUint32(4, false);
  const rows = view.getUint32(8, false);
  const cols = view.getUint32(12, false);
  const imageSize = rows * cols;
  const rawPixels = new Uint8Array(buffer.buffer, buffer.byteOffset + 16, numImages * imageSize);

  return { numImages, rows, cols, data: rawPixels };
}

export function parseIdxLabels(buffer: Uint8Array): {
  numLabels: number;
  data: Uint8Array;
} {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const magic = view.getUint32(0, false);
  if (magic !== 2049 && magic !== 0x00000801) {
    throw new Error(`Invalid IDX label magic header: ${magic} (expected 2049 for idx1-ubyte)`);
  }
  const numLabels = view.getUint32(4, false);
  const data = new Uint8Array(buffer.buffer, buffer.byteOffset + 8, numLabels);
  return { numLabels, data };
}

/**
 * Combines parsed IDX images and IDX labels into a TabularDataset ready for inspection and training.
 */
export function idxToTabularDataset(
  images: { numImages: number; rows: number; cols: number; data: Uint8Array },
  labels?: { numLabels: number; data: Uint8Array },
  datasetName = 'mnist_original.ubyte',
  maxSamples = 10000
): TabularDataset {
  if (!labels || labels.numLabels === 0) {
    throw new Error(
      `No companion labels provided for "${datasetName}". MNIST training requires ground truth labels (e.g. train-labels.idx1-ubyte) to prevent degenerate single-class training.`
    );
  }

  const total = Math.min(images.numImages, labels.numLabels, maxSamples);
  const pixelCount = images.rows * images.cols;

  const headers: string[] = [];
  for (let p = 0; p < pixelCount; p++) {
    headers.push(`pixel${p}`);
  }
  headers.push('label');

  const rows: (number | string)[][] = [];

  for (let i = 0; i < total; i++) {
    const row: number[] = [];
    const offset = i * pixelCount;
    for (let p = 0; p < pixelCount; p++) {
      row.push(images.data[offset + p] / 255.0); // Normalize to 0..1
    }
    const label = labels.data[i];
    row.push(label);
    rows.push(row);
  }

  return {
    name: datasetName,
    headers,
    rows,
    featureColumns: headers.slice(0, pixelCount),
    targetColumn: 'label',
    rowCount: total,
  };
}
