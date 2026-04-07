import { useState } from 'react';

/* ── Demo Tour Modal ─────────────────────────────────────────────────────── */
const DEMO_PAGES = [
  {
    id: 'home',
    icon: '▦',
    label: 'Dashboard',
    desc: 'Live incident feed with auto-refresh every 30 seconds. System status banner, trend arrows, MTTR sparkline, and a slide-in detail drawer for every incident.',
    preview: [
      '● System Status — Healthy (92% pass rate)',
      '▦ Active Incidents   ◈ Avg Eval Score   ⏱ Avg Latency',
      '────────────────────────────────────────',
      '⚡ P1  DB connection pool exhausted       14s ago',
      '⚠  P2  Auth service 500 on logins        2m ago',
      '◎  P3  Rate limiter blocking mobile       5m ago',
      '────────────────────────────────────────',
      'MTTR Trend ▂▃▅▄▃▂  Last 7 incidents',
    ],
  },
  {
    id: 'triage',
    icon: '⚡',
    label: 'Triage',
    desc: 'Paste an incident title and description. Four AI agents run in sequence — Retrieval, Analysis, Recommendation, Evaluation — returning severity, root cause, and fix steps in under 20 seconds.',
    preview: [
      'INCIDENT TITLE',
      '┌─────────────────────────────────────┐',
      '│ Database timeouts degrading checkout│',
      '└─────────────────────────────────────┘',
      'DESCRIPTION',
      '┌─────────────────────────────────────┐',
      '│ Payment service throwing connection │',
      '│ timeout. 30% order failure rate...  │',
      '└─────────────────────────────────────┘',
      '⚡ Analyse Incident',
      '',
      '◈ Retrieving similar incidents...',
      '⚙ Analyzing root cause...',
      '⬡ Generating recommendations...',
      '◫ Evaluating response quality...',
    ],
  },
  {
    id: 'history',
    icon: '☰',
    label: 'History',
    desc: 'Full audit log of every triage. Sortable by date or eval score. Date group badges separate rows by day. Every decision is permanently recorded — severity, model used, confidence, latency.',
    preview: [
      'DATE ↑↓    TITLE              SEV   SCORE',
      '────────────────────────────────────────',
      '── Today ─────────────────────────────',
      '09:14   DB timeouts          P1    4.8/5',
      '08:51   Auth 500 logins      P2    4.6/5',
      '── Yesterday ──────────────────────────',
      '23:02   Rate limiter 429     P3    4.9/5',
      '21:44   Redis OOM            P1    4.7/5',
      '────────────────────────────────────────',
      'Showing 24 incidents · Sorted by date',
    ],
  },
  {
    id: 'metrics',
    icon: '◈',
    label: 'Metrics',
    desc: 'System Health Score (0–100), avg latency trend, eval score trend, model usage breakdown, and range pills (7d / 30d / 90d) to filter all metrics by time window.',
    preview: [
      'Range: [ 7d ] [ 30d ] [ 90d ] [ All ]',
      '────────────────────────────────────────',
      'System Health Score',
      '█████████████████░░  87 / 100  Healthy',
      '',
      'Avg Latency    14.2s  ↓ improving',
      'Avg Eval Score  4.7   ↑ improving',
      'Total Incidents  24',
      'P1 / P2 / P3    6 / 11 / 7',
      '────────────────────────────────────────',
      'Model usage: Sonnet 4.6 ██████████ 96%',
      '             Haiku 4.5  █ 4% (fallback)',
    ],
  },
];

function DemoModal({ onClose, onNavigate }) {
  const [idx, setIdx] = useState(0);
  const page = DEMO_PAGES[idx];
  return (
    <div className="lp-demo-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="lp-demo-modal">
        <div className="lp-demo-header">
          <div>
            <div className="lp-demo-eyebrow">Product Tour</div>
            <div className="lp-demo-title">IncidentAI — Live Demo</div>
          </div>
          <button className="lp-demo-close" onClick={onClose}>✕</button>
        </div>

        {/* tab row */}
        <div className="lp-demo-tabs">
          {DEMO_PAGES.map((p, i) => (
            <button
              key={p.id}
              className={`lp-demo-tab ${i === idx ? 'active' : ''}`}
              onClick={() => setIdx(i)}
            >
              <span>{p.icon}</span> {p.label}
            </button>
          ))}
        </div>

        {/* content */}
        <div className="lp-demo-body">
          <div className="lp-demo-desc">{page.desc}</div>
          <div className="lp-demo-preview">
            {page.preview.map((line, i) => (
              <div key={i} className="lp-demo-line">{line || '\u00a0'}</div>
            ))}
          </div>
        </div>

        {/* footer */}
        <div className="lp-demo-footer">
          <div className="lp-demo-dots">
            {DEMO_PAGES.map((_, i) => (
              <span key={i} className={`lp-demo-dot ${i === idx ? 'active' : ''}`} onClick={() => setIdx(i)} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="lp-demo-nav" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>← Prev</button>
            <button className="lp-demo-nav primary" onClick={() => { onClose(); onNavigate(page.id); }}>
              Open {page.label} →
            </button>
            {idx < DEMO_PAGES.length - 1 && (
              <button className="lp-demo-nav" onClick={() => setIdx(i => i + 1)}>Next →</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Top Nav ─────────────────────────────────────────────────────────────── */
function TopNav({ onNavigate, openDemo }) {
  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  const [menuOpen, setMenuOpen] = useState(false);

  const NAV_LINKS = [
    { label: 'Features',     action: () => scrollTo('features')     },
    { label: 'How It Works', action: () => scrollTo('how-it-works') },
    { label: 'Integrations', action: () => scrollTo('integrations') },
    { label: 'FAQ',          action: () => scrollTo('faq')          },
  ];

  return (
    <nav className="lp-topnav">
      <div className="lp-topnav-inner">
        {/* Brand */}
        <button className="lp-topnav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="nav-dot" style={{ width: 10, height: 10 }} />
          <span className="lp-topnav-brand-text">IncidentAI</span>
        </button>

        {/* Centre links — desktop */}
        <div className="lp-topnav-links">
          {NAV_LINKS.map(l => (
            <button key={l.label} className="lp-topnav-link" onClick={l.action}>{l.label}</button>
          ))}
        </div>

        {/* Right CTAs */}
        <div className="lp-topnav-ctas">
          <a className="lp-topnav-link" href="https://incident-agent-production.up.railway.app/docs" target="_blank" rel="noopener noreferrer">
            API Docs ↗
          </a>
          <button className="lp-topnav-link" onClick={() => onNavigate('home')}>Open App →</button>
          <button className="lp-btn-primary" style={{ padding: '8px 18px', fontSize: 13 }} onClick={openDemo}>Get a demo</button>
        </div>

        {/* Hamburger — mobile */}
        <button className="lp-topnav-hamburger" onClick={() => setMenuOpen(o => !o)}>☰</button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="lp-topnav-mobile">
          {NAV_LINKS.map(l => (
            <button key={l.label} className="lp-topnav-mobile-link" onClick={() => { l.action(); setMenuOpen(false); }}>{l.label}</button>
          ))}
          <button className="lp-topnav-mobile-link" onClick={() => onNavigate('home')}>Open App →</button>
          <button className="lp-topnav-mobile-link" onClick={() => { openDemo(); setMenuOpen(false); }}>Get a demo</button>
        </div>
      )}
    </nav>
  );
}

/* ── Main Landing Page ───────────────────────────────────────────────────── */
export default function LandingPage({ onNavigate }) {
  const [showDemo, setShowDemo] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const openDemo = () => setShowDemo(true);

  /* ── shared small components ── */
  const Badge = ({ children }) => <span className="lp-badge">{children}</span>;

  const BentoCard = ({ icon, title, body, accent, wide }) => (
    <div className={`lp-bento-card${wide ? ' wide' : ''}`} style={{ '--b-accent': accent || 'var(--accent)' }}>
      <div className="lp-bento-icon">{icon}</div>
      <div className="lp-bento-title">{title}</div>
      <div className="lp-bento-body">{body}</div>
    </div>
  );

  const FAQ_ITEMS = [
    { q: 'What is IncidentAI?', a: 'IncidentAI is a multi-agent AI pipeline that automatically triages production incidents. It determines severity, identifies root cause, and generates specific fix steps — all in under 20 seconds.' },
    { q: 'Does it replace my SRE team?', a: 'No. It automates the first 10–15 minutes of incident response — the diagnosis phase — so your engineers skip straight to resolution. It is a co-pilot, not a replacement.' },
    { q: 'How is it different from a rule-based alert system?', a: 'Rule-based systems only return a result when a keyword matches a pre-written rule. IncidentAI reasons from context — it handles novel incident types it has never seen before, and its knowledge grows with every incident stored.' },
    { q: 'What types of incidents can it handle?', a: 'Any incident described in plain English: database failures, cascading service outages, Kafka consumer lag, silent revenue drops, auth regressions, deployment-triggered regressions, and more.' },
    { q: 'How does it detect root cause?', a: 'The Retrieval Agent finds the 3 most semantically similar past incidents from 30 stored in ChromaDB. The Analysis Agent (Claude Sonnet 4.6) reasons across the current incident and those examples to identify the most likely root cause chain.' },
    { q: 'Does it check its own answers?', a: 'Yes. The Evaluation Agent is a fourth Claude call that scores every response on accuracy, hallucination risk, recommendation quality, and actionability — before the result reaches you.' },
    { q: 'How does it reduce alert fatigue?', a: 'By converting raw alerts into prioritised, context-rich triage results. Instead of raw error strings, engineers receive a severity level, a one-sentence root cause, and numbered fix steps — in under 20 seconds.' },
    { q: 'What integrations does it support?', a: 'PagerDuty (webhook), REST API (any tool), Slack (via webhook), and Jira (planned). It exposes a standard JSON API so any monitoring tool can send incidents to it.' },
    { q: 'How long does deployment take?', a: 'The backend runs on Railway and the frontend on Netlify. A full deployment — including your own Anthropic API key and custom past incident data — takes less than a day.' },
  ];

  return (
    <div className="lp-root">
      {showDemo && <DemoModal onClose={() => setShowDemo(false)} onNavigate={onNavigate} />}

      <TopNav onNavigate={onNavigate} openDemo={openDemo} />

      {/* ══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="lp-hero" style={{ paddingTop: 120 }}>
        <Badge>AI SRE</Badge>
        <h1 className="lp-hero-h1">
          AI that <em>resolves incidents</em><br />like your best engineer
        </h1>
        <p className="lp-hero-sub">
          IncidentAI drastically shortens the time from alert to resolution by automating
          investigation, root cause analysis, and fix steps — all in under 20 seconds.
        </p>
        <div className="lp-hero-actions">
          <button className="lp-btn-primary" onClick={openDemo}>Get a demo</button>
          <button className="lp-btn-ghost" onClick={() => onNavigate('triage')}>⚡ Try Triage now</button>
        </div>

        {/* stat row */}
        <div className="lp-hero-stats">
          {[
            { val: '5×',   label: 'Faster than manual triage',       color: 'var(--accent)' },
            { val: '<20s', label: 'End-to-end triage response',       color: 'var(--blue)'   },
            { val: '80%',  label: 'Of response automated',            color: 'var(--purple)' },
            { val: '100%', label: 'Auditable — every decision logged', color: 'var(--green)'  },
          ].map(s => (
            <div key={s.val} className="lp-hero-stat">
              <div className="lp-hero-stat-val" style={{ color: s.color }}>{s.val}</div>
              <div className="lp-hero-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ THE SRE THAT DOESN'T SLEEP ═══════════════════════════════════ */}
      <section id="features" className="lp-section lp-section-dark">
        <div className="lp-section-inner">
          <div className="lp-eyebrow">Always on</div>
          <h2 className="lp-section-h2">The SRE that doesn't sleep</h2>
          <p className="lp-section-sub">
            IncidentAI runs 24/7. The moment a PagerDuty alert fires, the pipeline starts.
            By the time your engineer picks up the phone, the diagnosis is already done.
          </p>
          <div className="lp-three-col">
            {[
              { icon: '◎', title: 'Spots issues automatically', body: 'Receives alerts via PagerDuty webhook or direct API. No manual copy-paste required.' },
              { icon: '🧠', title: 'Surfaces root causes', body: 'Searches 30 past incidents semantically and reasons across all signals to find the actual failure point.' },
              { icon: '📋', title: 'Tells you exactly what to do', body: 'Returns numbered, specific fix steps your on-call engineer can execute at 2 AM without a runbook.' },
            ].map(c => (
              <div key={c.title} className="lp-feature-card">
                <div className="lp-feature-icon">{c.icon}</div>
                <div className="lp-feature-title">{c.title}</div>
                <div className="lp-feature-body">{c.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURE SHOWCASE — 4 TABS ════════════════════════════════════ */}
      <div id="how-it-works"><FeatureTabs onNavigate={onNavigate} openDemo={openDemo} /></div>

      {/* ══ FASTER RESOLUTION. FEWER FIRE DRILLS ════════════════════════ */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-eyebrow">Benefits</div>
          <h2 className="lp-section-h2">Faster resolution. Fewer fire drills.</h2>
          <div className="lp-three-col" style={{ marginTop: 32 }}>
            {[
              { icon: '⚡', val: '5×', title: 'Resolve incidents faster', body: 'Investigation starts the moment an alert fires. Your engineer skips diagnosis and goes straight to resolution.', color: 'var(--accent)' },
              { icon: '◎', val: '80%', title: 'Eliminate alert fatigue', body: 'Every alert arrives with context, severity, and prioritised next steps — not just a raw error string.', color: 'var(--blue)' },
              { icon: '◈', val: '100%', title: 'Keep builders building', body: 'Automates the first 80% of incident response. Engineers stay focused on shipping, not firefighting.', color: 'var(--green)' },
            ].map(c => (
              <div key={c.title} className="lp-benefit-card">
                <div className="lp-benefit-val" style={{ color: c.color }}>{c.val}</div>
                <div className="lp-benefit-title">{c.title}</div>
                <div className="lp-benefit-body">{c.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CUSTOMER TESTIMONIALS ════════════════════════════════════════ */}
      <section className="lp-section lp-section-dark lp-section-blank">
        <div className="lp-section-inner" style={{ textAlign: 'center' }}>
          <div className="lp-eyebrow">Customer testimonials</div>
          <h2 className="lp-section-h2" style={{ opacity: 0.3 }}>Coming soon</h2>
          <p className="lp-section-sub" style={{ opacity: 0.3 }}>Customer stories will appear here.</p>
        </div>
      </section>

      {/* ══ INVESTIGATION DATA SOURCES ═══════════════════════════════════ */}
      <section id="integrations" className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-eyebrow">How it knows</div>
          <h2 className="lp-section-h2">Connects all your incident signals</h2>
          <p className="lp-section-sub">
            IncidentAI pulls context from multiple sources before reasoning — so it never diagnoses in the dark.
          </p>
          <div className="lp-sources-grid">
            {[
              { icon: '🔔', label: 'Alerts',         sub: 'PagerDuty webhook or REST API',     color: 'var(--red)'    },
              { icon: '📝', label: 'Incident Text',   sub: 'Title + description in plain English', color: 'var(--accent)' },
              { icon: '🗄',  label: 'Past Incidents',  sub: '30 real incidents in ChromaDB RAG', color: 'var(--blue)'   },
              { icon: '🔍', label: 'Semantic Search', sub: 'Vector cosine similarity matching', color: 'var(--purple)'  },
            ].map(s => (
              <div key={s.label} className="lp-source-card" style={{ '--s-color': s.color }}>
                <div className="lp-source-icon">{s.icon}</div>
                <div className="lp-source-label">{s.label}</div>
                <div className="lp-source-sub">{s.sub}</div>
              </div>
            ))}
            <div className="lp-sources-arrow">→</div>
            <div className="lp-source-card lp-source-output" style={{ '--s-color': 'var(--green)' }}>
              <div className="lp-source-icon">⚡</div>
              <div className="lp-source-label">Investigation Result</div>
              <div className="lp-source-sub">Severity · Root cause · Fix steps · Eval score</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FULL PLATFORM INTEGRATION ════════════════════════════════════ */}
      <section className="lp-section lp-section-dark">
        <div className="lp-section-inner">
          <div className="lp-eyebrow">Platform</div>
          <h2 className="lp-section-h2">Full-stack incident intelligence</h2>
          <p className="lp-section-sub">
            Every layer of the stack has a job. Every decision is logged. Nothing is a black box.
          </p>
          <div className="lp-arch-strip">
            {[
              { layer: 'React Dashboard', sub: 'Netlify', items: ['Dashboard', 'Triage', 'History', 'Metrics'], color: 'var(--accent)' },
              { layer: 'FastAPI Backend', sub: 'Railway',  items: ['/triage', '/incidents', '/metrics', '/webhook/pagerduty'], color: 'var(--blue)' },
              { layer: 'Agent Pipeline', sub: 'Orchestrator', items: ['Retrieval', 'Analysis', 'Recommendation', 'Evaluation'], color: 'var(--purple)' },
              { layer: 'Data Layer',     sub: 'SQLite + ChromaDB', items: ['audit_log', 'metrics', 'feedback', '30 RAG incidents'], color: 'var(--green)' },
            ].map(l => (
              <div key={l.layer} className="lp-arch-card" style={{ '--a-color': l.color }}>
                <div className="lp-arch-layer">{l.layer}</div>
                <div className="lp-arch-sub">{l.sub}</div>
                <div className="lp-arch-items">
                  {l.items.map(i => <span key={i} className="lp-arch-item">{i}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURE DEEP-DIVES — BENTO GRID ══════════════════════════════ */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-eyebrow">Capabilities</div>
          <h2 className="lp-section-h2">Built for production reliability</h2>
          <div className="lp-bento-grid">
            <BentoCard wide icon="🧠" accent="var(--accent)"
              title="Pinpoint root cause — not just symptoms"
              body="The Analysis Agent reasons across the incident description and 3 semantically similar past incidents. It identifies the exact component and failure mode — not a generic guess." />
            <BentoCard icon="🔒" accent="var(--amber)"
              title="PII masking before every LLM call"
              body="Microsoft Presidio strips emails, IPs, phone numbers, and names before any data reaches Claude. Stored with pii_masked flag in audit log." />
            <BentoCard icon="✅" accent="var(--green)"
              title="Self-checking answers"
              body="A fourth Claude call scores every response on accuracy, hallucination risk, and actionability — before it reaches the engineer." />
            <BentoCard icon="🛡" accent="var(--red)"
              title="Prompt injection protection"
              body="Input guardrails block 'ignore instructions', jailbreaks, and non-incident text before any LLM call is made." />
            <BentoCard icon="🔄" accent="var(--blue)"
              title="Automatic fallback routing"
              body="If Sonnet 4.6 fails after 3 retries with exponential backoff, Haiku 4.5 takes over. The engineer always gets a response — even during API outages." />
            <BentoCard icon="📊" accent="var(--purple)"
              title="Full audit trail"
              body="Every triage is permanently stored: severity, model used, confidence, latency, eval score, pii_masked. Queryable via /audit and /metrics endpoints." />
          </div>
        </div>
      </section>

      {/* ══ SEE IT IN ACTION (VIDEO) ══════════════════════════════════════ */}
      <section className="lp-section lp-section-dark lp-section-blank">
        <div className="lp-section-inner" style={{ textAlign: 'center' }}>
          <div className="lp-eyebrow">See it in action</div>
          <h2 className="lp-section-h2" style={{ opacity: 0.3 }}>Demo video — coming soon</h2>
          <p className="lp-section-sub" style={{ opacity: 0.3 }}>
            A walkthrough of the full pipeline will be embedded here.
          </p>
          <button className="lp-btn-ghost" style={{ marginTop: 16 }} onClick={openDemo}>
            Take the product tour instead →
          </button>
        </div>
      </section>

      {/* ══ POST-MORTEMS ══════════════════════════════════════════════════ */}
      <section className="lp-section lp-section-blank">
        <div className="lp-section-inner" style={{ textAlign: 'center' }}>
          <div className="lp-eyebrow">Post-mortems</div>
          <h2 className="lp-section-h2" style={{ opacity: 0.3 }}>Automated post-mortems — coming soon</h2>
          <p className="lp-section-sub" style={{ opacity: 0.3 }}>
            AI-drafted timelines, contributing factors, and follow-up actions from your audit log.
          </p>
        </div>
      </section>

      {/* ══ FAQ ════════════════════════════════════════════════════════════ */}
      <section id="faq" className="lp-section lp-section-dark">
        <div className="lp-section-inner">
          <div className="lp-eyebrow">FAQ</div>
          <h2 className="lp-section-h2">Common questions</h2>
          <div className="lp-faq">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className={`lp-faq-item ${openFaq === i ? 'open' : ''}`}>
                <button className="lp-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {item.q}
                  <span className="lp-faq-arrow">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && <div className="lp-faq-a">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA — "SO GOOD YOU'LL BREAK THINGS ON PURPOSE" ═══════════════ */}
      <section className="lp-section lp-cta-section">
        <div className="lp-section-inner" style={{ textAlign: 'center' }}>
          <div className="lp-eyebrow">Ready?</div>
          <h2 className="lp-cta-h2">So good, you'll break things on purpose</h2>
          <p className="lp-section-sub">
            Modern incident response for engineering teams who can't afford 15-minute diagnosis times.
          </p>
          <div className="lp-cta-bullets">
            {[
              '4-agent AI pipeline, live on Railway + Netlify',
              'PagerDuty webhook — zero manual copy-paste',
              'Every decision auditable — scored and logged',
              'Deploys in under a day with your own API key',
            ].map(b => (
              <div key={b} className="lp-cta-bullet">
                <span style={{ color: 'var(--green)' }}>✓</span> {b}
              </div>
            ))}
          </div>
          <div className="lp-cta-actions">
            <button className="lp-btn-primary lp-btn-large" onClick={openDemo}>Get a demo</button>
            <button className="lp-btn-ghost" onClick={() => onNavigate('triage')}>⚡ Try Triage now</button>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════ */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <span className="nav-dot" />
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>IncidentAI</span>
          </div>
          <div className="lp-footer-cols">
            <div className="lp-footer-col">
              <div className="lp-footer-col-head">Product</div>
              {[
                { label: 'Dashboard',       id: 'home'    },
                { label: 'Triage',          id: 'triage'  },
                { label: 'History',         id: 'history' },
                { label: 'Metrics',         id: 'metrics' },
              ].map(l => (
                <button key={l.id} className="lp-footer-link" onClick={() => onNavigate(l.id)}>{l.label}</button>
              ))}
            </div>
            <div className="lp-footer-col">
              <div className="lp-footer-col-head">Developers</div>
              <a className="lp-footer-link" href="https://incident-agent-production.up.railway.app/docs" target="_blank" rel="noopener noreferrer">API Docs ↗</a>
              <button className="lp-footer-link" onClick={() => onNavigate('readme')}>Product Overview</button>
            </div>
            <div className="lp-footer-col">
              <div className="lp-footer-col-head">Stack</div>
              {['FastAPI · Python', 'Claude Sonnet 4.6', 'ChromaDB · RAG', 'Railway · Netlify'].map(t => (
                <span key={t} className="lp-footer-tech">{t}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="lp-footer-bar">
          © 2026 IncidentAI · Multi-Agent Incident Intelligence Platform
        </div>
      </footer>
    </div>
  );
}

/* ── Feature Showcase Tabs ─────────────────────────────────────────────── */
function FeatureTabs({ onNavigate, openDemo }) {
  const [tab, setTab] = useState(0);
  const TABS = [
    {
      label: 'Investigate the issue',
      icon: '◈',
      heading: 'Triage any incident in under 20 seconds',
      body: 'Paste the incident title and description — or let PagerDuty send it automatically. The Retrieval Agent immediately searches 30 past incidents for semantically similar cases to ground the diagnosis.',
      points: ['Semantic search over ChromaDB vector store', 'No keyword rules — understands meaning', 'Handles novel incident types it has never seen'],
      cta: 'Try Triage',
      ctaId: 'triage',
    },
    {
      label: 'Find root cause',
      icon: '🧠',
      heading: 'Root cause, not just symptoms',
      body: 'The Analysis Agent receives the incident plus 3 similar past cases. Claude Sonnet 4.6 reasons across all signals and returns a one-sentence root cause identifying the exact component and failure mode.',
      points: ['Claude Sonnet 4.6 with structured JSON output', 'Pydantic schema validation + auto-retry', 'Confidence score (0.0–1.0) on every diagnosis'],
      cta: 'See it live',
      ctaId: 'triage',
    },
    {
      label: 'Collaborate with IncidentAI',
      icon: '⚡',
      heading: 'Specific fix steps — not generic advice',
      body: 'The Recommendation Agent produces ordered, numbered steps an engineer can execute at 2 AM without a runbook. Escalation path, affected services, and estimated resolution time included.',
      points: ['Immediate actions — ordered and specific', 'Permanent fix recommendation', 'Escalation path + estimated resolution mins'],
      cta: 'Open Dashboard',
      ctaId: 'home',
    },
    {
      label: 'Resolve incidents faster',
      icon: '✅',
      heading: 'Self-checking answers before they reach you',
      body: 'The Evaluation Agent — a fourth Claude call — scores every response on accuracy, hallucination risk, recommendation quality, and actionability. The score is stored permanently and tracked on the Metrics page.',
      points: ['8 deterministic rule checks (instant)', 'LLM-as-judge semantic scoring (1–5)', 'Hallucination detection built in'],
      cta: 'View Metrics',
      ctaId: 'metrics',
    },
  ];
  const t = TABS[tab];
  return (
    <section className="lp-section">
      <div className="lp-section-inner">
        <div className="lp-eyebrow">How it works</div>
        <h2 className="lp-section-h2">Four agents. One pipeline. Zero guesswork.</h2>

        <div className="lp-tabs-row">
          {TABS.map((tt, i) => (
            <button key={i} className={`lp-tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
              <span>{tt.icon}</span> {tt.label}
            </button>
          ))}
        </div>

        <div className="lp-tab-panel">
          <div className="lp-tab-text">
            <h3 className="lp-tab-heading">{t.heading}</h3>
            <p className="lp-tab-body">{t.body}</p>
            <ul className="lp-tab-points">
              {t.points.map(p => <li key={p}><span className="lp-check">✓</span>{p}</li>)}
            </ul>
            <button className="lp-btn-primary" style={{ marginTop: 20 }} onClick={() => onNavigate(t.ctaId)}>
              {t.cta} →
            </button>
          </div>
          <div className="lp-tab-visual">
            <div className="lp-tab-agent-stack">
              {['◈ Retrieval Agent', '⚙ Analysis Agent', '⬡ Recommendation Agent', '◫ Evaluation Agent'].map((a, i) => (
                <div key={a} className={`lp-tab-agent ${i === tab ? 'active' : ''}`}>{a}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
