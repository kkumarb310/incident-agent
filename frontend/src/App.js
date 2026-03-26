import { useState } from 'react';
import TriagePage from './pages/TriagePage';
import MetricsPage from './pages/MetricsPage';
import './App.css';

function App() {
  const [page, setPage] = useState('triage');

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <span className="nav-dot"></span>
          Incident Agent
        </div>
        <div className="nav-links">
          <button
            className={page === 'triage' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setPage('triage')}
          >
            Triage
          </button>
          <button
            className={page === 'metrics' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setPage('metrics')}
          >
            Metrics
          </button>
        </div>
      </nav>
      <main className="main">
        {page === 'triage' ? <TriagePage /> : <MetricsPage />}
      </main>
    </div>
  );
}

export default App;