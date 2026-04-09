# LiaGraph

An interactive network graph explorer for the LiaScript open-source community. Visualizes relationships between contributors, repositories, and documents as a force-directed graph.

## What it shows

The graph maps the LiaScript ecosystem across four node types:

| Shape | Color | Meaning |
|-------|-------|---------|
| Circle | Blue `#2E86AB` | User (1–3 repos) |
| Circle | Orange `#F18F01` | Super-user (>3 repos) |
| Diamond | Pink → Purple | Repository (scaled by doc count) |
| Square | Green | Document / Doc Hub |

Edges connect users to the documents they contribute to (`contributes`) and repositories to their documents (`contains`, dashed).

Org clusters (hulls) group contributors by GitHub organization.

## Features

- **Force-directed layout** — nodes repel each other and edges act like springs, producing an organic layout where highly connected nodes naturally cluster together (powered by [D3-force](https://github.com/d3/d3-force))
- **Filter panel** — toggle node types, filter by minimum repo count, or filter by minimum betweenness centrality (see [Glossary](#glossary))
- **Org cluster toggles** — show/hide individual organization hulls (convex shapes drawn around all members of a GitHub org)
- **Node search** — find and focus any visible node by name
- **Click to inspect** — select a node to see its details and connections in the sidebar
- **Top bridge users** — contributors ranked by betweenness centrality, highlighting the people most critical to the network's connectivity
- **Minimap** — navigate large graphs

## Stack

- [React 19](https://react.dev) + [Vite](https://vitejs.dev)
- [AntV G6 v5](https://g6.antv.antgroup.com) — graph visualization
- [Ant Design](https://ant.design) — UI components

## Getting started

```bash
npm install
npm run dev
```

The app reads graph data from `public/graph.json`. To regenerate this file from the LiaScript GitHub data, run the data pipeline separately.

## Project structure

```
src/
├── App.jsx                  # State management, filtering, layout
├── components/
│   ├── GraphCanvas.jsx      # AntV G6 graph instance and rendering
│   └── Sidebar.jsx          # Filters, legend, search, node details
├── hooks/
│   └── useGraphData.js      # Fetches public/graph.json
└── utils/
    ├── filterGraph.js       # Node/edge filter logic
    ├── graphTransform.js    # Node color mapping
    └── hullUtils.js         # Org cluster computation
```

## Glossary

**Betweenness centrality** — a measure of how often a node acts as a bridge on the shortest path between two other nodes. A user with high betweenness connects otherwise separate parts of the community; removing them would fragment the network.

**D3-force** — a physics simulation that models nodes as charged particles and edges as springs. Nodes repel each other while edges pull connected nodes together, converging to a stable layout that reveals natural clusters.

**Doc Hub (`doc_agg`)** — an aggregated node representing all documents in a repository, used instead of showing every individual document to keep the graph readable.

**Hull** — a convex shape drawn around all visible members of a GitHub organization, making it easy to see which contributors and repositories belong to the same org.

**Super-user** — a contributor who has authored content in more than 3 repositories, indicating broad involvement across the community.

## Data format

`public/graph.json` contains:

```json
{
  "nodes": [{ "id": "user:username", "node_type": "user", "repo_count": 2, ... }],
  "edges": [{ "source": "user:x", "target": "doc_agg:org/repo", "edge_type": "contributes" }],
  "metrics": { "top_bridge_users": [...], "total_components": 12, ... }
}
```
