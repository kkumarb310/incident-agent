import { useState, useEffect } from 'react';
import { triageIncident, submitFeedback } from '../api';
import { showToast } from '../toast';

const STEPS = [
  { label: 'Retrieving similar incidents...', icon: '◈', detail: 'Semantic search over 30 past incidents in ChromaDB vector store' },
  { label: 'Analyzing root cause...',         icon: '⚙', detail: 'Claude classifies severity (P1–P3), identifies root cause chain' },
  { label: 'Generating recommendations...',   icon: '⬡', detail: 'Producing immediate actions, permanent fix, escalation path + ETA' },
  { label: 'Evaluating response quality...',  icon: '◫', detail: 'LLM-as-judge scores accuracy, quality, and checks for hallucination' },
];

const EXAMPLES = [
  {
    title: 'Database connection pool exhausted',
    description: 'The payment-service is throwing "too many connections" errors. Postgres is at max_connections=100. Orders are failing at checkout with 500 errors. Error rate spiked to 45% in the last 10 minutes.',
  },
  {
    title: 'Auth service returning 500 on all logins',
    description: 'Users cannot log in. auth-service pods are throwing NullPointerException on JWT validation. Started after the 14:30 deployment of auth-service v2.1.4. All sessions are being invalidated.',
  },
  {
    title: 'API gateway rate limiter blocking traffic',
    description: 'Mobile clients getting 429 Too Many Requests. Rate limit misconfigured to 10 req/min instead of 1000 after a Helm upgrade. Affects 60% of authenticated mobile users.',
  },
];

function getLocalHistory() {
  try { return JSON.parse(localStorage.getItem('incident_history') || '[]'); }
  catch { return []; }
}

function ConfidenceRing({ value }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const filled = circ * value;
  const color = value >= 0.8 ? 'var(--green)' : value >= 0.6 ? 'var(--amber)' : 'var(--red)';
  return (
    <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth="5" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text
        x="36" y="40"
        textAnchor="middle"
        style={{ transform: 'rotate(90deg) translate(0px, -72px)', fill: color, fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)' }}
      >
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
}

export default function TriagePage() {
  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [result,       setResult]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [feedback,     setFeedback]     = useState(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [stepIdx,      setStepIdx]      = useState(-1);
  const [activeTab,    setActiveTab]    = useState('summary');
  const [checked,      setChecked]      = useState({});
  const [copied,       setCopied]       = useState(false);
  const recentHistory = getLocalHistory().slice(-3).reverse();
  const [tipDismissed, setTipDismissed] = useState(
    () => localStorage.getItem('triage_tip_dismissed') === '1'
  );

  useEffect(() => {
    if (!loading) { setStepIdx(-1); return; }
    setStepIdx(0);
    const timings = [0, 2500, 5500, 8500];
    const timers  = timings.map((t, i) => setTimeout(() => setStepIdx(i), t));
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  const handleTriage = async () => {
    if (!title || !description) { setError('Please fill in both fields'); return; }
    setLoading(true); setError(''); setResult(null);
    setFeedbackSent(false); setFeedback(null);
    setChecked({}); setActiveTab('summary');
    try {
      const res = await triageIncident(title, description);
      setResult(res.data);
      showToast(`Triage complete — ${res.data.analysis?.severity} · ${res.data.latency_ms}ms`, 'success');
      const entry = {
        id: res.data.request_id, title,
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
      } catch { /**/ }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = detail?.message || 'Failed to connect to backend.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (score) => {
    setFeedback(score);
    await submitFeedback(result.request_id, score, '');
    setFeedbackSent(true);
    showToast('Feedback submitted — thank you!', 'success');
  };

  const fillExample = (ex) => { setTitle(ex.title); setDescription(ex.description); setError(''); };

  const copyReport = () => {
    if (!result) return;
    const text = [
      `INCIDENT TRIAGE REPORT`,
      `ID: ${result.request_id}  |  Severity: ${result.analysis.severity}  |  ${new Date().toLocaleString()}`,
      ``,
      `TITLE: ${title}`,
      ``,
      `ROOT CAUSE`,
      result.analysis.root_cause,
      ``,
      `AFFECTED SERVICES: ${result.analysis.affected_services.join(', ')}`,
      `CONFIDENCE: ${Math.round(result.analysis.confidence * 100)}%`,
      ``,
      `IMMEDIATE ACTIONS`,
      ...result.recommendations.immediate_actions.map((a, i) => `${i + 1}. ${a}`),
      ``,
      `PERMANENT FIX`,
      result.recommendations.root_cause_fix,
      ``,
      `ESCALATE TO: ${result.recommendations.escalate_to || 'N/A'}`,
      `ETA: ${result.recommendations.estimated_resolution_mins} minutes`,
      ``,
      `EVALUATION`,
      `Score: ${result.evaluation.overall_score}/5  |  Hallucination: ${result.evaluation.hallucination_detected ? 'Detected' : 'None'}  |  ${result.evaluation.passed ? 'PASSED' : 'FAILED'}`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sevClass = (s) => s === 'P1' ? 'sev-p1' : s === 'P2' ? 'sev-p2' : 'sev-p3';
  const sevColor = (s) => s === 'P1' ? 'var(--red)' : s === 'P2' ? 'var(--amber)' : 'var(--green)';
  const sevLabel = (s) => s === 'P1' ? 'Critical' : s === 'P2' ? 'High' : 'Medium';
  const allChecked = result
    ? result.recommendations.immediate_actions.every((_, i) => checked[i])
    : false;

  return (
    <div className="inner-page">
      <div className="page-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Triage</h1>
          <p className="page-sub">Submit an incident for AI-powered multi-agent analysis</p>
        </div>
        {result && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="qa-btn" onClick={copyReport}>
              {copied ? '✓ Copied' : '⎘ Copy Report'}
            </button>
          </div>
        )}
      </div>

      <div className="triage-grid">

        {/* ── LEFT PANEL ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div className="panel">
            <div className="panel-head">
              <div className="panel-dot" />
              <span className="panel-title">New Incident</span>
            </div>
            <div className="panel-body">

              {/* Pro Tip */}
              {!tipDismissed && (
                <div className="rm-callout rm-callout-amber" style={{ marginBottom: 14, position: 'relative', paddingRight: 32 }}>
                  <button
                    onClick={() => { setTipDismissed(true); localStorage.setItem('triage_tip_dismissed', '1'); }}
                    style={{ position: 'absolute', top: 6, right: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                  >×</button>
                  <strong>Pro tip:</strong> Include error messages, service names, and when symptoms started. More context = higher eval score.
                </div>
              )}

              {/* Quick-fill examples */}
              <div style={{ marginBottom: 14 }}>
                <div className="field-label-sm">Quick examples</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {EXAMPLES.map((ex, i) => (
                    <button key={i} className="example-btn" onClick={() => fillExample(ex)}>
                      <span className="example-icon">↗</span>
                      {ex.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Incident title</label>
                <input
                  placeholder="e.g. Database timeouts on orders service"
                  value={title}
                  onChange={e => { setTitle(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && !loading && handleTriage()}
                />
              </div>

              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                  <label style={{ margin: 0 }}>Description</label>
                  <span style={{ fontSize: 10, color: description.length > 400 ? 'var(--amber)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {description.length} chars
                  </span>
                </div>
                <textarea
                  placeholder="Describe symptoms, when it started, affected services, error messages..."
                  rows={5}
                  value={description}
                  onChange={e => { setDescription(e.target.value); setError(''); }}
                />
              </div>

              {error && <div className="error-msg">{error}</div>}

              <button className="btn-run" onClick={handleTriage} disabled={loading}>
                {loading ? 'Analyzing...' : '⚡ Run Triage'}
              </button>
            </div>
          </div>

          {/* Recent Triages */}
          {recentHistory.length > 0 && (
            <div className="panel">
              <div className="panel-head">
                <div className="panel-dot" />
                <span className="panel-title">Recent Triages</span>
              </div>
              <div style={{ padding: '4px 0' }}>
                {recentHistory.map(item => (
                  <button
                    key={item.id}
                    className="recent-triage-row"
                    onClick={() => fillExample({ title: item.title, description: '' })}
                    title="Prefill title"
                  >
                    <span className={`sev-badge ${sevClass(item.severity)}`} style={{ fontSize: 10, padding: '1px 5px' }}>
                      {item.severity}
                    </span>
                    <span className="recent-triage-title">{item.title}</span>
                    <span className="recent-triage-score">{item.evalScore}★</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Last 7 Severities */}
          {(() => {
            const sevHistory = getLocalHistory().slice(-7);
            const sevColor = s => s === 'P1' ? 'var(--red)' : s === 'P2' ? 'var(--amber)' : 'var(--green)';
            return sevHistory.length >= 3 ? (
              <div className="panel">
                <div className="panel-head">
                  <div className="panel-dot" />
                  <span className="panel-title">Last 7 Severities</span>
                </div>
                <div className="panel-body" style={{ padding: '12px 18px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    {sevHistory.map((item, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: sevColor(item.severity), boxShadow: `0 0 5px ${sevColor(item.severity)}` }} title={`${item.severity} · ${item.title}`} />
                        <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{item.severity}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>oldest → newest</div>
                </div>
              </div>
            ) : null;
          })()}

          {/* Pipeline info card */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-dot" />
              <span className="panel-title">AI Pipeline</span>
            </div>
            <div className="panel-body" style={{ padding: '12px 18px' }}>
              {[
                { icon: '◈', label: 'Retrieval Agent',      desc: 'Semantic search over 30 past incidents' },
                { icon: '⚙', label: 'Analysis Agent',       desc: 'Severity classification + root cause' },
                { icon: '⬡', label: 'Recommendation Agent', desc: 'Immediate actions + permanent fix' },
                { icon: '◫', label: 'Evaluation Agent',     desc: 'Hallucination detection + quality score' },
              ].map((step, i) => (
                <div key={i} className="pipeline-step">
                  <div className="pipeline-icon">{step.icon}</div>
                  <div>
                    <div className="pipeline-label">{step.label}</div>
                    <div className="pipeline-desc">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="panel" style={{ minHeight: 420 }}>

          {/* EMPTY STATE */}
          {!loading && !result && (
            <div className="empty" style={{ padding: '72px 20px' }}>
              <div className="empty-icon" style={{ width: 56, height: 56, fontSize: 26 }}>⚡</div>
              <h3>Ready to triage</h3>
              <p>Fill in an incident or pick a quick example, then hit Run Triage</p>
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
                Running multi-agent pipeline...
              </div>
              <div className="agent-steps">
                {STEPS.map((s, i) => (
                  <div key={i} className={`agent-step ${i === stepIdx ? 'active' : i < stepIdx ? 'done' : ''}`}>
                    {i < stepIdx
                      ? <span className="step-done-icon">✓</span>
                      : i === stepIdx ? <div className="spin" />
                      : <div className="step-dot-idle" />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{s.icon}</span>
                        <span>{s.label}</span>
                        {i === stepIdx && (
                          <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>running</span>
                        )}
                        {i < stepIdx && (
                          <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>done</span>
                        )}
                      </div>
                      {i === stepIdx && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{s.detail}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESULTS */}
          {result && !loading && (
            <div className="results-wrap">

              {/* SEVERITY BANNER */}
              <div className="sev-banner" style={{ borderColor: sevColor(result.analysis.severity), background: `${sevColor(result.analysis.severity)}0f` }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span className={`sev-badge ${sevClass(result.analysis.severity)}`} style={{ fontSize: 14, padding: '4px 12px' }}>
                      {result.analysis.severity}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 15, color: sevColor(result.analysis.severity) }}>
                      {sevLabel(result.analysis.severity)} Severity
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {title}
                  </div>
                  <div className="result-meta" style={{ padding: '8px 0 0', gap: 6 }}>
                    <span className="mpill hi">ID: {result.request_id}</span>
                    <span className="mpill">{result.latency_ms}ms</span>
                    <span className="mpill">{result.context_used} context docs</span>
                    {result.pii_masked && <span className="mpill">PII masked</span>}
                  </div>
                </div>
                <ConfidenceRing value={result.analysis.confidence} />
              </div>

              {/* TABS */}
              <div className="result-tabs">
                {['summary', 'actions', 'evaluation'].map(tab => (
                  <button
                    key={tab}
                    className={`result-tab ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === 'summary'    && '⬡ Summary'}
                    {tab === 'actions'    && `⚙ Actions${allChecked ? ' ✓' : ''}`}
                    {tab === 'evaluation' && '◫ Evaluation'}
                  </button>
                ))}
              </div>

              {/* TAB: SUMMARY */}
              {activeTab === 'summary' && (
                <div>
                  <div className="rsec">
                    <div className="sec-label">Root Cause</div>
                    <p className="root-cause" style={{ fontSize: 14, lineHeight: 1.7 }}>
                      {result.analysis.root_cause}
                    </p>
                  </div>

                  <div className="rsec">
                    <div className="sec-label">Affected Services</div>
                    <div className="tags">
                      {result.analysis.affected_services.map(s => (
                        <span key={s} className="tag">{s}</span>
                      ))}
                    </div>
                  </div>

                  <div className="rsec" style={{ borderBottom: 'none' }}>
                    <div className="sec-label">Permanent Fix</div>
                    <div className="perm-fix">{result.recommendations.root_cause_fix}</div>
                    <div className="extra-row" style={{ marginTop: 12 }}>
                      {result.recommendations.escalate_to && (
                        <span className="pill-esc">↑ {result.recommendations.escalate_to}</span>
                      )}
                      <span className="pill-eta">ETA {result.recommendations.estimated_resolution_mins}m</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: ACTIONS */}
              {activeTab === 'actions' && (
                <div>
                  <div className="rsec">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div className="sec-label" style={{ margin: 0 }}>Immediate Actions</div>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {Object.values(checked).filter(Boolean).length}/{result.recommendations.immediate_actions.length} done
                      </span>
                    </div>
                    <div className="actions">
                      {result.recommendations.immediate_actions.map((a, i) => (
                        <div
                          key={i}
                          className={`action-item action-check ${checked[i] ? 'checked' : ''}`}
                          onClick={() => setChecked(prev => ({ ...prev, [i]: !prev[i] }))}
                        >
                          <div className={`check-box ${checked[i] ? 'checked' : ''}`}>
                            {checked[i] && '✓'}
                          </div>
                          <span className="a-num">{String(i + 1).padStart(2, '0')}</span>
                          <span style={{ textDecoration: checked[i] ? 'line-through' : 'none', color: checked[i] ? 'var(--text-muted)' : 'inherit' }}>
                            {a}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {allChecked && (
                    <div className="rsec" style={{ background: 'var(--green-dim)', borderRadius: 8, margin: '0 18px 14px', border: '1px solid rgba(63,185,80,0.3)', borderBottom: '1px solid rgba(63,185,80,0.3)' }}>
                      <div style={{ color: 'var(--green)', fontWeight: 600, fontSize: 13 }}>
                        All immediate actions completed!
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                        Proceed to the permanent fix: {result.recommendations.root_cause_fix}
                      </div>
                    </div>
                  )}

                  <div className="rsec" style={{ borderBottom: 'none' }}>
                    <div className="sec-label">Escalation</div>
                    <div className="extra-row">
                      {result.recommendations.escalate_to && (
                        <span className="pill-esc">↑ {result.recommendations.escalate_to}</span>
                      )}
                      <span className="pill-eta">ETA {result.recommendations.estimated_resolution_mins}m</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: EVALUATION */}
              {activeTab === 'evaluation' && (
                <div>
                  <div className="rsec">
                    <div className="eval-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                      <div className="eval-card">
                        <div className="lbl">Overall Score</div>
                        <div className="eval-num">{result.evaluation.overall_score}<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/5</span></div>
                      </div>
                      <div className="eval-card">
                        <div className="lbl">Hallucination</div>
                        {result.evaluation.hallucination_detected
                          ? <span className="badge-no">Detected</span>
                          : <span className="badge-ok">None</span>}
                      </div>
                      <div className="eval-card">
                        <div className="lbl">Status</div>
                        {result.evaluation.passed
                          ? <span className="badge-ok">Passed</span>
                          : <span className="badge-no">Failed</span>}
                      </div>
                    </div>
                  </div>

                  {result.evaluation.reasoning && (
                    <div className="rsec">
                      <div className="sec-label">Evaluator Reasoning</div>
                      <div className="perm-fix" style={{ borderLeftColor: 'var(--purple)' }}>
                        {result.evaluation.reasoning}
                      </div>
                    </div>
                  )}

                  {/* Score bar */}
                  <div className="rsec">
                    <div className="sec-label">Score Breakdown</div>
                    {[
                      ['Accuracy',     result.evaluation.accuracy_score],
                      ['Quality',      result.evaluation.quality_score],
                      ['Overall',      result.evaluation.overall_score],
                    ].map(([label, val]) => val != null && (
                      <div key={label} className="score-item" style={{ marginBottom: 10 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 64 }}>{label}</span>
                        <div className="score-track">
                          <div className="score-bar" style={{ width: `${(val / 5) * 100}%` }} />
                        </div>
                        <span className="score-ct">{val}/5</span>
                      </div>
                    ))}
                  </div>

                  {/* Feedback */}
                  <div className="rsec" style={{ borderBottom: 'none' }}>
                    <div className="sec-label">Was this analysis helpful?</div>
                    {feedbackSent
                      ? <div className="thanks">✓ Thanks for your feedback!</div>
                      : (
                        <div>
                          <div className="stars">
                            {[1,2,3,4,5].map(s => (
                              <button key={s} className={`star ${feedback >= s ? 'on' : ''}`} onClick={() => handleFeedback(s)}>★</button>
                            ))}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                            Feedback helps improve the AI pipeline
                          </div>
                        </div>
                      )
                    }
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
