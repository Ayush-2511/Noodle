import { isTauriEnv } from './projectFile';
import { parseCSV, TabularDataset } from './authenticDatasets';
import {
  decompressGzipIfNeeded,
  parseIdxImages,
  parseIdxLabels,
  idxToTabularDataset,
} from './idxParser';

export interface DatasetImportResult {
  parsed: TabularDataset;
  filePath: string;
  fileName: string;
}

/**
 * Opens native Windows file dialog in Tauri (or browser input fallback in web),
 * reads local CSV, binary IDX, or gzipped MNIST files, parses them, and returns TabularDataset.
 */
export async function importCustomDatasetDialog(): Promise<DatasetImportResult | null> {
  if (isTauriEnv()) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readFile, readTextFile } = await import('@tauri-apps/plugin-fs');

      const selected = await open({
        title: 'Select Dataset File (CSV, Original MNIST .gz / .ubyte, or Text)',
        multiple: false,
        directory: false,
        filters: [
          {
            name: 'All Supported Datasets',
            extensions: ['csv', 'txt', 'gz', 'ubyte', 'idx3-ubyte', 'idx1-ubyte', 'bin'],
          },
          {
            name: 'Original MNIST Binaries (*.gz, *.ubyte)',
            extensions: ['gz', 'ubyte', 'idx3-ubyte', 'idx1-ubyte', 'bin'],
          },
          {
            name: 'CSV Datasets (*.csv, *.txt)',
            extensions: ['csv', 'txt'],
          },
        ],
      });

      if (selected && typeof selected === 'string') {
        const fileName = selected.split(/[\\/]/).pop() || 'dataset';
        const isCsvOrTxt = fileName.toLowerCase().endsWith('.csv') || fileName.toLowerCase().endsWith('.txt');

        if (isCsvOrTxt) {
          const content = await readTextFile(selected);
          const parsed = parseCSV(content, fileName);
          return { parsed, filePath: selected, fileName };
        }

        // Binary file (Official MNIST .gz or .ubyte)
        const rawBuffer = await readFile(selected);
        const decompressed = await decompressGzipIfNeeded(rawBuffer);

        // Check if IDX image file
        try {
          const images = parseIdxImages(decompressed);

          // Bulletproof companion label discovery:
          // Split into folder path and file name to prevent corrupting directory names
          const lastSlash = Math.max(selected.lastIndexOf('/'), selected.lastIndexOf('\\'));
          const dir = lastSlash >= 0 ? selected.substring(0, lastSlash) : '';
          const sep = selected.includes('\\') ? '\\' : '/';
          const baseName = lastSlash >= 0 ? selected.substring(lastSlash + 1) : selected;

          let parsedLabels: ReturnType<typeof parseIdxLabels> | undefined;

          const candidateLabelNames = [
            baseName.replace('images', 'labels').replace('idx3', 'idx1'),
            baseName.replace('images.idx3-ubyte', 'labels.idx1-ubyte'),
            baseName.replace('images-idx3-ubyte', 'labels-idx1-ubyte'),
            baseName.replace('train-images', 'train-labels').replace('idx3', 'idx1'),
            baseName.replace('t10k-images', 't10k-labels').replace('idx3', 'idx1'),
            baseName.replace('images', 'labels'),
            baseName.replace('idx3', 'idx1'),
          ];

          for (const candName of candidateLabelNames) {
            if (candName !== baseName) {
              const lPath = dir ? `${dir}${sep}${candName}` : candName;
              try {
                const labelBuffer = await readFile(lPath);
                const decompressedLabels = await decompressGzipIfNeeded(labelBuffer);
                parsedLabels = parseIdxLabels(decompressedLabels);
                console.log(`[Noodle] Auto-discovered companion label file: ${candName} (${parsedLabels.numLabels} labels)`);
                break;
              } catch {
                // Keep trying other candidates
              }
            }
          }

          // If companion labels weren't auto-found in the folder, prompt the user directly!
          if (!parsedLabels) {
            const labelSelected = await open({
              title: `Select companion MNIST labels file for "${baseName}" (e.g. train-labels.idx1-ubyte)`,
              multiple: false,
              directory: false,
              filters: [
                {
                  name: 'MNIST Labels (*.idx1-ubyte, *.gz, *.ubyte)',
                  extensions: ['idx1-ubyte', 'gz', 'ubyte', 'bin'],
                },
                {
                  name: 'All Files (*.*)',
                  extensions: ['*'],
                },
              ],
            });

            if (labelSelected && typeof labelSelected === 'string') {
              const labelBuffer = await readFile(labelSelected);
              const decompressedLabels = await decompressGzipIfNeeded(labelBuffer);
              parsedLabels = parseIdxLabels(decompressedLabels);
            }
          }

          if (!parsedLabels) {
            throw new Error(
              `Companion label file not found for "${baseName}". MNIST training requires ground truth labels (e.g. train-labels.idx1-ubyte).`
            );
          }

          const parsed = idxToTabularDataset(
            images,
            parsedLabels,
            fileName,
            Math.min(images.numImages, 60000)
          );
          return { parsed, filePath: selected, fileName };
        } catch (err: any) {
          // If the error was explicitly thrown above, rethrow it so user sees it
          if (err.message && err.message.includes('Companion label file not found')) {
            throw err;
          }
          // If not images, check if user selected label file
          try {
            const labels = parseIdxLabels(decompressed);
            throw new Error(
              `Selected file is a label index (${labels.numLabels} labels). Please select the images file (e.g. train-images-idx3-ubyte).`
            );
          } catch (err: any) {
            // If neither, fallback to CSV parsing
            try {
              const text = new TextDecoder().decode(decompressed);
              const parsed = parseCSV(text, fileName);
              return { parsed, filePath: selected, fileName };
            } catch {
              throw new Error(`Could not parse file as CSV or MNIST IDX binary: ${err.message}`);
            }
          }
        }
      }
      return null;
    } catch (err: any) {
      console.warn('Native dataset import failed, falling back to browser picker:', err);
    }
  }

  // Web fallback using standard input element (allow multiple files so user can select images + labels together)
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.csv,.txt,.gz,.ubyte,.idx3-ubyte,.idx1-ubyte';
    input.onchange = async () => {
      const files = input.files;
      if (!files || files.length === 0) {
        resolve(null);
        return;
      }
      try {
        const fileList = Array.from(files);
        const csvFile = fileList.find((f) => f.name.endsWith('.csv') || f.name.endsWith('.txt'));
        if (csvFile) {
          const text = await csvFile.text();
          const parsed = parseCSV(text, csvFile.name);
          resolve({ parsed, filePath: csvFile.name, fileName: csvFile.name });
          return;
        }

        let imageFile = fileList.find((f) => f.name.includes('images') || f.name.includes('idx3'));
        const labelFile = fileList.find((f) => f.name.includes('labels') || f.name.includes('idx1'));
        if (!imageFile && fileList.length > 0) imageFile = fileList[0];

        if (imageFile) {
          const imgBuf = await decompressGzipIfNeeded(new Uint8Array(await imageFile.arrayBuffer()));
          const images = parseIdxImages(imgBuf);
          let parsedLabels: ReturnType<typeof parseIdxLabels> | undefined;
          if (labelFile) {
            const lblBuf = await decompressGzipIfNeeded(new Uint8Array(await labelFile.arrayBuffer()));
            parsedLabels = parseIdxLabels(lblBuf);
          }
          if (!parsedLabels) {
            alert('Please select both the images and companion labels file (e.g. train-images.idx3-ubyte + train-labels.idx1-ubyte).');
            resolve(null);
            return;
          }
          const parsed = idxToTabularDataset(images, parsedLabels, imageFile.name, 10000);
          resolve({ parsed, filePath: imageFile.name, fileName: imageFile.name });
          return;
        }
      } catch (err: any) {
        console.error('Failed to parse dataset file:', err);
        alert(err.message || 'Failed to parse dataset file');
        resolve(null);
      }
    };
    input.click();
  });
}
