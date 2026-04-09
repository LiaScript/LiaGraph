import { useState } from 'react';
import {
  Input,
  Slider,
  Button,
  Divider,
  Table,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Collapse,
  Tooltip,
} from 'antd';
import { AimOutlined, ReloadOutlined, GithubOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const LEGEND_ITEMS = [
  { color: '#2E86AB', label: 'User (1–3 repos)',      typeKey: 'user',    shape: 'circle'  },
  { color: '#F18F01', label: 'Super-user (>3 repos)',  typeKey: 'user',    shape: 'circle'  },
  { color: '#66BB6A', label: 'Document',               typeKey: 'doc',     shape: 'square'  },
  { color: '#2E7D32', label: 'Doc Hub (aggregated)',   typeKey: 'doc_agg', shape: 'square'  },
  { color: '#D4A0C0', label: 'Repo (1 doc)',           typeKey: 'repo',    shape: 'diamond' },
  { color: '#A23B72', label: 'Repo (2–4 docs)',        typeKey: 'repo',    shape: 'diamond' },
  { color: '#6A1B5A', label: 'Repo (5+ docs)',         typeKey: 'repo',    shape: 'diamond' },
];

const TYPE_COLORS = { user: '#2E86AB', repo: '#A23B72', doc_agg: '#2E7D32', doc: '#66BB6A' };

const TYPE_GROUPS = [
  { key: 'user',    label: 'Users',     shape: 'circle',  color: '#F18F01' },
  { key: 'repo',    label: 'Repos',     shape: 'diamond', color: '#A23B72' },
  { key: 'doc_agg', label: 'Doc Hubs',  shape: 'square',  color: '#2E7D32' },
  { key: 'doc',     label: 'Documents', shape: 'square',  color: '#66BB6A' },
];

function Swatch({ shape, color, active }) {
  const base = {
    display: 'inline-block',
    width: 11,
    height: 11,
    background: active ? color : '#d0d7de',
    flexShrink: 0,
    transition: 'background 0.15s',
  };
  if (shape === 'circle')  return <span style={{ ...base, borderRadius: '50%' }} />;
  if (shape === 'diamond') return <span style={{ ...base, transform: 'rotate(45deg)', borderRadius: 1 }} />;
  return <span style={{ ...base, borderRadius: 2 }} />;
}

export function Sidebar({
  metrics,
  dataDate,
  filteredStats,
  activeTypes,
  onTypesChange,
  showHulls,
  onHullsChange,
  orgClusters,
  activeHulls,
  onActiveHullsChange,
  minRepoCount,
  onMinRepoCountChange,
  minBetweenness,
  onMinBetweennessChange,
  onSearch,
  onSearchChange,
  searchNotFound,
  onFitView,
  onReset,
  selectedNode,
  selectedNeighbors,
  onNavigateToNode,
}) {
  const [openPanels, setOpenPanels] = useState(['legend', 'filters', 'hulls', 'bridge', 'selected']);

  const toggle = (key) => {
    const next = new Set(activeTypes);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onTypesChange(next);
  };

  const toggleHull = (org) => {
    // null means all active — initialise from full list on first toggle
    const current = activeHulls ?? new Set(orgClusters.map((c) => c.org));
    const next = new Set(current);
    if (next.has(org)) next.delete(org);
    else next.add(org);
    onActiveHullsChange(next);
  };

  const allHullsActive = activeHulls === null || orgClusters.every((c) => activeHulls.has(c.org));

  const toggleAllHulls = () => {
    if (allHullsActive) {
      onActiveHullsChange(new Set());
    } else {
      onActiveHullsChange(null);
    }
  };

  const bridgeColumns = [
    {
      title: 'User', dataIndex: 'user', key: 'user',
      render: (v) => <Text style={{ color: '#c25c00', fontSize: 11 }}>{v}</Text>,
    },
    {
      title: 'Repos', dataIndex: 'repos', key: 'repos', width: 50,
      render: (v) => <Text style={{ color: '#444', fontSize: 11 }}>{v}</Text>,
    },
    {
      title: 'BC', dataIndex: 'betweenness', key: 'betweenness', width: 65,
      render: (v) => <Text style={{ color: '#2E7D32', fontSize: 11 }}>{v?.toFixed(4)}</Text>,
    },
  ];

  return (
    <div
      style={{
        width: 300,
        height: '100vh',
        background: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        overflowY: 'auto',
        padding: '14px 13px',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Title */}
      <Title level={5} style={{ color: '#111827', marginBottom: 2, marginTop: 0 }}>
        LiaGraph
      </Title>
      <Text style={{ color: '#6b7280', fontSize: 11, marginBottom: 4 }}>
        Community Explorer
      </Text>
      {dataDate && (
        <Text style={{ color: '#9ca3af', fontSize: 10, marginBottom: 10, display: 'block' }}>
          Data: {dataDate.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </Text>
      )}

      <Divider style={{ borderColor: '#e5e7eb', margin: '6px 0 10px' }} />

      {/* Search */}
      <Text style={{ color: '#6b7280', fontSize: 10, letterSpacing: '0.05em', marginBottom: 5, display: 'block' }}>
        SEARCH
      </Text>
      <Input.Search
        placeholder="Find node by name…"
        onSearch={onSearch}
        onChange={() => searchNotFound && onSearchChange()}
        allowClear
        style={{ marginBottom: searchNotFound ? 4 : 10 }}
        size="small"
        status={searchNotFound ? 'error' : ''}
      />
      {searchNotFound && (
        <Text style={{ color: '#dc2626', fontSize: 11, marginBottom: 10, display: 'block' }}>
          No matching node found in current view.
        </Text>
      )}

      {/* Actions */}
      <Space size={6} style={{ marginBottom: 12 }}>
        <Button size="small" icon={<AimOutlined />} onClick={onFitView}>
          Fit View
        </Button>
        <Button size="small" icon={<ReloadOutlined />} onClick={onReset}>
          Reset
        </Button>
      </Space>

      <Divider style={{ borderColor: '#e5e7eb', margin: '4px 0 10px' }} />

      {/* Min Repos Slider */}
      <Text style={{ color: '#6b7280', fontSize: 10, letterSpacing: '0.05em', marginBottom: 2, display: 'block' }}>
        MIN REPOS (users): {minRepoCount}
      </Text>
      <Text style={{ color: '#9ca3af', fontSize: 10, marginBottom: 4, display: 'block' }}>
        Show users contributing to ≥ {minRepoCount} repo{minRepoCount !== 1 ? 's' : ''}
      </Text>
      <Slider
        min={0}
        max={20}
        value={minRepoCount}
        onChange={onMinRepoCountChange}
        style={{ marginBottom: 12 }}
      />

      {/* Min Betweenness Slider */}
      <Text style={{ color: '#6b7280', fontSize: 10, letterSpacing: '0.05em', marginBottom: 2, display: 'block' }}>
        MIN BETWEENNESS: {minBetweenness.toFixed(4)}
      </Text>
      <Text style={{ color: '#9ca3af', fontSize: 10, marginBottom: 4, display: 'block' }}>
        Show only nodes with centrality ≥ {minBetweenness.toFixed(4)}
      </Text>
      <Slider
        min={0}
        max={0.05}
        step={0.001}
        value={minBetweenness}
        onChange={onMinBetweennessChange}
        style={{ marginBottom: 12 }}
      />

      <Divider style={{ borderColor: '#e5e7eb', margin: '4px 0 10px' }} />

      {/* Stats */}
      <Text style={{ color: '#6b7280', fontSize: 10, letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>
        GRAPH STATS
      </Text>
      <Row gutter={[6, 6]} style={{ marginBottom: 6 }}>
        {[
          { label: 'Nodes',      value: filteredStats?.nodeCount },
          { label: 'Edges',      value: filteredStats?.edgeCount },
          { label: 'Components', value: metrics?.total_components },
          { label: 'Multi-repo', value: metrics?.multi_repo_users },
        ].map(({ label, value }) => (
          <Col span={12} key={label}>
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 9px' }}>
              <div style={{ color: '#9ca3af', fontSize: 10 }}>{label}</div>
              <div style={{ color: '#111827', fontSize: 17, fontWeight: 600 }}>{value ?? '—'}</div>
            </div>
          </Col>
        ))}
      </Row>
      {metrics?.largest_component_pct != null && (
        <Text style={{ color: '#9ca3af', fontSize: 10, marginBottom: 6, display: 'block' }}>
          Largest component: {metrics.largest_component_size} nodes ({metrics.largest_component_pct.toFixed(1)}%)
        </Text>
      )}

      <Divider style={{ borderColor: '#e5e7eb', margin: '6px 0 10px' }} />

      {/* Collapsible: Legend, Bridge Users & Selected Node */}
      <Collapse
        ghost
        size="small"
        activeKey={openPanels}
        onChange={setOpenPanels}
        style={{ background: 'transparent' }}
        items={[
          ...(selectedNode ? [{
            key: 'selected',
            label: <Text style={{ color: '#6b7280', fontSize: 10, letterSpacing: '0.05em' }}>SELECTED NODE</Text>,
            children: (
              <>
                <div
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderLeft: `3px solid ${selectedNode.color || '#F18F01'}`,
                    borderRadius: 6,
                    padding: '9px 11px',
                    marginBottom: 10,
                  }}
                >
                  <Text strong style={{ color: '#111827', fontSize: 12, display: 'block', marginBottom: 3 }}>
                    {selectedNode.label || selectedNode.id}
                  </Text>
                  <Tag color="blue" style={{ fontSize: 10, marginBottom: 5, display: 'block', width: 'fit-content' }}>
                    {selectedNode.node_type}
                  </Tag>
                  {(() => {
                    const { node_type, label, repo_key, id, default_branch } = selectedNode;
                    const slug = node_type === 'user' ? label
                      : node_type === 'repo' ? label
                      : (node_type === 'doc_agg' || node_type === 'doc') ? repo_key
                      : null;
                    if (!slug) return null;

                    // LiaScript link — for doc: extract full path from id (doc:owner/repo/path.md)
                    // for repo/doc_agg: link to the repo's README.md
                    let liascriptUrl = null;
                    if (node_type === 'doc') {
                      const path = id.replace(/^doc:/, '');
                      // path is owner/repo/...file.md
                      const parts = path.split('/');
                      const owner = parts[0];
                      const repo = parts[1];
                      const filePath = parts.slice(2).join('/');
                      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${default_branch}/${filePath}`;
                      liascriptUrl = `https://liascript.github.io/course/?${rawUrl}`;
                    } else if (node_type === 'repo' || node_type === 'doc_agg') {
                      const rawUrl = `https://raw.githubusercontent.com/${slug}/${default_branch}/README.md`;
                      liascriptUrl = `https://liascript.github.io/course/?${rawUrl}`;
                    }

                    return (
                      <Space size={8} style={{ marginBottom: 6 }}>
                        <Tooltip title="Open in GitHub">
                          <a href={`https://github.com/${slug}`} target="_blank" rel="noreferrer" style={{ color: '#2E86AB', fontSize: 18, lineHeight: 1 }}>
                            <GithubOutlined />
                          </a>
                        </Tooltip>
                        {liascriptUrl && (
                          <Tooltip title="Open in LiaScript">
                            <a href={liascriptUrl} target="_blank" rel="noreferrer" style={{ lineHeight: 1, display: 'inline-flex' }}>
                              <img src={`${import.meta.env.BASE_URL}lia_icon.png`} alt="LiaScript" style={{ width: 18, height: 18 }} />
                            </a>
                          </Tooltip>
                        )}
                      </Space>
                    );
                  })()}
                  {selectedNode.node_type === 'user' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Text style={{ color: '#6b7280', fontSize: 11 }}>Repos: <span style={{ color: '#111827' }}>{selectedNode.repo_count}</span></Text>
                      <Text style={{ color: '#6b7280', fontSize: 11 }}>Courses: <span style={{ color: '#111827' }}>{selectedNode.course_count}</span></Text>
                      <Text style={{ color: '#6b7280', fontSize: 11 }}>Betweenness: <span style={{ color: '#2E7D32' }}>{selectedNode.betweenness?.toFixed(4)}</span></Text>
                    </div>
                  )}
                  {selectedNode.node_type === 'repo' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Text style={{ color: '#6b7280', fontSize: 11 }}>Courses: <span style={{ color: '#111827' }}>{selectedNode.course_count}</span></Text>
                      <Text style={{ color: '#6b7280', fontSize: 11 }}>Contributors: <span style={{ color: '#111827' }}>{selectedNode.contributor_count}</span></Text>
                      {selectedNode.betweenness > 0 && <Text style={{ color: '#6b7280', fontSize: 11 }}>Betweenness: <span style={{ color: '#2E7D32' }}>{selectedNode.betweenness?.toFixed(4)}</span></Text>}
                    </div>
                  )}
                  {(selectedNode.node_type === 'doc' || selectedNode.node_type === 'doc_agg') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Text style={{ color: '#6b7280', fontSize: 11, wordBreak: 'break-all' }}>Repo: <span style={{ color: '#111827' }}>{selectedNode.repo_key}</span></Text>
                      {selectedNode.doc_count && <Text style={{ color: '#6b7280', fontSize: 11 }}>Docs: <span style={{ color: '#111827' }}>{selectedNode.doc_count}</span></Text>}
                    </div>
                  )}
                </div>
                {selectedNeighbors?.length > 0 && (
                  <>
                    <Text style={{ color: '#6b7280', fontSize: 10, letterSpacing: '0.05em', marginBottom: 4, display: 'block' }}>
                      CONNECTIONS ({selectedNeighbors.length})
                    </Text>
                    <div
                      style={{
                        maxHeight: 180,
                        overflowY: 'auto',
                        marginBottom: 10,
                        border: '1px solid #e5e7eb',
                        borderRadius: 6,
                        background: '#f9fafb',
                      }}
                    >
                      {selectedNeighbors.map((n) => {
                        return (
                          <div
                            key={n.id}
                            onClick={() => onNavigateToNode(n)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '5px 9px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f0f0f0',
                              transition: 'background 0.1s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#e8f4fd')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: n.node_type === 'user' ? '50%' : 1,
                                transform: n.node_type === 'repo' ? 'rotate(45deg)' : undefined,
                                background: TYPE_COLORS[n.node_type] || '#999',
                                flexShrink: 0,
                              }}
                            />
                            <Text style={{ color: '#374151', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {n.label || n.id}
                            </Text>
                            <Tag style={{ fontSize: 9, lineHeight: '14px', padding: '0 4px', margin: 0 }} color={TYPE_COLORS[n.node_type]}>
                              {n.node_type}
                            </Tag>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            ),
          }] : []),
          {
            key: 'legend',
            label: <Text style={{ color: '#6b7280', fontSize: 10, letterSpacing: '0.05em' }}>LEGEND</Text>,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: 4 }}>
                {LEGEND_ITEMS.map(({ color, label, shape, typeKey }) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      opacity: activeTypes.has(typeKey) ? 1 : 0.3,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <Swatch shape={shape} color={color} active={activeTypes.has(typeKey)} />
                    <Text style={{ color: '#6b7280', fontSize: 10 }}>{label}</Text>
                  </div>
                ))}
                <div style={{ height: 4 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 20, height: 1.5, background: '#aaa', display: 'inline-block', flexShrink: 0 }} />
                  <Text style={{ color: '#9ca3af', fontSize: 10 }}>contributes edge</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 20, borderTop: '1.5px dashed #aaa', display: 'inline-block', flexShrink: 0 }} />
                  <Text style={{ color: '#9ca3af', fontSize: 10 }}>contains edge (dashed)</Text>
                </div>
              </div>
            ),
          },
          {
            key: 'filters',
            label: <Text style={{ color: '#6b7280', fontSize: 10, letterSpacing: '0.05em' }}>FILTERS</Text>,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: 4 }}>
                <Text style={{ color: '#9ca3af', fontSize: 10, marginBottom: 4, display: 'block' }}>
                  Click to toggle visibility
                </Text>
                {TYPE_GROUPS.map(({ key, label, shape, color }) => {
                  const active = activeTypes.has(key);
                  return (
                    <div
                      key={key}
                      onClick={() => toggle(key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        cursor: 'pointer', padding: '3px 4px', borderRadius: 4,
                        background: active ? '#f0f9ff' : 'transparent',
                        opacity: active ? 1 : 0.45,
                        transition: 'opacity 0.15s, background 0.15s',
                        userSelect: 'none',
                      }}
                    >
                      <Swatch shape={shape} color={color} active={active} />
                      <Text style={{ color: active ? '#374151' : '#9ca3af', fontSize: 11, transition: 'color 0.15s' }}>
                        {label}
                      </Text>
                    </div>
                  );
                })}
                <div
                  onClick={() => onHullsChange(!showHulls)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    cursor: 'pointer', padding: '3px 4px', borderRadius: 4,
                    background: showHulls ? '#f0f9ff' : 'transparent',
                    opacity: showHulls ? 1 : 0.45,
                    transition: 'opacity 0.15s, background 0.15s',
                    userSelect: 'none',
                  }}
                >
                  <span style={{
                    width: 11, height: 11, flexShrink: 0,
                    border: `1.5px dashed ${showHulls ? '#2E86AB' : '#d0d7de'}`,
                    borderRadius: 3,
                    transition: 'border-color 0.15s',
                  }} />
                  <Text style={{ color: showHulls ? '#374151' : '#9ca3af', fontSize: 11, transition: 'color 0.15s' }}>
                    Org Clusters (Hulls)
                  </Text>
                </div>
              </div>
            ),
          },
          ...(showHulls && orgClusters.length > 0 ? [{
            key: 'hulls',
            label: <Text style={{ color: '#6b7280', fontSize: 10, letterSpacing: '0.05em' }}>ORG CLUSTERS ({orgClusters.length})</Text>,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 4 }}>
                {/* All toggle */}
                <div
                  onClick={toggleAllHulls}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    cursor: 'pointer', padding: '3px 4px', borderRadius: 4,
                    marginBottom: 2,
                    background: allHullsActive ? '#f0f9ff' : 'transparent',
                    userSelect: 'none',
                  }}
                >
                  <span style={{
                    width: 11, height: 11, flexShrink: 0,
                    border: `1.5px dashed ${allHullsActive ? '#2E86AB' : '#d0d7de'}`,
                    borderRadius: 3,
                  }} />
                  <Text style={{ color: allHullsActive ? '#374151' : '#9ca3af', fontSize: 11, fontWeight: 500 }}>
                    {allHullsActive ? 'Hide all' : 'Show all'}
                  </Text>
                </div>
                {orgClusters.map(({ org, userCount, color }) => {
                  const active = activeHulls === null || activeHulls.has(org);
                  return (
                    <div
                      key={org}
                      onClick={() => toggleHull(org)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        cursor: 'pointer', padding: '3px 4px', borderRadius: 4,
                        opacity: active ? 1 : 0.4,
                        transition: 'opacity 0.15s',
                        userSelect: 'none',
                      }}
                    >
                      <span style={{
                        width: 11, height: 11, flexShrink: 0, borderRadius: 2,
                        background: color, opacity: 0.7,
                      }} />
                      <Text style={{ color: '#374151', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {org}
                      </Text>
                      <Text style={{ color: '#9ca3af', fontSize: 10 }}>{userCount} users</Text>
                    </div>
                  );
                })}
              </div>
            ),
          }] : []),
          {
            key: 'bridge',
            label: <Text style={{ color: '#6b7280', fontSize: 10, letterSpacing: '0.05em' }}>TOP BRIDGE USERS</Text>,
            children: (
              <Table
                dataSource={(metrics?.top_bridge_users || []).slice(0, 15).map((u, i) => ({ ...u, key: i }))}
                columns={bridgeColumns}
                size="small"
                pagination={false}
                onRow={(record) => ({
                  onClick: () => onNavigateToNode({ id: `user:${record.user}` }),
                  style: { cursor: 'pointer' },
                })}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
