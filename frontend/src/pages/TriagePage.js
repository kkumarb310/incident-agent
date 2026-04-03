import { useState, useEffect } from 'react';
import { triageIncident, submitFeedback } from '../api';
import { showToast } from '../toast';

const STEPS = [
  'Retrieving similar incidents...',
  'Analyzing root cause...',
  'Generating recommendations...',
  'Evaluating response quality...',
];

export default function TriagePage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [stepIdx, setStepIdx] = useState(-1);

  useEffect(() => {
    if (!loading) { setStepIdx(-1); return; }
    setStepIdx(0);
    const timings = [0, 2000, 5000, 8000];
    const timers = timings.map((t, i) => setTimeout(() => setStepIdx(i), t));
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  const handleTriage = async () => {
    if (!title || !description) { setError('Please fill in both fields'); return; }
    setLoading(true); setError(''); setResult(null); setFeedbackSent(false); setFeedback(null);
    try {
      const res = await triageIncident(title, description);
      setResult(res.data);
      const sev = res.data.analysis?.severity || '';
      showToast(`Triage complete — ${sev} · ${res.data.latency_ms}ms`, 'success');
      // persist to local history
      const entry = {
        id: res.data.request_id,
        title,
        severity: res.data.analysis.severity,
        date: new Date().toISOString(),
        evalScore: res.data.evaluation.overall_score,
        latency: res.data.latency_ms,
        services: res.data.analysis.affected_services,
        result: res.data,
      };
      try {
        const prev = JSON.parse(localStorage.getItem('incident_history') || '[]');
        localStorage.setItem('incident_history', JSON.stringify([...prev, entry]));
      } catch { /* storage full or unavailable */ }
    } catch {
      setError('Failed to connect to backend. Is uvicorn running?');
      showToast('Triage failed — could not reach backend', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (score) => {
    setFeedback(score);
    await submitFeedback(result.request_id, score, '');
    setFeedbackSent(true);
  };

  const sevClass = (s) => s === 'P1' ? 'sev-p1' : s === 'P2' ? 'sev-p2' : 'sev-p3';

  return (
    <div className="inner-page">
      <div className="page-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Triage</h1>
          <p className="page-sub">Submit an incident for AI-powered analysis</p>
        </div>
      </div>
      <div className="triage-grid">

        {/* LEFT — INPUT */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-dot" />
            <span className="panel-title">New Incident</span>
          </div>
          <div className="panel-body">
            <div className="field">
              <label>Incident title</label>
              <input
                placeholder="e.g. Database timeouts on orders service"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea
                placeholder="Describe what is happening..."
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button className="btn-run" onClick={handleTriage} disabled={loading}>
              {loading ? 'Analyzing...' : 'Run Triage'}
            </button>
          </div>
        </div>

        {/* RIGHT — OUTPUT */}
        <div className="panel">
          {!loading && !result && (
            <div className="empty">
              <div className="empty-icon">⚡</div>
              <h3>Ready to triage</h3>
              <p>Submit an incident to see AI-powered analysis</p>
            </div>
          )}

          {loading && (
            <div className="agent-steps">
              {STEPS.map((s, i) => (
                <div
                  key={i}
                  className={`agent-step ${i === stepIdx ? 'active' : i < stepIdx ? 'done' : ''}`}
                >
                  {i < stepIdx
                    ? <span className="step-done-icon">✓</span>
                    : i === stepIdx
                    ? <div className="spin" />
                    : <div className="step-dot-idle" />
                  }
                  {s}
                </div>
              ))}
            </div>
          )}

          {result && !loading && (
            <div className="results-wrap">

              {/* META */}
              <div className="result-meta">
                <span className="mpill hi">ID: {result.request_id}</span>
                <span className="mpill">{result.latency_ms}ms</span>
                <span className="mpill">{result.context_used} incidents retrieved</span>
                {result.pii_masked && <span className="mpill">PII masked</span>}
              </div>

              {/* ANALYSIS */}
              <div className="rsec">
                <div className="sec-label">Analysis</div>
                <div className="sev-row">
                  <span className={`sev-badge ${sevClass(result.analysis.severity)}`}>
                    {result.analysis.severity}
                  </span>
                  <div className="conf-bar">
                    <div className="conf-fill" style={{ width: `${result.analysis.confidence * 100}%` }} />
                  </div>
                  <span className="conf-val">{Math.round(result.analysis.confidence * 100)}%</span>
                </div>
                <p className="root-cause">{result.analysis.root_cause}</p>
                <div className="tags">
                  {result.analysis.affected_services.map(s => (
                    <span key={s} className="tag">{s}</span>
                  ))}
                </div>
              </div>

              {/* RECOMMENDATIONS */}
              <div className="rsec">
                <div className="sec-label">Immediate Actions</div>
                <div className="actions">
                  {result.recommendations.immediate_actions.map((a, i) => (
                    <div key={i} className="action-item">
                      <span className="a-num">{String(i + 1).padStart(2, '0')}</span>
                      {a}
                    </div>
                  ))}
                </div>
                <div className="perm-fix" style={{ marginTop: 12 }}>
                  {result.recommendations.root_cause_fix}
                </div>
                <div className="extra-row">
                  {result.recommendations.escalate_to && (
                    <span className="pill-esc">↑ {result.recommendations.escalate_to}</span>
                  )}
                  <span className="pill-eta">ETA {result.recommendations.estimated_resolution_mins}m</span>
                </div>
              </div>

              {/* EVALUATION */}
              <div className="rsec">
                <div className="sec-label">Evaluation</div>
                <div className="eval-grid">
                  <div className="eval-card">
                    <div className="lbl">Score</div>
                    <div className="eval-num">{result.evaluation.overall_score}/5</div>
                  </div>
                  <div className="eval-card">
                    <div className="lbl">Hallucination</div>
                    {result.evaluation.hallucination_detected
                      ? <span className="badge-no">Detected</span>
                      : <span className="badge-ok">None</span>
                    }
                  </div>
                  <div className="eval-card">
                    <div className="lbl">Status</div>
                    {result.evaluation.passed
                      ? <span className="badge-ok">Passed</span>
                      : <span className="badge-no">Failed</span>
                    }
                  </div>
                </div>
              </div>

              {/* FEEDBACK */}
              <div className="rsec">
                <div className="sec-label">Was this helpful?</div>
                {feedbackSent
                  ? <div className="thanks">✓ Thanks for your feedback!</div>
                  : (
                    <div className="stars">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button
                          key={s}
                          className={`star ${feedback >= s ? 'on' : ''}`}
                          onClick={() => handleFeedback(s)}
                        >★</button>
                      ))}
                    </div>
                  )
                }
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

