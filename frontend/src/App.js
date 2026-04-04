import { useState } from 'react';
import HomePage    from './pages/HomePage';
import TriagePage  from './pages/TriagePage';
import MetricsPage from './pages/MetricsPage';
import HistoryPage from './pages/HistoryPage';
import ReadmePage  from './pages/ReadmePage';
import Toast from './components/Toast';
import './App.css';

const NAV = [
  { id: 'readme',  icon: '◉', label: 'Product Overview' },
  { id: 'home',    icon: '⬡', label: 'Dashboard'        },
  { id: 'triage',  icon: '⚡', label: 'Triage'           },
  { id: 'history', icon: '◫', label: 'History'          },
  { id: 'metrics', icon: '◈', label: 'Metrics'          },
];

const PAGE_MAP = {
  home:    HomePage,
  triage:  TriagePage,
  history: HistoryPage,
  metrics: MetricsPage,
  readme:  ReadmePage,
};

export default function App() {
  const [page, setPage] = useState('readme');
  const CurrentPage = PAGE_MAP[page];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="nav-dot" />
          <span className="brand-text">IncidentAI</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(item => (
            <button
              key={item.id}
              className={`sidebar-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-version">v2.0</div>
          <div className="sidebar-status">
            <span className="status-dot" />
            Live
          </div>
        </div>
      </aside>

      <main className="app-main">
        <CurrentPage onNavigate={setPage} />
      </main>
      <Toast />
    </div>
  );
}
