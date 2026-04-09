export function applyFilters(rawData, { activeTypes, minRepoCount, minBetweenness = 0, searchQuery }) {
  const visibleIds = new Set();

  const nodes = rawData.nodes.filter((n) => {
    if (!activeTypes.has(n.node_type)) return false;
    if (n.node_type === 'user' && minRepoCount > 0 && (n.repo_count || 0) < minRepoCount) return false;
    if (minBetweenness > 0 && (n.betweenness || 0) < minBetweenness) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!n.label?.toLowerCase().includes(q) && !n.id.toLowerCase().includes(q)) return false;
    }
    visibleIds.add(n.id);
    return true;
  });

  const edges = rawData.edges.filter(
    (e) => visibleIds.has(e.source) && visibleIds.has(e.target)
  );

  return { nodes, edges };
}

export function buildNeighborMap(edges) {
  const map = new Map();
  for (const e of edges) {
    if (!map.has(e.source)) map.set(e.source, new Set());
    if (!map.has(e.target)) map.set(e.target, new Set());
    map.get(e.source).add(e.target);
    map.get(e.target).add(e.source);
  }
  return map;
}
