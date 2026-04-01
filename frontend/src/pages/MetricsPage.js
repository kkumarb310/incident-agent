import { useState, useEffect } from 'react';
import { getMetrics } from '../api';

export default function MetricsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMetrics()
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="metrics-page">
      <div className="no-data">Loading metrics...</div>
    </div>
  );

  if (!data || data.message) return (
    <div className="metrics-page">
      <div className="page-heading">
        <h1>Metrics</h1>
        <p>Observability dashboard for your incident agent</p>
      </div>
      <div className="no-data">No metrics yet — run some incidents first.</div>
    </div>
  );

  const totalIncidents = data.total_incidents || 0;
  const avgLatency = data.avg_latency_ms ? Math.round(data.avg_latency_ms) : 0;
  const avgScore = data.avg_eval_score ? data.avg_eval_score.toFixed(1) : '—';
  const p1Count = data.severity_breakdown?.P1 || 0;

  const breakdown = data.score_breakdown || {};
  const maxScore = Math.max(...Object.values(breakdown), 1);

  const sevBreakdown = data.severity_breakdown || {};
  const maxSev = Math.max(...Object.values(sevBreakdown), 1);

  return (
    <div className="metrics-page">
      <div className="page-heading">
        <h1>Metrics</h1>
        <p>Observability dashboard — {totalIncidents} incidents processed</p>
      </div>

      {/* STAT CARDS */}
      <div className="stat-row">
        <div className="scard">
          <div className="scard-label">Total Incidents</div>
          <div className="scard-val green">{totalIncidents}</div>
          <div className="scard-sub">all time</div>
        </div>
        <div className="scard">
          <div className="scard-label">Avg Latency</div>
          <div className="scard-val">{avgLatency}ms</div>
          <div className="scard-sub">end to end</div>
        </div>
        <div className="scard">
          <div className="scard-label">Avg Eval Score</div>
          <div className="scard-val amber">{avgScore}/5</div>
          <div className="scard-sub">llm-as-judge</div>
        </div>
        <div className="scard">
          <div className="scard-label">P1 Incidents</div>
          <div className="scard-val red">{p1Count}</div>
          <div className="scard-sub">critical severity</div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="charts-row">

        {/* SCORE DISTRIBUTION */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-dot" />
            <span className="panel-title">Eval Score Distribution</span>
          </div>
          <div className="panel-body">
            {[5, 4, 3, 2, 1].map(score => (
              <div key={score} className="score-item">
                <span className="score-lbl">{score}★</span>
                <div className="score-track">
                  <div
                    className="score-bar"
                    style={{ width: `${((breakdown[score] || 0) / maxScore) * 100}%` }}
                  />
                </div>
                <span className="score-ct">{breakdown[score] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SEVERITY BREAKDOWN */}
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

            {data.avg_feedback_score && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                <div className="sec-label" style={{ fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Avg User Feedback
                </div>
                <div style={{ fontSize: 28, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>
                  {data.avg_feedback_score.toFixed(1)}/5
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
