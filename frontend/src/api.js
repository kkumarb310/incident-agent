import { useState } from 'react';
import './App.css';
import TriagePage from './pages/TriagePage';
import MetricsPage from './pages/MetricsPage';

export default function App() {
  const [page, setPage] = useState('triage');
  return (
    <>
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-dot" />
          Incident Agent
        </div>
        <div className="nav-links">
          <button className={`nav-btn ${page === 'triage' ? 'active' : ''}`} onClick={() => setPage('triage')}>Triage</button>
          <button className={`nav-btn ${page === 'metrics' ? 'active' : ''}`} onClick={() => setPage('metrics')}>Metrics</button>
        </div>
        <div className="nav-badge">v1.0 · claude-sonnet</div>
      </nav>
      {page === 'triage' ? <TriagePage /> : <MetricsPage />}
    </>
  );
}
