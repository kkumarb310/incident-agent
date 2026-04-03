import { useState, useEffect } from 'react';
import { getMetrics } from '../api';

function getHistory() {
  try { return JSON.parse(localStorage.getItem('incident_history') || '[]'); }
  catch { return []; }
}

export default function MetricsPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [range,   setRange]   = useState('all');
  const history = getHistory();

  useEffect(() => {
    getMetrics()
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

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

  const totalIncidents = data?.total_incidents || history.length;
  const avgLatency = data?.avg_latency_ms
    ? Math.round(data.avg_latency_ms)
    : history.length ? Math.round(history.reduce((a, b) => a + b.latency, 0) / history.length) : 0;
  const avgScore = data?.avg_eval_score?.toFixed(1)
    || (history.length ? (history.reduce((a, b) => a + b.evalScore, 0) / history.length).toFixed(1) : '—');
  const p1Count = data?.severity_breakdown?.P1 || history.filter(i => i.severity === 'P1').length;

  const breakdown   = data?.score_breakdown    || {};
  const sevBreakdown = data?.severity_breakdown || {};
  const maxScore = Math.max(...Object.values(breakdown), 1);
  const maxSev   = Math.max(...Object.values(sevBreakdown), 1);

  const noData = (!data || data.message) && history.length === 0;

  if (loading) return (
    <div className="inner-page"><div className="no-data">Loading metrics...</div></div>
  );

  return (
    <div className="inner-page">

      {/* HEADER */}
      <div className="page-topbar">
        <div>
          <h1 className="page-title">Metrics</h1>
          <p className="page-sub">Observability dashboard — {totalIncidents} incidents processed</p>
        </div>
        <div className="filter-pills">
          {['7d', '30d', '90d', 'all'].map(r => (
            <button
              key={r}
              className={`filter-pill ${range === r ? 'active' : ''}`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
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
          <div className="scard-sub">end to end</div>
        </div>
        <div className="scard">
          <div className="scard-label">Avg Eval Score</div>
          <div className="scard-val amber">{avgScore}<span className="scard-unit">/5</span></div>
          <div className="scard-sub">llm-as-judge</div>
        </div>
        <div className="scard">
          <div className="scard-label">P1 Incidents</div>
          <div className="scard-val red">{p1Count}</div>
          <div className="scard-sub">critical severity</div>
        </div>
      </div>

      {noData ? (
        <div className="no-data">No metrics yet — run some incidents first.</div>
      ) : (
        <>
          {/* ROW 1: Score + Severity */}
          <div className="charts-row">
            <div className="panel">
              <div className="panel-head">
                <div className="panel-dot" />
                <span className="panel-title">Eval Score Distribution</span>
              </div>
              <div className="panel-body">
                {Object.keys(breakdown).length === 0 ? (
                  <div className="no-data-sm">No score data yet</div>
                ) : (
                  [5, 4, 3, 2, 1].map(score => (
                    <div key={score} className="score-item">
                      <span className="score-lbl">{score}★</span>
                      <div className="score-track">
                        <div className="score-bar" style={{ width: `${((breakdown[score] || 0) / maxScore) * 100}%` }} />
                      </div>
                      <span className="score-ct">{breakdown[score] || 0}</span>
                    </div>
                  ))
                )}
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
                        <div
                          className={`sev-fill sev-${sev.toLowerCase()}-fill`}
                          style={{ width: `${((sevBreakdown[sev] || 0) / maxSev) * 100}%` }}
                        />
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

          {/* ROW 2: Services + Agent Performance */}
          <div className="charts-row" style={{ marginTop: 16 }}>
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
                      {passRate !== null ? `${passRate}%` : '—'}
                    </div>
                  </div>
                  <div className="eval-card">
                    <div className="lbl">Hallucination</div>
                    <div className="eval-num" style={{ color: hallRate > 10 ? 'var(--red)' : 'var(--green)' }}>
                      {hallRate !== null ? `${hallRate}%` : '—'}
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
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: `${(item.evalScore / 5) * 100}%`,
                            background: item.evalScore >= 4 ? 'var(--accent)' : item.evalScore >= 3 ? 'var(--amber)' : 'var(--red)',
                            borderRadius: '2px 2px 0 0',
                            opacity: 0.85,
                            minHeight: 4,
                            transition: 'height 0.5s ease',
                          }}
                          title={`${item.title}: ${item.evalScore}/5`}
                        />
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
        </>
      )}
    </div>
  );
}
