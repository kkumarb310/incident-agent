import { useState, useEffect, useCallback } from 'react';
import { getMetrics } from '../api';

const REFRESH_MS = 30000;

function getHistory() {
  try { return JSON.parse(localStorage.getItem('incident_history') || '[]'); }
  catch { return []; }
}

function RefreshBadge({ lastRefresh }) {
  const [label, setLabel] = useState('just now');
  useEffect(() => {
    const tick = () => {
      const secs = Math.round((Date.now() - lastRefresh) / 1000);
      setLabel(secs < 5 ? 'just now' : `${secs}s ago`);
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [lastRefresh]);
  return <span className="refresh-badge">Updated {label}</span>;
}

export default function MetricsPage() {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [range,       setRange]       = useState('all');
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const allHistory = getHistory();
  const rangeDays = { '7d': 7, '30d': 30, '90d': 90, 'all': Infinity };
  const now = Date.now();
  const history = range === 'all'
    ? allHistory
    : allHistory.filter(i => (now - new Date(i.date).getTime()) / 86400000 <= rangeDays[range]);

  const fetchMetrics = useCallback(() => {
    getMetrics()
      .then(r => { setData(r.data); setLastRefresh(Date.now()); })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchMetrics]);

  // derived from localStorage
  const services = (() => {
    const c = {};
    history.forEach(i => (i.services || []).forEach(s => { c[s] = (c[s] || 0) + 1; }));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6);
  })();
  const maxSvc = services[0]?.[1] || 1;

  const passRate = history.length
    ? Math.round(history.filter(i => i.result?.evaluation?.passed).length / history.length * 100)
    : null;
  const hallRate = history.length
    ? Math.round(history.filter(i => i.result?.evaluation?.hallucination_detected).length / history.length * 100)
    : null;

  // API-derived
  const totalIncidents = data?.total_incidents || history.length;
  const avgLatency = data?.avg_latency_ms
    ? Math.round(data.avg_latency_ms)
    : history.length ? Math.round(history.reduce((a, b) => a + b.latency, 0) / history.length) : 0;
  const avgScore = data?.avg_eval_score?.toFixed(1)
    || (history.length ? (history.reduce((a, b) => a + b.evalScore, 0) / history.length).toFixed(1) : '—');
  const apiPassRate = data?.pass_rate != null ? Math.round(data.pass_rate * 100) : passRate;

  const breakdown    = data?.score_breakdown    || {};
  const sevBreakdown = data?.severity_breakdown || {};
  const modelUsage   = data?.model_usage        || {};
  const maxScore = Math.max(...Object.values(breakdown), 1);
  const maxSev   = Math.max(...Object.values(sevBreakdown), 1);
  const maxModel = Math.max(...Object.values(modelUsage), 1);

  const noData = (!data || data.message) && history.length === 0;

  // Trend arrows
  const h5a = history.slice(0, 5);
  const h5b = history.slice(5, 10);
  function trendArrow(recent, prev, key, lowerIsBetter = false) {
    if (recent.length < 2 || prev.length < 2) return null;
    const avg = arr => arr.reduce((s, i) => s + (i[key] || 0), 0) / arr.length;
    const diff = avg(recent) - avg(prev);
    if (Math.abs(diff) < 0.001) return null;
    const up = diff > 0;
    return { arrow: up ? '↑' : '↓', good: lowerIsBetter ? !up : up };
  }
  const trendLatency = trendArrow(h5a, h5b, 'latency', true);
  const trendEval    = trendArrow(h5a, h5b, 'evalScore');

  // System health score
  const healthScore = !noData ? Math.max(0, Math.min(100,
    100
    - (apiPassRate != null && apiPassRate < 80 ? 20 : 0)
    - (hallRate != null && hallRate > 5 ? 15 : 0)
    - (parseFloat(avgScore) < 4 ? 10 : 0)
    - (avgLatency > 5000 ? 10 : 0)
  )) : null;
  const healthColor = healthScore >= 80 ? 'var(--green)' : healthScore >= 60 ? 'var(--amber)' : 'var(--red)';
  const healthLabel = healthScore >= 80 ? 'Healthy' : healthScore >= 60 ? 'Degraded' : 'Critical';

  if (loading) return <div className="inner-page"><div className="no-data">Loading metrics...</div></div>;

  return (
    <div className="inner-page">

      {/* HEADER */}
      <div className="page-topbar">
        <div>
          <h1 className="page-title">Metrics</h1>
          <p className="page-sub">
            Observability dashboard — {totalIncidents} incidents
            {range !== 'all' && <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 11, fontFamily: 'var(--font-mono)' }}>(local data · {range})</span>}
            {!noData && <RefreshBadge lastRefresh={lastRefresh} />}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="filter-pills">
            {['7d', '30d', '90d', 'all'].map(r => (
              <button key={r} className={`filter-pill ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
          <button className="qa-btn" onClick={fetchMetrics} title="Refresh now">↺</button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="stat-row four">
        <div className="scard">
          <div className="scard-label">Total Incidents</div>
          <div className="scard-val green">{totalIncidents}</div>
          <div className="scard-sub">all time</div>
        </div>
        <div className="scard">
          <div className="scard-label">Avg Latency</div>
          <div className="scard-val">{avgLatency > 0 ? avgLatency : '—'}<span className="scard-unit">{avgLatency > 0 ? 'ms' : ''}</span></div>
          <div className="scard-sub">
            end to end
            {trendLatency && <span className={`trend-arrow ${trendLatency.good ? 'good' : 'bad'}`}>{trendLatency.arrow}</span>}
          </div>
        </div>
        <div className="scard">
          <div className="scard-label">Avg Eval Score</div>
          <div className="scard-val amber">{avgScore}<span className="scard-unit">/5</span></div>
          <div className="scard-sub">
            llm-as-judge
            {trendEval && <span className={`trend-arrow ${trendEval.good ? 'good' : 'bad'}`}>{trendEval.arrow}</span>}
          </div>
        </div>
        <div className="scard">
          <div className="scard-label">Pass Rate</div>
          <div className="scard-val green">{apiPassRate != null ? `${apiPassRate}%` : '—'}</div>
          <div className="scard-sub">eval passed</div>
        </div>
      </div>

      {noData ? (
        <div className="no-data">No metrics yet — run some incidents first.</div>
      ) : (
        <>
          {/* SYSTEM HEALTH SCORE */}
          {healthScore !== null && (
            <div className="panel health-score-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '14px 20px' }}>
                <div>
                  <div className="scard-label">System Health Score</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', color: healthColor }}>{healthScore}</span>
                    <span className="scard-unit">/100</span>
                    <span style={{ fontSize: 12, color: healthColor, fontWeight: 600 }}>{healthLabel}</span>
                  </div>
                </div>
                <div style={{ flex: 1, height: 8, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${healthScore}%`, background: healthColor, borderRadius: 4, transition: 'width 1s ease' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0, textAlign: 'right', lineHeight: 1.6 }}>
                  pass rate · hallucination<br />eval score · latency
                </div>
              </div>
            </div>
          )}

          {/* ROW 1: Score Distribution + Severity Breakdown */}
          <div className="charts-row">
            <div className="panel">
              <div className="panel-head">
                <div className="panel-dot" />
                <span className="panel-title">Eval Score Distribution</span>
              </div>
              <div className="panel-body">
                {Object.keys(breakdown).length === 0
                  ? <div className="no-data-sm">No score data yet</div>
                  : [5, 4, 3, 2, 1].map(score => (
                    <div key={score} className="score-item">
                      <span className="score-lbl">{score}★</span>
                      <div className="score-track">
                        <div className="score-bar" style={{ width: `${((breakdown[score] || 0) / maxScore) * 100}%` }} />
                      </div>
                      <span className="score-ct">{breakdown[score] || 0}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div className="panel-dot" />
                <span className="panel-title">Severity Breakdown</span>
              </div>
              <div className="panel-body">
                <div className="sev-items">
                  {['P1', 'P2', 'P3'].map(sev => (
                    <div key={sev} className="sev-item">
                      <span className={`sev-badge sev-${sev.toLowerCase()} sev-item-label`}>{sev}</span>
                      <div className="sev-track">
                        <div className={`sev-fill sev-${sev.toLowerCase()}-fill`} style={{ width: `${((sevBreakdown[sev] || 0) / maxSev) * 100}%` }} />
                      </div>
                      <span className="sev-ct">{sevBreakdown[sev] || 0}</span>
                    </div>
                  ))}
                </div>
                {data?.avg_feedback_score && (
                  <div className="scard-divider">
                    <div className="scard-label">Avg User Feedback</div>
                    <div style={{ fontSize: 26, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--amber)', marginTop: 4 }}>
                      {data.avg_feedback_score.toFixed(1)}<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/5</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ROW 2: Top Services + Agent Performance */}
          <div className="charts-row" style={{ marginTop: 16 }}>
            <div className="panel">
              <div className="panel-head">
                <div className="panel-dot" />
                <span className="panel-title">Top Affected Services</span>
              </div>
              <div className="panel-body">
                {services.length === 0
                  ? <div className="no-data-sm">No service data yet — load demo data or run triages</div>
                  : services.map(([name, count]) => (
                    <div key={name} className="service-row">
                      <span className="service-name">{name}</span>
                      <div className="service-track">
                        <div className="service-fill" style={{ width: `${(count / maxSvc) * 100}%` }} />
                      </div>
                      <span className="service-ct">{count}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div className="panel-dot" />
                <span className="panel-title">Agent Performance</span>
              </div>
              <div className="panel-body">
                <div className="eval-grid">
                  <div className="eval-card">
                    <div className="lbl">Pass Rate</div>
                    <div className="eval-num" style={{ color: 'var(--green)' }}>
                      {apiPassRate != null ? `${apiPassRate}%` : '—'}
                    </div>
                  </div>
                  <div className="eval-card">
                    <div className="lbl">Hallucination</div>
                    <div className="eval-num" style={{ color: hallRate > 10 ? 'var(--red)' : 'var(--green)' }}>
                      {hallRate != null ? `${hallRate}%` : '—'}
                    </div>
                  </div>
                  <div className="eval-card">
                    <div className="lbl">Avg Score</div>
                    <div className="eval-num">{avgScore}</div>
                  </div>
                </div>
                {history.length > 0 && (
                  <div style={{ marginTop: 18 }}>
                    <div className="sec-label" style={{ marginBottom: 8 }}>Eval Score Trend</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 52 }}>
                      {[...history].reverse().slice(0, 14).reverse().map((item, i) => (
                        <div key={i} style={{
                          flex: 1, minHeight: 4,
                          height: `${(item.evalScore / 5) * 100}%`,
                          background: item.evalScore >= 4 ? 'var(--accent)' : item.evalScore >= 3 ? 'var(--amber)' : 'var(--red)',
                          borderRadius: '2px 2px 0 0', opacity: 0.85,
                        }} title={`${item.title}: ${item.evalScore}/5`} />
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5, fontFamily: 'var(--font-mono)' }}>
                      last {Math.min(history.length, 14)} incidents
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ROW 3: Model Usage */}
          {Object.keys(modelUsage).length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="panel">
                <div className="panel-head">
                  <div className="panel-dot" />
                  <span className="panel-title">Model Usage</span>
                </div>
                <div className="panel-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    {Object.entries(modelUsage).map(([model, count]) => (
                      <div key={model} className="eval-card" style={{ textAlign: 'left' }}>
                        <div className="lbl" style={{ marginBottom: 8 }}>{model}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="service-track" style={{ flex: 1 }}>
                            <div className="service-fill" style={{ width: `${(count / maxModel) * 100}%`, background: 'var(--purple)' }} />
                          </div>
                          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', flexShrink: 0 }}>
                            {count} calls
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
