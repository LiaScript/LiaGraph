import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { ConfigProvider, theme, Spin } from 'antd';
import { useGraphData } from './hooks/useGraphData';
import { applyFilters, buildNeighborMap } from './utils/filterGraph';
import { buildOrgClusters } from './utils/hullUtils';
import { GraphCanvas } from './components/GraphCanvas';
import { Sidebar } from './components/Sidebar';

// Doc nodes hidden by default
const DEFAULT_TYPES = new Set(['user', 'repo', 'doc_agg']);

export default function App() {
  const { rawData, loading, error } = useGraphData();
  const graphRef = useRef(null);

  const [activeTypes, setActiveTypes] = useState(DEFAULT_TYPES);
  const [showHulls, setShowHulls] = useState(true);
  const [activeHulls, setActiveHulls] = useState(null); // null = all active
  const [minRepoCount, setMinRepoCount] = useState(0);
  const [minBetweenness, setMinBetweenness] = useState(0);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchNotFound, setSearchNotFound] = useState(false);

  const filteredData = useMemo(() => {
    if (!rawData) return null;
    return applyFilters(rawData, { activeTypes, minRepoCount, minBetweenness, searchQuery: '' });
  }, [rawData, activeTypes, minRepoCount, minBetweenness]);

  const filteredStats = useMemo(() => {
    if (!filteredData) return null;
    return { nodeCount: filteredData.nodes.length, edgeCount: filteredData.edges.length };
  }, [filteredData]);

  const orgClusters = useMemo(() => {
    if (!filteredData || !rawData) return [];
    return buildOrgClusters(filteredData, rawData);
  }, [filteredData, rawData]);

  // Build neighbor map + node lookup from raw data for the detail panel
  const neighborMap = useMemo(() => {
    if (!rawData) return null;
    return buildNeighborMap(rawData.edges);
  }, [rawData]);

  const nodeById = useMemo(() => {
    if (!rawData) return new Map();
    return new Map(rawData.nodes.map((n) => [n.id, n]));
  }, [rawData]);

  const selectedNeighbors = useMemo(() => {
    if (!selectedNode || !neighborMap || !nodeById) return [];
    const ids = neighborMap.get(selectedNode.id);
    if (!ids) return [];
    return [...ids]
      .map((id) => nodeById.get(id))
      .filter(Boolean)
      .sort((a, b) => (b.betweenness || 0) - (a.betweenness || 0));
  }, [selectedNode, neighborMap, nodeById]);

  const handleNavigateToNode = useCallback(
    (node) => {
      const fullNode = nodeById.get(node.id) || node;
      setSelectedNode(fullNode);
      const graph = graphRef.current;
      if (!graph) return;
      // Highlight the node + its neighbors
      const neighbors = neighborMap?.get(node.id) || new Set();
      try {
        const stateMap = {};
        graph.getNodeData().forEach((n) => {
          stateMap[n.id] = n.id === node.id || neighbors.has(n.id) ? ['highlight'] : ['dim'];
        });
        graph.getEdgeData().forEach((e) => {
          stateMap[e.id] = e.source === node.id || e.target === node.id ? ['highlight'] : ['dim'];
        });
        graph.setElementState(stateMap).then(() => {
          graph.zoomTo(0.5, { duration: 400, easing: 'ease-in-out' }).then(() => {
            graph.focusElement(node.id, { duration: 400, easing: 'ease-in-out' });
          });
        });
      } catch (e) { console.warn('Graph highlight failed:', e); }
    },
    [neighborMap, nodeById]
  );

  // Search: focus node on the canvas (search visible nodes in the graph)
  const handleSearch = useCallback(
    (query) => {
      if (!query || !graphRef.current || !filteredData) return;
      const q = query.toLowerCase();
      const match = filteredData.nodes.find(
        (n) => n.label?.toLowerCase() === q || n.id.toLowerCase() === q
      );
      if (!match) {
        setSearchNotFound(true);
        return;
      }
      setSearchNotFound(false);
      const graph = graphRef.current;
      try {
        graph.zoomTo(1.8, { duration: 400, easing: 'ease-in-out' }).then(() => {
          graph.focusElement(match.id, { duration: 400, easing: 'ease-in-out' });
        });
      } catch (e) { console.warn('Graph focus failed:', e); }
    },
    [filteredData]
  );

  // Escape key: clear selection + reset highlight/dim states
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      setSelectedNode(null);
      const graph = graphRef.current;
      if (!graph) return;
      try {
        const stateMap = {};
        graph.getNodeData().forEach((n) => { stateMap[n.id] = []; });
        graph.getEdgeData().forEach((e) => { stateMap[e.id] = []; });
        graph.setElementState(stateMap);
      } catch (e) { console.warn('Graph state reset failed:', e); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleFitView = useCallback(() => {
    graphRef.current?.fitView({ padding: 20 });
  }, []);

  const handleReset = useCallback(() => {
    setActiveTypes(new Set(DEFAULT_TYPES));
    setMinRepoCount(0);
    setMinBetweenness(0);
    setSelectedNode(null);
    setActiveHulls(null);
    const graph = graphRef.current;
    if (graph) {
      const stateMap = {};
      graph.getNodeData().forEach((n) => { stateMap[n.id] = []; });
      graph.getEdgeData().forEach((e) => { stateMap[e.id] = []; });
      graph.setElementState(stateMap).then(() => graph.fitView({ padding: 20 }));
    }
  }, []);

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f3f4f6', color: '#dc2626' }}>
        Error loading graph data: {error}
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2E86AB',
          colorBgContainer: '#ffffff',
          colorBorder: '#e5e7eb',
          colorText: '#111827',
          borderRadius: 6,
        },
      }}
    >
      <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
        <Sidebar
          metrics={rawData?.metrics}
          dataDate={rawData?.data_date}
          filteredStats={filteredStats}
          activeTypes={activeTypes}
          onTypesChange={setActiveTypes}
          showHulls={showHulls}
          onHullsChange={setShowHulls}
          orgClusters={orgClusters}
          activeHulls={activeHulls}
          onActiveHullsChange={setActiveHulls}
          minRepoCount={minRepoCount}
          onMinRepoCountChange={setMinRepoCount}
          minBetweenness={minBetweenness}
          onMinBetweennessChange={setMinBetweenness}
          onSearch={handleSearch}
          searchNotFound={searchNotFound}
          onSearchChange={() => setSearchNotFound(false)}
          onFitView={handleFitView}
          onReset={handleReset}
          selectedNode={selectedNode}
          selectedNeighbors={selectedNeighbors}
          onNavigateToNode={handleNavigateToNode}
        />

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', zIndex: 10 }}>
              <Spin size="large" />
            </div>
          )}

          {rawData && (
            <GraphCanvas
              rawData={rawData}
              filteredData={filteredData}
              orgClusters={orgClusters}
              showHulls={showHulls}
              activeHulls={activeHulls}
              neighborMap={neighborMap}
              onNodeClick={setSelectedNode}
              onCanvasClick={() => setSelectedNode(null)}
              graphRef={graphRef}
            />
          )}
        </div>
      </div>
    </ConfigProvider>
  );
}
