/**
 * Noodle - Proprietary Project File (.noodle) Engine
 * 
 * Handles serialization, parsing, and native OS Save/Open dialogs
 * for .noodle project files with complete offline capability.
 */

import { Graph } from './graph';

export interface NoodleProjectMetadata {
  title: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  description: string;
}

export interface NoodleProjectFile {
  $schema: string;
  version: number;
  noodleVersion: string;
  metadata: NoodleProjectMetadata;
  graph: Graph;
  dataset?: {
    id: string;
    name: string;
    modality: 'image' | 'tabular';
    sourcePath?: string;
  };
  trainingState?: {
    status?: string;
    epochsCompleted?: number;
    finalLoss?: number;
    finalAccuracy?: number;
  };
}

/**
 * Checks whether the current runtime environment is inside the Tauri native desktop wrapper.
 */
export function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Serializes the current graph and metadata into a formatted .noodle JSON string.
 */
export function serializeNoodleProject(
  graph: Graph,
  metadata?: Partial<NoodleProjectMetadata>
): string {
  const now = new Date().toISOString();
  const project: NoodleProjectFile = {
    $schema: 'https://noodle.ai/schema/v2/noodle-project.json',
    version: 2,
    noodleVersion: '0.2.0',
    metadata: {
      title: metadata?.title || 'Noodle Deep Learning Pipeline',
      author: metadata?.author || 'Local User',
      createdAt: metadata?.createdAt || now,
      updatedAt: now,
      description: metadata?.description || 'Exported from Noodle Desktop Studio',
    },
    graph,
  };

  return JSON.stringify(project, null, 2);
}

/**
 * Parses and validates a .noodle project file string.
 */
export function parseNoodleProject(jsonString: string): {
  graph: Graph;
  metadata: NoodleProjectMetadata;
  title: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid project file: expected a JSON object.');
    }

    if (!parsed.graph || !Array.isArray(parsed.graph.nodes) || !Array.isArray(parsed.graph.edges)) {
      throw new Error('Invalid .noodle file: missing valid "graph.nodes" or "graph.edges".');
    }

    const metadata: NoodleProjectMetadata = {
      title: parsed.metadata?.title || 'Untitled Project',
      author: parsed.metadata?.author || 'Local User',
      createdAt: parsed.metadata?.createdAt || new Date().toISOString(),
      updatedAt: parsed.metadata?.updatedAt || new Date().toISOString(),
      description: parsed.metadata?.description || '',
    };

    return {
      graph: parsed.graph as Graph,
      metadata,
      title: metadata.title,
    };
  } catch (err: any) {
    throw new Error(`Failed to load .noodle project: ${err.message || String(err)}`);
  }
}

/**
 * Native OS Save: Opens native Windows save dialog via Tauri plugin,
 * or falls back to browser download if running in web development mode.
 */
export async function saveNoodleProjectNative(
  graph: Graph,
  defaultName = 'model_pipeline.noodle'
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  const content = serializeNoodleProject(graph, {
    title: defaultName.replace(/\.noodle$/i, ''),
  });

  if (isTauriEnv()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');

      const selectedPath = await save({
        title: 'Save Noodle Project',
        defaultPath: defaultName,
        filters: [
          {
            name: 'Noodle Project File (*.noodle)',
            extensions: ['noodle', 'json'],
          },
        ],
      });

      if (!selectedPath) {
        return { success: false }; // User cancelled
      }

      await writeTextFile(selectedPath, content);
      return { success: true, filePath: selectedPath };
    } catch (err: any) {
      console.error('Tauri native save failed, using fallback:', err);
    }
  }

  // Fallback: Browser file download
  try {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = defaultName.endsWith('.noodle') ? defaultName : `${defaultName}.noodle`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { success: true, filePath: defaultName };
  } catch (err: any) {
    return { success: false, error: err.message || 'Download failed' };
  }
}

/**
 * Native OS Open: Opens native Windows file dialog to select a .noodle file,
 * or falls back to HTML file picker if in web development mode.
 */
export async function openNoodleProjectNative(): Promise<{
  graph?: Graph;
  title?: string;
  filePath?: string;
  error?: string;
}> {
  if (isTauriEnv()) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readTextFile } = await import('@tauri-apps/plugin-fs');

      const selected = await open({
        title: 'Open Noodle Project',
        multiple: false,
        directory: false,
        filters: [
          {
            name: 'Noodle Project File (*.noodle)',
            extensions: ['noodle', 'json'],
          },
        ],
      });

      if (!selected || typeof selected !== 'string') {
        return {}; // User cancelled
      }

      const fileContent = await readTextFile(selected);
      const parsed = parseNoodleProject(fileContent);

      return {
        graph: parsed.graph,
        title: parsed.metadata.title,
        filePath: selected,
      };
    } catch (err: any) {
      console.error('Tauri native open failed, falling back:', err);
    }
  }

  // Web fallback: Prompt file input
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.noodle,.json';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve({});
        return;
      }

      try {
        const text = await file.text();
        const parsed = parseNoodleProject(text);
        resolve({
          graph: parsed.graph,
          title: parsed.metadata.title || file.name,
          filePath: file.name,
        });
      } catch (err: any) {
        resolve({ error: err.message || 'Failed to read file' });
      }
    };

    input.click();
  });
}
