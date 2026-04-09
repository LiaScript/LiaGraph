export const HULL_COLORS = [
  '#2E86AB', '#6A1B5A', '#2E7D32', '#A23B72',
  '#1565C0', '#4527A0', '#00695C', '#F18F01',
  '#37474F', '#558B2F', '#6D4C41', '#0277BD',
];

const nodeType = (id) => id.split(':')[0];
const getOrg = (repoId) => repoId.replace('repo:', '').split('/')[0];

/**
 * Compute org clusters from filtered + raw data.
 * Returns array of { org, members, userCount, color } sorted by member count desc.
 * Only orgs with ≥3 visible contributing users are included.
 */
export function buildOrgClusters(filteredData, rawData) {
  const visibleIds = new Set(filteredData.nodes.map((n) => n.id));

  // doc → Set<userId> from all raw contributes edges
  const docUsers = new Map();
  rawData.edges.forEach(({ source, target, edge_type }) => {
    if (edge_type !== 'contributes') return;
    const userEnd = nodeType(source) === 'user' ? source : nodeType(target) === 'user' ? target : null;
    const docEnd = ['doc', 'doc_agg'].includes(nodeType(source)) ? source
                 : ['doc', 'doc_agg'].includes(nodeType(target)) ? target : null;
    if (userEnd && docEnd) {
      if (!docUsers.has(docEnd)) docUsers.set(docEnd, new Set());
      docUsers.get(docEnd).add(userEnd);
    }
  });

  // org → Set of visible member ids
  const orgClusters = new Map();

  filteredData.nodes.forEach((n) => {
    if (nodeType(n.id) !== 'repo') return;
    const org = getOrg(n.id);
    if (!orgClusters.has(org)) orgClusters.set(org, new Set());
    orgClusters.get(org).add(n.id);

    rawData.edges.forEach(({ source, target, edge_type }) => {
      if (edge_type !== 'contains' || source !== n.id) return;
      if (nodeType(target) === 'doc_agg' && visibleIds.has(target)) {
        orgClusters.get(org).add(target);
      }
      (docUsers.get(target) || []).forEach((uid) => {
        if (visibleIds.has(uid)) orgClusters.get(org).add(uid);
      });
    });
  });

  return [...orgClusters.entries()]
    .map(([org, memberSet]) => {
      const members = [...memberSet];
      const userCount = members.filter((id) => nodeType(id) === 'user').length;
      return { org, members, userCount };
    })
    .filter(({ userCount }) => userCount >= 3)
    .sort((a, b) => b.members.length - a.members.length)
    .map(({ org, members, userCount }, i) => ({
      org,
      members,
      userCount,
      color: HULL_COLORS[i % HULL_COLORS.length],
    }));
}
