export function getNodeColor(node) {
  const { node_type, repo_count, doc_count, color } = node;
  if (color) return color;

  switch (node_type) {
    case 'user':
      return repo_count > 3 ? '#F18F01' : '#2E86AB';
    case 'repo': {
      const dc = doc_count || 0;
      if (dc >= 5) return '#6A1B5A';
      if (dc >= 2) return '#A23B72';
      return '#D4A0C0';
    }
    case 'doc_agg':
      return '#2E7D32';
    case 'doc':
      return '#66BB6A';
    default:
      return '#999';
  }
}
