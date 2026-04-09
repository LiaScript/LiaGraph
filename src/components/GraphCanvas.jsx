import { useEffect, useRef } from 'react';
import { Graph } from '@antv/g6';
import { getNodeColor } from '../utils/graphTransform';

// ── Hull plugin builder ────────────────────────────────────────────────────────
function buildHullPlugins(orgClusters, showHulls, activeHulls) {
  if (!showHulls) return [];
  return orgClusters
    .filter(({ org }) => !activeHulls || activeHulls.has(org))
    .map(({ org, members, color }) => ({
      type: 'hull',
      key: `hull-${org}`,
      members,
      padding: 22,
      fill: color,
      fillOpacity: 0.06,
      stroke: color,
      strokeOpacity: 0.2,
      lineWidth: 1.5,
      lineDash: [4, 4],
    }));
}

// ── Graph factory ────────────────────────────────────────────────────────────

function createGraph({ container, data, hullPlugins }) {
  return new Graph({
    container,
    width: container.offsetWidth,
    height: container.offsetHeight,
    autoFit: 'view',
    zoomRange: [0.1, 5],
    animation: false,
    data,
    layout: {
      type: 'd3-force',
      animation: false,
      link: { distance: 100, strength: 0.2 },
      manyBody: { strength: -250 },
      collide: { radius: 28, strength: 0.8 },
    },
    theme: 'light',
    background: '#fafafa',
    node: {
      type: (d) => {
        const t = d.data?.node_type;
        if (t === 'repo') return 'diamond';
        if (t === 'doc' || t === 'doc_agg') return 'rect';
        return 'circle';
      },
      style: {
        size: (d) => (d.data?.size || 10),
        fill: (d) => getNodeColor(d.data || {}),
        stroke: '#ffffff',
        lineWidth: 1.5,
        opacity: 1,
        labelText: (d) => (d.data?.node_type === 'doc' ? '' : d.data?.label || ''),
        labelFill: '#374151',
        labelFontSize: 10,
        labelPlacement: 'bottom',
        labelBackground: false,
      },
      state: {
        highlight: { lineWidth: 3, stroke: '#d97706', opacity: 1, labelFill: '#111827', labelFontSize: 12 },
        dim: { opacity: 0.12 },
      },
    },
    edge: {
      type: 'quadratic',
      style: {
        stroke: (d) => (d.data?.edge_type === 'contains' ? '#b0a0b8' : '#c8b8d0'),
        lineWidth: 0.8,
        opacity: 0.7,
        lineDash: (d) => (d.data?.edge_type === 'contains' ? [4, 3] : [0, 0]),
        curveOffset: 20,
      },
      state: {
        highlight: { stroke: '#d97706', lineWidth: 2, opacity: 1 },
        dim: { opacity: 0.06 },
      },
    },
    behaviors: [
      { type: 'zoom-canvas' },
      { type: 'drag-canvas' },
      { type: 'drag-element' },
      { type: 'optimize-viewport-transform', key: 'opt' },
    ],
    plugins: [
      { type: 'minimap', key: 'minimap', size: [160, 90] },
      {
        type: 'tooltip',
        key: 'tooltip',
        trigger: 'pointerenter',
        getContent: (_evt, items) => {
          if (!items?.length) return '';
          const d = items[0]?.data || {};
          const lines = [
            `<strong style="color:#e6edf3">${d.label || items[0]?.id}</strong>`,
            `<span style="color:#8b949e;font-size:11px">Type: ${d.node_type}</span>`,
          ];
          if (d.node_type === 'user') {
            lines.push(`<span style="color:#8b949e;font-size:11px">Repos: ${d.repo_count ?? '—'} | Courses: ${d.course_count ?? '—'}</span>`);
            if (d.betweenness) lines.push(`<span style="color:#66BB6A;font-size:11px">Betweenness: ${d.betweenness.toFixed(4)}</span>`);
          }
          if (d.node_type === 'repo')
            lines.push(`<span style="color:#8b949e;font-size:11px">Courses: ${d.course_count ?? '—'} | Contributors: ${d.contributor_count ?? '—'}</span>`);
          if (d.node_type === 'doc_agg')
            lines.push(`<span style="color:#8b949e;font-size:11px">Docs: ${d.doc_count ?? '—'} | Repo: ${d.repo_key}</span>`);
          return `<div style="background:#161b22;border:1px solid #30363d;border-radius:6px;padding:8px 10px;max-width:220px;line-height:1.6">${lines.join('<br/>')}</div>`;
        },
      },
      ...hullPlugins,
    ],
  });
}

// ── Edge stable ID ───────────────────────────────────────────────────────────

function edgeId(e) {
  return `edge-${e.source}__${e.target}__${e.edge_type || ''}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export function GraphCanvas({ rawData, filteredData, orgClusters, showHulls, activeHulls, neighborMap, onNodeClick, onCanvasClick, graphRef }) {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);
  const isRenderedRef = useRef(false);
  const roRef = useRef(null);
  const callbacksRef = useRef({ neighborMap, onNodeClick, onCanvasClick });
  callbacksRef.current = { neighborMap, onNodeClick, onCanvasClick };

  // ── Create graph once on mount, load data when ready ─────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const graph = createGraph({ container, data: { nodes: [], edges: [] }, hullPlugins: [] });

    const handleNodeClick = async (evt) => {
      const nodeId = evt.target?.id;
      if (!nodeId) return;
      const nodeData = graph.getNodeData(nodeId);
      if (!nodeData) return;
      if (graph.getElementVisibility(nodeId) === 'hidden') return;

      const neighbors = callbacksRef.current.neighborMap?.get(nodeId) || new Set();
      const stateMap = {};
      graph.getNodeData().forEach((n) => {
        if (graph.getElementVisibility(n.id) === 'hidden') return;
        stateMap[n.id] = n.id === nodeId || neighbors.has(n.id) ? ['highlight'] : ['dim'];
      });
      graph.getRelatedEdgesData(nodeId).forEach((e) => {
        if (graph.getElementVisibility(e.id) === 'hidden') return;
        stateMap[e.id] = ['highlight'];
      });
      // dim edges not connected to the clicked node
      graph.getEdgeData().forEach((e) => {
        if (graph.getElementVisibility(e.id) === 'hidden') return;
        if (!stateMap[e.id]) stateMap[e.id] = ['dim'];
      });
      await graph.setElementState(stateMap);

      if (callbacksRef.current.onNodeClick) callbacksRef.current.onNodeClick(nodeData?.data || {});
    };

    const handleCanvasClick = async () => {
      const stateMap = {};
      graph.getNodeData().forEach((n) => { stateMap[n.id] = []; });
      graph.getEdgeData().forEach((e) => { stateMap[e.id] = []; });
      await graph.setElementState(stateMap);
      if (callbacksRef.current.onCanvasClick) callbacksRef.current.onCanvasClick();
    };

    graph.on('node:click', handleNodeClick);
    graph.on('canvas:click', handleCanvasClick);

    graph.render();
    instanceRef.current = graph;
    if (graphRef) graphRef.current = graph;

    const ro = new ResizeObserver(() => {
      if (!instanceRef.current) return;
      instanceRef.current.setSize(container.offsetWidth, container.offsetHeight);
    });
    ro.observe(container);
    roRef.current = ro;

    return () => {
      if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
      try {
        graph.off('node:click', handleNodeClick);
        graph.off('canvas:click', handleCanvasClick);
        graph.destroy();
      } catch (e) { console.warn('Graph destroy failed:', e); }
      instanceRef.current = null;
      if (graphRef) graphRef.current = null;
    };
  }, []);

  // ── Load all rawData once, then immediately apply initial visibility ──────────
  useEffect(() => {
    const graph = instanceRef.current;
    if (!graph || !rawData || !filteredData || graph.getNodeData().length > 0) return;

    const nodes = rawData.nodes.map((n) => ({ id: n.id, data: { ...n } }));
    const edges = rawData.edges.map((e) => ({
      id: edgeId(e),
      source: e.source,
      target: e.target,
      data: { edge_type: e.edge_type },
    }));

    const visibleNodeIds = new Set(filteredData.nodes.map((n) => n.id));
    const visibleEdgeIds = new Set(filteredData.edges.map((e) => edgeId(e)));

    isRenderedRef.current = false;
    graph.addData({ nodes, edges });
    graph.render().then(() => {
      graph.setOptions({ layout: { type: 'preset' } });
      graph.fitView();
      // Apply visibility after render so doc nodes are hidden from the start
      const visibilityMap = {};
      graph.getNodeData().forEach((n) => {
        visibilityMap[n.id] = visibleNodeIds.has(n.id) ? 'visible' : 'hidden';
      });
      graph.getEdgeData().forEach((e) => {
        visibilityMap[e.id] = visibleEdgeIds.has(e.id) ? 'visible' : 'hidden';
      });
      graph.setElementVisibility(visibilityMap, false).then(() => {
        // Build hulls for initial filtered view
        const hullPlugins = buildHullPlugins(orgClusters, showHulls, activeHulls);
        if (hullPlugins.length) {
          graph.setPlugins((existing) => [
            ...existing.filter((p) => !p.key?.startsWith('hull-')),
            ...hullPlugins,
          ]);
          graph.render();
        }
        isRenderedRef.current = true;
      });
    });
  }, [rawData]);

  // ── Filter + hull changes: update visibility and rebuild hulls atomically ───
  useEffect(() => {
    const graph = instanceRef.current;
    if (!graph || !filteredData || !rawData) return;
    if (graph.getNodeData().length === 0 || !isRenderedRef.current) return;

    const filteredNodeIds = new Set(filteredData.nodes.map((n) => n.id));
    const filteredEdgeIds = new Set(filteredData.edges.map((e) => edgeId(e)));

    const visibilityMap = {};
    graph.getNodeData().forEach((n) => {
      visibilityMap[n.id] = filteredNodeIds.has(n.id) ? 'visible' : 'hidden';
    });
    graph.getEdgeData().forEach((e) => {
      visibilityMap[e.id] = filteredEdgeIds.has(e.id) ? 'visible' : 'hidden';
    });

    const hullPlugins = buildHullPlugins(orgClusters, showHulls, activeHulls);
    graph.setElementVisibility(visibilityMap, false);
    graph.setPlugins((existing) => [
      ...existing.filter((p) => !p.key?.startsWith('hull-')),
      ...hullPlugins,
    ]);
    graph.render();
  }, [filteredData, orgClusters, showHulls, rawData, activeHulls]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: '#fafafa', position: 'relative' }}
    />
  );
}
