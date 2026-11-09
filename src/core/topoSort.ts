/**
 * Noodle - Topological Sort
 * 
 * Orders nodes in a directed graph so every node appears after all its dependencies.
 * Detects cycles and returns the cycle path if one exists.
 * 
 * Pure TypeScript function with zero external dependencies.
 */

import { Graph, parseSocketRef } from './graph';

export interface TopoSortResult {
  sortedNodeIds: string[];
  hasCycle: boolean;
  cyclePath: string[]; // e.g. ["n3", "n4", "n3"]
}

export function topologicalSort(graph: Graph): TopoSortResult {
  const nodeIds = graph.nodes.map((n) => n.id);
  const nodeSet = new Set(nodeIds);

  // Build adjacency list: fromNode -> Set of toNodes
  const adjacency = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  for (const id of nodeIds) {
    adjacency.set(id, new Set());
    inDegree.set(id, 0);
  }

  for (const edge of graph.edges) {
    try {
      const fromRef = parseSocketRef(edge.from);
      const toRef = parseSocketRef(edge.to);

      if (nodeSet.has(fromRef.nodeId) && nodeSet.has(toRef.nodeId)) {
        const neighbors = adjacency.get(fromRef.nodeId)!;
        if (!neighbors.has(toRef.nodeId)) {
          neighbors.add(toRef.nodeId);
          inDegree.set(toRef.nodeId, (inDegree.get(toRef.nodeId) || 0) + 1);
        }
      }
    } catch {
      // Ignore malformed edges
    }
  }

  // Kahn's algorithm for topological sorting
  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(id);
    }
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    const neighbors = adjacency.get(current);
    if (neighbors) {
      for (const neighbor of neighbors) {
        const newDeg = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) {
          queue.push(neighbor);
        }
      }
    }
  }

  if (sorted.length === nodeIds.length) {
    return {
      sortedNodeIds: sorted,
      hasCycle: false,
      cyclePath: [],
    };
  }

  // Cycle detected! Find a representative cycle path using DFS
  const visited = new Map<string, 'unvisited' | 'visiting' | 'visited'>();
  for (const id of nodeIds) {
    visited.set(id, 'unvisited');
  }

  let cyclePath: string[] = [];
  const parentMap = new Map<string, string>();

  function dfs(u: string, path: string[]): boolean {
    visited.set(u, 'visiting');
    path.push(u);

    const neighbors = adjacency.get(u) || new Set();
    for (const v of neighbors) {
      if (visited.get(v) === 'visiting') {
        // Found back-edge u -> v
        const cycleStartIndex = path.indexOf(v);
        cyclePath = [...path.slice(cycleStartIndex), v];
        return true;
      }
      if (visited.get(v) === 'unvisited') {
        parentMap.set(v, u);
        if (dfs(v, path)) return true;
      }
    }

    path.pop();
    visited.set(u, 'visited');
    return false;
  }

  for (const id of nodeIds) {
    if (visited.get(id) === 'unvisited') {
      if (dfs(id, [])) break;
    }
  }

  return {
    sortedNodeIds: [],
    hasCycle: true,
    cyclePath,
  };
}

