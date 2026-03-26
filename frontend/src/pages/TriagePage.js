import { useState } from 'react';
import { triageIncident, submitFeedback } from '../api';

export default function TriagePage() {
  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [result, setResult]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [feedback, setFeedback]         = useState(null);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleTriage = async () => {
    if (!title || !description) {
      setError('Please fill in both fields');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    setFeedbackSent(false);
    setFeedback(null);
    try {
      const res = await triageIncident(title, description);
      setResult(res.data);
    } catch (e) {
      setError('Failed to connect to backend. Is uvicorn running?');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (score) => {
    setFeedback(score);
    await submitFeedback(result.request_id, score, '');
    setFeedbackSent(true);
  };

  const severityColor = (s) => {
    if (s === 'P1') return '#ef4444';
    if (s === 'P2') return '#f59e0b';
    return '#22c55e';
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Incident Triage</h1>
        <p>Submit an incident for AI-powered analysis</p>
      </div>

      <div className="card">
        <div className="form-group">
          <label>Incident title</label>
          <input
            className="input"
            placeholder="e.g. Database timeouts on orders service"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            className="textarea"
            placeholder="Describe what is happening..."
            rows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>
        {error && <div className="error">{error}</div>}
        <button
          className="btn-primary"
          onClick={handleTriage}
          disabled={loading}
        >
          {loading ? 'Analyzing...' : 'Triage Incident'}
        </button>
      </div>

      {loading && (
        <div className="card loading-card">
          <div className="loading-steps">
            <div className="step">Retrieving similar incidents...</div>
            <div className="step">Analyzing with Claude...</div>
            <div className="step">Generating recommendations...</div>
            <div className="step">Evaluating response quality...</div>
          </div>
        </div>
      )}

      {result && (
        <div className="results">

          <div className="result-header">
            <div className="result-meta">
              <span className="request-id">ID: {result.request_id}</span>
              <span className="latency">{result.latency_ms}ms</span>
              <span className="context">{result.context_used} similar incidents used</span>
            </div>
          </div>

          <div className="card result-card">
            <div className="card-title">Analysis</div>
            <div className="analysis-grid">
              <div className="analysis-item">
                <span className="label">Severity</span>
                <span
                  className="severity-badge"
                  style={{ background: severityColor(result.analysis.severity) }}
                >
                  {result.analysis.severity}
                </span>
              </div>
              <div className="analysis-item">
                <span className="label">Confidence</span>
                <span className="value">
                  {Math.round(result.analysis.confidence * 100)}%
                </span>
              </div>
              <div className="analysis-item full-width">
                <span className="label">Root cause</span>
                <span className="value">{result.analysis.root_cause}</span>
              </div>
              <div className="analysis-item full-width">
                <span className="label">Affected services</span>
                <div className="tags">
                  {result.analysis.affected_services.map(s => (
                    <span key={s} className="tag">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card result-card">
            <div className="card-title">Recommendations</div>
            <div className="rec-section">
              <div className="rec-label">Immediate actions</div>
              <ol className="action-list">
                {result.recommendations.immediate_actions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ol>
            </div>
            <div className="rec-section">
              <div className="rec-label">Permanent fix</div>
              <p>{result.recommendations.root_cause_fix}</p>
            </div>
            <div className="rec-row">
              {result.recommendations.escalate_to && (
                <div className="rec-pill">
                  Escalate to: {result.recommendations.escalate_to}
                </div>
              )}
              <div className="rec-pill">
                ETA: {result.recommendations.estimated_resolution_mins} mins
              </div>
            </div>
          </div>

          <div className="card result-card">
            <div className="card-title">Evaluation</div>
            <div className="eval-grid">
              <div className="eval-item">
                <span className="label">Overall score</span>
                <span className="eval-score">
                  {result.evaluation.overall_score} / 5
                </span>
              </div>
              <div className="eval-item">
                <span className="label">Hallucination</span>
                <span className={
                  result.evaluation.hallucination_detected
                    ? 'badge-danger' : 'badge-success'
                }>
                  {result.evaluation.hallucination_detected
                    ? 'Detected' : 'None detected'}
                </span>
              </div>
              <div className="eval-item">
                <span className="label">Status</span>
                <span className={
                  result.evaluation.passed
                    ? 'badge-success' : 'badge-danger'
                }>
                  {result.evaluation.passed ? 'Passed' : 'Failed'}
                </span>
              </div>
            </div>
          </div>

          <div className="card result-card">
            <div className="card-title">Was this helpful?</div>
            {feedbackSent ? (
              <div className="feedback-thanks">
                Thanks for your feedback!
              </div>
            ) : (
              <div className="stars">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    className={`star ${feedback >= s ? 'active' : ''}`}
                    onClick={() => handleFeedback(s)}
                  >
                    ★
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}   