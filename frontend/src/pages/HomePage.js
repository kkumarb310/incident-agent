import { useState, useEffect, useCallback } from 'react';
import { getMetrics, getIncidents } from '../api';

const REFRESH_MS = 30000;

function getLocalHistory() {
  try { return JSON.parse(localStorage.getItem('incident_history') || '[]'); }
  catch { return []; }
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function topServices(history) {
  const c = {};
  history.forEach(i => (i.services || []).forEach(s => { c[s] = (c[s] || 0) + 1; }));
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6);
}

function trendArrow(recent, prev, key, lowerIsBetter = false) {
  if (recent.length < 2 || prev.length < 2) return null;
  const avg = arr => arr.reduce((s, i) => s + (i[key] || 0), 0) / arr.length;
  const diff = avg(recent) - avg(prev);
  if (Math.abs(diff) < 0.001) return null;
  const up = diff > 0;
  const good = lowerIsBetter ? !up : up;
  return { arrow: up ? '↑' : '↓', good };
}

function mergeHistory(backendRows, localEntries) {
  const localMap = {};
  localEntries.forEach(e => { localMap[e.id] = e; });

  const fromBackend = backendRows.map(r => ({
    id:        r.request_id,
    title:     r.incident_title,
    severity:  r.severity,
    date:      r.timestamp,
    evalScore: r.eval_score,
    latency:   r.latency_ms,
    services:  localMap[r.request_id]?.services || [],
    result:    localMap[r.request_id]?.result   || null,
  }));

  const backendIds = new Set(backendRows.map(r => r.request_id));
  const localOnly  = localEntries.filter(e => !backendIds.has(e.id));

  return [...fromBackend, ...localOnly]
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export default function HomePage({ onNavigate }) {
  const [metrics,    setMetrics]    = useState(null);
  const [history,    setHistory]    = useState([]);
  const [drawerItem, setDrawerItem] = useState(null);

  const fetchAll = useCallback(() => {
    getMetrics().then(r => setMetrics(r.data)).catch(() => {});
    getIncidents()
      .then(r => {
        const merged = mergeHistory(r.data.incidents || [], getLocalHistory());
        setHistory(merged);
      })
      .catch(() => {
        const local = [...getLocalHistory()].sort((a, b) => new Date(b.date) - new Date(a.date));
        setHistory(local);
      });
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchAll]);

  const recent   = history.slice(0, 10);
  const services = topServices(history);
  const maxSvc   = services[0]?.[1] || 1;

  const total     = metrics?.total_incidents  || history.length;
  const p1        = metrics?.severity_breakdown?.P1 || history.filter(i => i.severity === 'P1').length;
  const p2        = metrics?.severity_breakdown?.P2 || history.filter(i => i.severity === 'P2').length;
  const p3        = metrics?.severity_breakdown?.P3 || history.filter(i => i.severity === 'P3').length;
  const latency   = metrics?.avg_latency_ms
    ? Math.round(metrics.avg_latency_ms)
    : history.length ? Math.round(history.reduce((a, b) => a + b.latency, 0) / history.length) : 0;
  const evalScore = metrics?.avg_eval_score?.toFixed(1)
    || (history.length ? (history.reduce((a, b) => a + (b.evalScore || 0), 0) / history.length).toFixed(1) : '—');
  const feedScore = metrics?.avg_feedback_score?.toFixed(1) || '—';

  // System status from recent 10
  const recentTen = history.slice(0, 10);
  const recentPassRate = recentTen.length
    ? Math.round(recentTen.filter(i => i.result?.evaluation?.passed).length / recentTen.length * 100)
    : null;
  const sysStatus = recentPassRate === null ? null
    : recentPassRate >= 80 ? { label: 'AI Pipeline Operational', cls: 'green' }
    : recentPassRate >= 60 ? { label: 'AI Pipeline Degraded', cls: 'amber' }
    : { label: 'AI Pipeline Investigating', cls: 'red' };

  // Trend arrows (last 5 vs previous 5)
  const h5a = history.slice(0, 5);
  const h5b = history.slice(5, 10);
  const trendEval    = trendArrow(h5a, h5b, 'evalScore');
  const trendLatency = trendArrow(h5a, h5b, 'latency', true);

  const sevDot   = s => s === 'P1' ? 'p1' : s === 'P2' ? 'p2' : 'p3';
  const sevClass = s => s === 'P1' ? 'sev-p1' : s === 'P2' ? 'sev-p2' : 'sev-p3';

  // MTTR sparkline
  const mttrItems = history
    .filter(i => i.result?.recommendations?.estimated_resolution_mins)
    .slice(0, 10)
    .reverse();
  const maxMttr = Math.max(...mttrItems.map(i => i.result.recommendations.estimated_resolution_mins), 1);

  return (
    <div className="inner-page">

      {/* HEADER */}
      <div className="page-topbar">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">AI-powered incident management dashboard</p>
        </div>
        <button className="btn-run btn-inline" onClick={() => onNavigate('triage')}>
          ⚡ New Triage
        </button>
      </div>

      {/* SYSTEM STATUS BANNER */}
      {sysStatus && (
        <div className="sys-status-bar">
          <span className={`sys-status-dot ${sysStatus.cls}`} />
          <span className="sys-status-label">{sysStatus.label}</span>
          <span className="sys-status-meta">{recentPassRate}% pass rate · last {recentTen.length} incidents</span>
          <span className="sys-status-time">Auto-refreshes every 30s</span>
        </div>
      )}

      {/* STAT CARDS */}
      <div className="stat-row four">
        <div className="scard">
          <div className="scard-label">Total Incidents</div>
          <div className="scard-val green">{total}</div>
          <div className="scard-sub">all time</div>
        </div>
        <div className="scard">
          <div className="scard-label">Critical (P1)</div>
          <div className="scard-val red">{p1}</div>
          <div className="scard-sub">open severity</div>
        </div>
        <div className="scard">
          <div className="scard-label">Avg Eval Score</div>
          <div className="scard-val amber">{evalScore}<span className="scard-unit">/5</span></div>
          <div className="scard-sub">
            llm-as-judge
            {trendEval && <span className={`trend-arrow ${trendEval.good ? 'good' : 'bad'}`}>{trendEval.arrow}</span>}
          </div>
        </div>
        <div className="scard">
          <div className="scard-label">Avg Latency</div>
          <div className="scard-val">{latency > 0 ? `${latency}` : '—'}<span className="scard-unit">{latency > 0 ? 'ms' : ''}</span></div>
          <div className="scard-sub">
            end-to-end
            {trendLatency && <span className={`trend-arrow ${trendLatency.good ? 'good' : 'bad'}`}>{trendLatency.arrow}</span>}
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="home-grid">

        {/* ACTIVITY FEED */}
        <div className="panel feed-panel">
          <div className="panel-head">
            <div className="panel-dot" />
            <span className="panel-title">Recent Activity</span>
            <span className="panel-head-meta">{history.length} total</span>
          </div>
          {recent.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📋</div>
              <h3>No incidents yet</h3>
              <p>Run a triage to see activity here</p>
            </div>
          ) : (
            <>
              <div className="feed-list">
                {recent.map(item => (
                  <div
                    key={item.id}
                    className="feed-item"
                    style={{ cursor: item.result ? 'pointer' : 'default' }}
                    onClick={() => item.result && setDrawerItem(item)}
                  >
                    <div className={`feed-sev-dot ${sevDot(item.severity)}`} />
                    <div className="feed-content">
                      <div className="feed-title">{item.title}</div>
                      <div className="feed-meta">
                        <span className={`sev-badge ${sevClass(item.severity)}`} style={{ fontSize: 10, padding: '1px 5px' }}>{item.severity}</span>
                        <span>{timeAgo(item.date)}</span>
                        <span>{item.latency}ms</span>
                      </div>
                    </div>
                    <span className="feed-score">{item.evalScore}★</span>
                    {item.result && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 2 }}>›</span>}
                  </div>
                ))}
              </div>
              {history.length > 10 && (
                <button className="feed-view-all" onClick={() => onNavigate('history')}>
                  View all {history.length} incidents →
                </button>
              )}
            </>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="home-right-col">

          {/* SEV SPLIT */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-dot" />
              <span className="panel-title">Severity Split</span>
            </div>
            <div className="panel-body">
              {total === 0 ? (
                <div className="no-data-sm">No incidents yet</div>
              ) : (
                <div className="sev-items">
                  {[['P1', p1], ['P2', p2], ['P3', p3]].map(([sev, count]) => (
                    <div key={sev} className="sev-item">
                      <span className={`sev-badge sev-${sev.toLowerCase()} sev-item-label`}>{sev}</span>
                      <div className="sev-track">
                        <div className={`sev-fill sev-${sev.toLowerCase()}-fill`} style={{ width: total ? `${(count / total) * 100}%` : '0%' }} />
                      </div>
                      <span className="sev-ct">{count}</span>
                    </div>
                  ))}
                </div>
              )}
              {feedScore !== '—' && (
                <div className="scard-divider">
                  <div className="scard-label">Avg User Feedback</div>
                  <div style={{ fontSize: 24, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--amber)', marginTop: 4 }}>
                    {feedScore}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/5</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TOP SERVICES */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-dot" />
              <span className="panel-title">Top Affected Services</span>
            </div>
            <div className="panel-body">
              {services.length === 0 ? (
                <div className="no-data-sm">No service data yet</div>
              ) : (
                services.map(([name, count]) => (
                  <div key={name} className="service-row">
                    <span className="service-name">{name}</span>
                    <div className="service-track">
                      <div className="service-fill" style={{ width: `${(count / maxSvc) * 100}%` }} />
                    </div>
                    <span className="service-ct">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* MTTR TREND */}
          {mttrItems.length >= 3 && (
            <div className="panel">
              <div className="panel-head">
                <div className="panel-dot" />
                <span className="panel-title">MTTR Trend</span>
              </div>
              <div className="panel-body">
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 44 }}>
                  {mttrItems.map((item, i) => {
                    const mins = item.result.recommendations.estimated_resolution_mins;
                    const color = mins <= 30 ? 'var(--accent)' : mins <= 60 ? 'var(--amber)' : 'var(--red)';
                    return (
                      <div key={i} style={{
                        flex: 1, minHeight: 4,
                        height: `${(mins / maxMttr) * 100}%`,
                        background: color, borderRadius: '2px 2px 0 0', opacity: 0.85,
                      }} title={`${item.title}: ${mins}m ETA`} />
                    );
                  })}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5, fontFamily: 'var(--font-mono)' }}>
                  last {mttrItems.length} incidents · mins to resolve
                </div>
              </div>
            </div>
          )}

          {/* QUICK ACTIONS */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-dot" />
              <span className="panel-title">Quick Actions</span>
            </div>
            <div className="quick-actions">
              <button className="qa-btn" onClick={() => onNavigate('triage')}>
                <span className="qa-icon">⚡</span> New Triage
              </button>
              <button className="qa-btn" onClick={() => onNavigate('history')}>
                <span className="qa-icon">◫</span> History
              </button>
              <button className="qa-btn" onClick={() => onNavigate('metrics')}>
                <span className="qa-icon">◈</span> Metrics
              </button>
              <button className="qa-btn" onClick={() => window.open('https://incident-agent-production.up.railway.app/docs', '_blank')}>
                <span className="qa-icon">⚙</span> API Docs
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* SLIDE-IN DRAWER */}
      {drawerItem && (
        <div
          className="modal-overlay"
          style={{ justifyContent: 'flex-end', padding: 0, alignItems: 'stretch' }}
          onClick={() => setDrawerItem(null)}
        >
          <div className="modal-panel drawer-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`sev-badge ${sevClass(drawerItem.severity)}`}>{drawerItem.severity}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{drawerItem.title}</span>
              </div>
              <button className="modal-close" onClick={() => setDrawerItem(null)}>×</button>
            </div>
            <div className="modal-body">
              {drawerItem.result ? (
                <>
                  <div className="result-meta" style={{ padding: '8px 0 14px' }}>
                    <span className="mpill hi">ID: {drawerItem.result.request_id}</span>
                    <span className="mpill">{drawerItem.result.latency_ms}ms</span>
                    <span className="mpill">{drawerItem.result.context_used} retrieved</span>
                    {drawerItem.result.pii_masked && <span className="mpill">PII masked</span>}
                  </div>
                  <div className="rsec" style={{ paddingLeft: 0, paddingRight: 0 }}>
                    <div className="sec-label">Root Cause</div>
                    <p className="root-cause">{drawerItem.result.analysis.root_cause}</p>
                    <div className="tags" style={{ marginTop: 8 }}>
                      {drawerItem.result.analysis.affected_services.map(s => <span key={s} className="tag">{s}</span>)}
                    </div>
                  </div>
                  <div className="rsec" style={{ paddingLeft: 0, paddingRight: 0 }}>
                    <div className="sec-label">Immediate Actions</div>
                    <div className="actions">
                      {drawerItem.result.recommendations.immediate_actions.map((a, i) => (
                        <div key={i} className="action-item">
                          <span className="a-num">{String(i + 1).padStart(2, '0')}</span>{a}
                        </div>
                      ))}
                    </div>
                    <div className="extra-row" style={{ marginTop: 10 }}>
                      {drawerItem.result.recommendations.escalate_to && (
                        <span className="pill-esc">↑ {drawerItem.result.recommendations.escalate_to}</span>
                      )}
                      <span className="pill-eta">ETA {drawerItem.result.recommendations.estimated_resolution_mins}m</span>
                    </div>
                  </div>
                  <div className="rsec" style={{ paddingLeft: 0, paddingRight: 0, borderBottom: 'none' }}>
                    <div className="sec-label">Evaluation</div>
                    <div className="eval-grid">
                      <div className="eval-card">
                        <div className="lbl">Score</div>
                        <div className="eval-num">{drawerItem.result.evaluation.overall_score}/5</div>
                      </div>
                      <div className="eval-card">
                        <div className="lbl">Hallucination</div>
                        {drawerItem.result.evaluation.hallucination_detected
                          ? <span className="badge-no">Detected</span>
                          : <span className="badge-ok">None</span>}
                      </div>
                      <div className="eval-card">
                        <div className="lbl">Status</div>
                        {drawerItem.result.evaluation.passed
                          ? <span className="badge-ok">Passed</span>
                          : <span className="badge-no">Failed</span>}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  <div className="result-meta" style={{ padding: '0 0 14px' }}>
                    <span className={`sev-badge ${sevClass(drawerItem.severity)}`}>{drawerItem.severity}</span>
                    <span className="mpill">{drawerItem.latency}ms</span>
                    <span className="mpill">{drawerItem.evalScore}/5 eval</span>
                  </div>
                  Full detail available for incidents triaged in this session.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
