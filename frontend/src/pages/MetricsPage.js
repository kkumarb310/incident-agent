import { useState, useEffect } from 'react';
import { getMetrics } from '../api';

export default function MetricsPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    getMetrics()
      .then(res => setMetrics(res.data))
      .catch(() => setError('Could not load metrics. Is uvicorn running?'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><p>Loading metrics...</p></div>;
  if (error)   return <div className="page"><div className="error">{error}</div></div>;
  if (metrics?.message) return (
    <div className="page">
      <div className="page-header"><h1>Metrics</h1></div>
      <div className="card"><p>{metrics.message}</p></div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Metrics</h1>
        <p>Observability across all triage requests</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total incidents</div>
          <div className="kpi-value">{metrics.total_incidents}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg latency</div>
          <div className="kpi-value">{metrics.avg_latency_ms}ms</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg eval score</div>
          <div className="kpi-value">{metrics.avg_eval_score} / 5</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pass rate</div>
          <div className="kpi-value">{Math.round(metrics.pass_rate * 100)}%</div>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="card">
          <div className="card-title">Severity breakdown</div>
          {Object.entries(metrics.severity_breakdown).map(([k, v]) => (
            <div key={k} className="bar-row">
              <span className="bar-label">{k}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{
                  width: `${Math.round(v / metrics.total_incidents * 100)}%`,
                  background: k === 'P1' ? '#ef4444' : k === 'P2' ? '#f59e0b' : '#22c55e'
                }}/>
              </div>
              <span className="bar-count">{v}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">Model usage</div>
          {Object.entries(metrics.model_usage).map(([k, v]) => (
            <div key={k} className="bar-row">
              <span className="bar-label" style={{ width: '180px' }}>
                {k.replace('claude-', '')}
              </span>
              <div className="bar-track">
                <div className="bar-fill" style={{
                  width: `${Math.round(v / metrics.total_incidents * 100)}%`,
                  background: '#7c6af7'
                }}/>
              </div>
              <span className="bar-count">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}