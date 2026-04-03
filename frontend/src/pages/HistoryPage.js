import { useState, useEffect } from 'react';
import { getIncidents } from '../api';
import { loadDemoData, clearDemoData } from '../demoData';

const PER_PAGE = 10;

function getLocalHistory() {
  try { return JSON.parse(localStorage.getItem('incident_history') || '[]'); }
  catch { return []; }
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function sevClass(s) {
  return s === 'P1' ? 'sev-p1' : s === 'P2' ? 'sev-p2' : 'sev-p3';
}

/** Merge backend audit rows + localStorage entries, deduplicated by request_id */
function mergeHistory(backendRows, localEntries) {
  const localMap = {};
  localEntries.forEach(e => { localMap[e.id] = e; });

  // backend rows → normalised shape
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

  // any localStorage-only entries not in backend
  const backendIds = new Set(backendRows.map(r => r.request_id));
  const localOnly  = localEntries.filter(e => !backendIds.has(e.id));

  return [...fromBackend, ...localOnly]
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export default function HistoryPage() {
  const [allRows,  setAllRows]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState(null);

  const load = () => {
    setLoading(true);
    getIncidents()
      .then(r => {
        const merged = mergeHistory(r.data.incidents || [], getLocalHistory());
        setAllRows(merged);
      })
      .catch(() => {
        // backend unavailable — fall back to localStorage only
        const local = [...getLocalHistory()].sort((a, b) => new Date(b.date) - new Date(a.date));
        setAllRows(local);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadDemo = () => { loadDemoData(); load(); };
  const handleClear    = () => { clearDemoData(); load(); };

  const filtered = allRows
    .filter(i => filter === 'all' || i.severity === filter)
    .filter(i => !search || i.title?.toLowerCase().includes(search.toLowerCase()));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const changeFilter = f => { setFilter(f); setPage(1); };
  const changeSearch = v => { setSearch(v);  setPage(1); };

  const exportCSV = () => {
    const headers = ['Date', 'Severity', 'Title', 'Eval Score', 'Latency (ms)', 'Services'];
    const csvRows = filtered.map(i => [
      new Date(i.date).toISOString(),
      i.severity,
      `"${(i.title || '').replace(/"/g, '""')}"`,
      i.evalScore,
      i.latency,
      (i.services || []).join(';'),
    ]);
    const csv = [headers, ...csvRows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'incident_history.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="inner-page">
      <div className="page-topbar">
        <div>
          <h1 className="page-title">Incident History</h1>
          <p className="page-sub">{allRows.length} incidents</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {allRows.length > 0 && (
            <button className="qa-btn" onClick={exportCSV}>
              <span className="qa-icon">↓</span> Export CSV
            </button>
          )}
          <button className="qa-btn" onClick={handleLoadDemo}>
            <span className="qa-icon">⬇</span> Load Demo Data
          </button>
          {allRows.length > 0 && (
            <button className="qa-btn" onClick={handleClear} style={{ color: 'var(--red)', borderColor: 'rgba(248,81,73,0.3)' }}>
              Clear Local
            </button>
          )}
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="history-toolbar">
        <input
          className="search-input"
          placeholder="Search by title..."
          value={search}
          onChange={e => changeSearch(e.target.value)}
        />
        <div className="filter-pills">
          {['all', 'P1', 'P2', 'P3'].map(f => (
            <button key={f} className={`filter-pill ${filter === f ? 'active' : ''}`} onClick={() => changeFilter(f)}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="history-table">
        <div className="history-table-head">
          <span className="th">Sev</span>
          <span className="th">Title</span>
          <span className="th">Date</span>
          <span className="th">Eval</span>
          <span className="th">Latency</span>
          <span className="th"></span>
        </div>

        {loading ? (
          <div className="history-empty">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="history-empty">
            {allRows.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No incidents yet — run a triage or load demo data.</div>
                <button className="btn-run btn-inline" onClick={handleLoadDemo}>⬇ Load Demo Data</button>
              </div>
            ) : 'No results match your search or filter.'}
          </div>
        ) : (
          rows.map(item => (
            <div key={item.id} className="history-row">
              <span className={`sev-badge ${sevClass(item.severity)}`}>{item.severity}</span>
              <span className="hr-title" title={item.title}>{item.title}</span>
              <span className="hr-date">{fmtDate(item.date)}</span>
              <span className="hr-score">{item.evalScore}/5</span>
              <span className="hr-latency">{item.latency}ms</span>
              {item.result
                ? <button className="btn-view" onClick={() => setSelected(item)}>View</button>
                : <span className="hr-latency">—</span>
              }
            </div>
          ))
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i + 1} className={`page-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>
                {i + 1}
              </button>
            ))}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>→</button>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`sev-badge ${sevClass(selected.severity)}`}>{selected.severity}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{selected.title}</span>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="result-meta" style={{ padding: '8px 0 14px' }}>
                <span className="mpill hi">ID: {selected.result.request_id}</span>
                <span className="mpill">{selected.result.latency_ms}ms</span>
                <span className="mpill">{selected.result.context_used} incidents retrieved</span>
                {selected.result.pii_masked && <span className="mpill">PII masked</span>}
              </div>
              <div className="rsec" style={{ paddingLeft: 0, paddingRight: 0 }}>
                <div className="sec-label">Root Cause</div>
                <p className="root-cause">{selected.result.analysis.root_cause}</p>
                <div className="tags" style={{ marginTop: 8 }}>
                  {selected.result.analysis.affected_services.map(s => <span key={s} className="tag">{s}</span>)}
                </div>
              </div>
              <div className="rsec" style={{ paddingLeft: 0, paddingRight: 0 }}>
                <div className="sec-label">Immediate Actions</div>
                <div className="actions">
                  {selected.result.recommendations.immediate_actions.map((a, i) => (
                    <div key={i} className="action-item">
                      <span className="a-num">{String(i + 1).padStart(2, '0')}</span>{a}
                    </div>
                  ))}
                </div>
                <div className="perm-fix" style={{ marginTop: 12 }}>{selected.result.recommendations.root_cause_fix}</div>
                <div className="extra-row">
                  {selected.result.recommendations.escalate_to && (
                    <span className="pill-esc">↑ {selected.result.recommendations.escalate_to}</span>
                  )}
                  <span className="pill-eta">ETA {selected.result.recommendations.estimated_resolution_mins}m</span>
                </div>
              </div>
              <div className="rsec" style={{ paddingLeft: 0, paddingRight: 0, borderBottom: 'none' }}>
                <div className="sec-label">Evaluation</div>
                <div className="eval-grid">
                  <div className="eval-card">
                    <div className="lbl">Score</div>
                    <div className="eval-num">{selected.result.evaluation.overall_score}/5</div>
                  </div>
                  <div className="eval-card">
                    <div className="lbl">Hallucination</div>
                    {selected.result.evaluation.hallucination_detected
                      ? <span className="badge-no">Detected</span>
                      : <span className="badge-ok">None</span>}
                  </div>
                  <div className="eval-card">
                    <div className="lbl">Status</div>
                    {selected.result.evaluation.passed
                      ? <span className="badge-ok">Passed</span>
                      : <span className="badge-no">Failed</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
