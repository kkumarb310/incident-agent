export default function ReadmePage({ onNavigate }) {

  const Section = ({ id, title, accent, children }) => (
    <div className="rm-section" id={id}>
      <div className="rm-section-head" style={{ borderLeftColor: accent || 'var(--accent)' }}>
        <h2 className="rm-section-title">{title}</h2>
      </div>
      {children}
    </div>
  );

  const Pill = ({ label, color }) => (
    <span className="rm-pill" style={{ background: `${color}18`, border: `1px solid ${color}44`, color }}>{label}</span>
  );

  const Card = ({ icon, title, body, accent }) => (
    <div className="rm-card" style={{ borderTopColor: accent || 'var(--accent)' }}>
      <div className="rm-card-icon" style={{ color: accent || 'var(--accent)' }}>{icon}</div>
      <div className="rm-card-title">{title}</div>
      <div className="rm-card-body">{body}</div>
    </div>
  );

  const Step = ({ n, title, body, accent }) => (
    <div className="rm-step">
      <div className="rm-step-num" style={{ background: `${accent || 'var(--accent)'}22`, color: accent || 'var(--accent)', border: `1px solid ${accent || 'var(--accent)'}44` }}>{n}</div>
      <div>
        <div className="rm-step-title">{title}</div>
        <div className="rm-step-body">{body}</div>
      </div>
    </div>
  );

  const TechRow = ({ label, value, accent }) => (
    <div className="rm-tech-row">
      <span className="rm-tech-label">{label}</span>
      <span className="rm-tech-value" style={{ color: accent || 'var(--text-secondary)' }}>{value}</span>
    </div>
  );

  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const TOC = [
    { id: 'problem',      label: 'Problem Statement'      },
    { id: 'solution',     label: 'Solution'               },
    { id: 'flow',         label: 'How It Works'           },
    { id: 'architecture', label: 'Architecture'           },
    { id: 'ai-concepts',  label: 'AI/LLM Concepts'        },
    { id: 'guardrails',   label: 'Guardrails'             },
    { id: 'evals',        label: 'Evaluations'            },
    { id: 'pii',          label: 'PII & Compliance'       },
    { id: 'integrations', label: 'Integrations'           },
    { id: 'stack',        label: 'Tech Stack'             },
    { id: 'advantages',   label: 'Advantages'             },
  ];

  return (
    <div className="inner-page rm-page">

      {/* ── HERO ── */}
      <div className="rm-hero">
        {/* Left: branding + CTA */}
        <div className="rm-hero-left">
          <div className="rm-hero-badge">
            <span className="nav-dot" style={{ width: 8, height: 8 }} />
            Enterprise AI · Incident Management
          </div>
          <h1 className="rm-hero-title">Incident<span>AI</span></h1>
          <div className="rm-hero-tagline">Multi-Agent Incident Intelligence Platform</div>
          <p className="rm-hero-sub">
            Automatically triages production incidents — severity, root cause, and fix steps in under 20 seconds.
          </p>
          <div className="rm-hero-actions">
            <button className="btn-run btn-inline" onClick={() => onNavigate('triage')}>⚡ Try Triage</button>
            <button className="rm-toc-toggle" onClick={() => scrollTo('problem')}>Read docs ↓</button>
          </div>
        </div>

        {/* Right: stat grid + pills */}
        <div className="rm-hero-right">
          <div className="rm-hero-stats-row">
            <div className="rm-hero-stat">
              <div className="rm-hero-stat-val" style={{ color: 'var(--accent)' }}>&lt;20s</div>
              <div className="rm-hero-stat-label">Triage Time</div>
            </div>
            <div className="rm-hero-stat">
              <div className="rm-hero-stat-val" style={{ color: 'var(--blue)' }}>4</div>
              <div className="rm-hero-stat-label">AI Agents</div>
            </div>
            <div className="rm-hero-stat">
              <div className="rm-hero-stat-val" style={{ color: 'var(--purple)' }}>30</div>
              <div className="rm-hero-stat-label">RAG Incidents</div>
            </div>
            <div className="rm-hero-stat">
              <div className="rm-hero-stat-val" style={{ color: 'var(--green)' }}>39</div>
              <div className="rm-hero-stat-label">Tests</div>
            </div>
          </div>
          <div className="rm-hero-pills">
            <Pill label="RAG Pipeline"           color="var(--blue)"   />
            <Pill label="Claude Sonnet 4.6"      color="var(--purple)" />
            <Pill label="PII Masking"            color="var(--amber)"  />
            <Pill label="Self-Evaluation"        color="var(--green)"  />
            <Pill label="Guardrails"             color="var(--red)"    />
            <Pill label="Live on Railway+Netlify" color="var(--accent)" />
          </div>
        </div>
      </div>

      {/* ── TOC ── */}
      <div className="rm-toc">
        <div className="rm-toc-label">Contents</div>
        <div className="rm-toc-links">
          {TOC.map(item => (
            <button key={item.id} className="rm-toc-link" onClick={() => scrollTo(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 1. PROBLEM ── */}
      <Section id="problem" title="Problem Statement" accent="var(--red)">
        <div className="rm-prose">
          <p>
            When a P1 incident fires at 2am, an on-call engineer faces a high-pressure, time-critical situation
            with no structured support. They must manually answer four questions:
          </p>
        </div>
        <div className="rm-4grid">
          <Card icon="🔴" title="How bad is this?" body="Is it P1, P2, or P3? What's the blast radius? Which customers are affected?" accent="var(--red)" />
          <Card icon="🔍" title="What caused it?" body="Root cause diagnosis requires reading logs, tracing dependencies, and pattern-matching against past incidents." accent="var(--amber)" />
          <Card icon="⚙" title="What do I do first?" body="Prioritising the right immediate actions under pressure is hard — and expensive if you get it wrong." accent="var(--blue)" />
          <Card icon="📞" title="Who do I call?" body="Knowing which team to escalate to, and how long to expect resolution, requires institutional knowledge." accent="var(--purple)" />
        </div>
        <div className="rm-callout rm-callout-red">
          <strong>The cost:</strong> Mean Time To Resolution (MTTR) is directly tied to revenue loss, SLA breaches, and customer trust.
          Every minute of a P1 outage at scale costs thousands of dollars. The first 10 minutes — diagnosis — is where the most time is wasted.
        </div>
      </Section>

      {/* ── 2. SOLUTION ── */}
      <Section id="solution" title="Solution" accent="var(--accent)">
        <div className="rm-prose">
          <p>
            IncidentAI automates the first 10–15 minutes of incident response using a
            <strong> multi-agent AI pipeline</strong>. An engineer pastes in the incident title and description —
            or it arrives automatically via PagerDuty webhook — and within 20 seconds receives:
          </p>
        </div>
        <div className="rm-4grid">
          <Card icon="🎯" title="Severity Classification" body="P1 / P2 / P3 with a confidence score, grounded in 30 real past incidents." accent="var(--red)" />
          <Card icon="🧠" title="Root Cause Analysis" body="One-sentence diagnosis identifying the exact component and failure mode." accent="var(--accent)" />
          <Card icon="📋" title="Immediate Actions" body="Ordered, specific steps an engineer can execute at 2am without thinking." accent="var(--blue)" />
          <Card icon="✅" title="Self-Evaluation" body="The system grades its own output for hallucination and quality before returning it." accent="var(--green)" />
        </div>
        <div className="rm-callout rm-callout-green">
          <strong>The result:</strong> Engineers skip the diagnosis phase entirely and go straight to resolution.
          Institutional knowledge is encoded once and available to everyone, 24/7.
        </div>
      </Section>

      {/* ── 3. FLOW ── */}
      <Section id="flow" title="How It Works — Request Flow" accent="var(--blue)">
        <div className="rm-flow">
          <Step n="1" title="Engineer submits incident" body='Title + description entered on Triage page, or received automatically via PagerDuty webhook POST /webhook/pagerduty.' accent="var(--text-secondary)" />
          <div className="rm-flow-arrow">↓</div>
          <Step n="2" title="Input Guardrail" body="Field validation, length limits, prompt injection detection, relevance check. Blocks malformed or irrelevant input before any LLM call." accent="var(--red)" />
          <div className="rm-flow-arrow">↓</div>
          <Step n="3" title="PII Masking (Presidio)" body="Emails, IP addresses, phone numbers, names are detected and redacted. The pii_masked flag is stored in the audit log." accent="var(--amber)" />
          <div className="rm-flow-arrow">↓</div>
          <Step n="4" title="Retrieval Agent — RAG" body="Incident description is embedded into a 384-dim vector. ChromaDB semantic search returns the 3 most similar past incidents as context." accent="var(--blue)" />
          <div className="rm-flow-arrow">↓</div>
          <Step n="5" title="Analysis Agent (Claude call #1)" body="Receives incident + 3 context docs. Returns structured JSON: severity, root_cause, affected_services, confidence. Output validated by Pydantic schema, retried if invalid." accent="var(--accent)" />
          <div className="rm-flow-arrow">↓</div>
          <Step n="6" title="Recommendation Agent (Claude call #2)" body="Receives incident + analysis. Returns: immediate_actions[], root_cause_fix, escalate_to, estimated_resolution_mins. Output validated and retried if needed." accent="var(--accent)" />
          <div className="rm-flow-arrow">↓</div>
          <Step n="7" title="Evaluation Agent (Claude call #3)" body="Claude grades its own output. 8 deterministic checks (instant) + LLM-as-judge for hallucination, accuracy, quality. Merged score out of 5." accent="var(--purple)" />
          <div className="rm-flow-arrow">↓</div>
          <Step n="8" title="Persist to SQLite" body="audit_log + metrics tables updated. Every request permanently recorded with severity, model, score, latency, pii_masked." accent="var(--text-muted)" />
          <div className="rm-flow-arrow">↓</div>
          <Step n="9" title="Response returned" body="Full JSON response → React dashboard renders severity banner, confidence ring, 3-tab results (Summary / Actions / Evaluation)." accent="var(--green)" />
        </div>
      </Section>

      {/* ── 4. ARCHITECTURE ── */}
      <Section id="architecture" title="Architecture" accent="var(--purple)">
        <div className="rm-prose"><p>The system uses a <strong>separation-of-concerns agent architecture</strong> — each agent has exactly one job, one prompt, and one output schema. This makes each agent independently testable, tunable, and replaceable.</p></div>

        <div className="rm-arch-box">
          <div className="rm-arch-layer rm-arch-layer-top">
            <div className="rm-arch-label">React Dashboard (Netlify)</div>
            <div className="rm-arch-sublabels">
              <span>Overview</span><span>Triage</span><span>History</span><span>Metrics</span>
            </div>
          </div>
          <div className="rm-arch-arrow">HTTPS / Axios</div>
          <div className="rm-arch-layer">
            <div className="rm-arch-label">FastAPI Backend (Railway)</div>
            <div className="rm-arch-sublabels">
              <span>/triage</span><span>/incidents</span><span>/metrics</span><span>/webhook/pagerduty</span><span>/feedback</span><span>/audit</span>
            </div>
          </div>
          <div className="rm-arch-arrow">Orchestrator</div>
          <div className="rm-arch-agents">
            {[
              { label: 'PII Masking',           sub: 'Presidio',         color: 'var(--amber)'  },
              { label: 'Retrieval Agent',        sub: 'ChromaDB',        color: 'var(--blue)'   },
              { label: 'Analysis Agent',         sub: 'Claude #1',       color: 'var(--accent)' },
              { label: 'Recommendation Agent',   sub: 'Claude #2',       color: 'var(--accent)' },
              { label: 'Evaluation Agent',       sub: 'Claude #3',       color: 'var(--purple)' },
              { label: 'Input Guardrail',        sub: 'Rule + LLM',      color: 'var(--red)'    },
              { label: 'Output Guardrail',       sub: 'Pydantic + Retry', color: 'var(--red)'   },
            ].map(a => (
              <div key={a.label} className="rm-agent-box" style={{ borderColor: a.color, background: `${a.color}0d` }}>
                <div className="rm-agent-label" style={{ color: a.color }}>{a.label}</div>
                <div className="rm-agent-sub">{a.sub}</div>
              </div>
            ))}
          </div>
          <div className="rm-arch-arrow">SQLite</div>
          <div className="rm-arch-layer rm-arch-layer-bottom">
            <div className="rm-arch-label">Database</div>
            <div className="rm-arch-sublabels">
              <span>audit_log</span><span>metrics</span><span>feedback</span><span>flagged</span>
            </div>
          </div>
        </div>

        <div className="rm-prose" style={{ marginTop: 20 }}>
          <p><strong>External dependencies:</strong></p>
        </div>
        <div className="rm-2grid">
          <Card icon="🤖" title="Anthropic Claude API" body="3 calls per triage: Analysis (Sonnet 4.6) → Recommendation (Sonnet 4.6) → Evaluation (Sonnet 4.6). Haiku 4.5 fallback on primary failure." accent="var(--purple)" />
          <Card icon="🗄" title="ChromaDB Vector Store" body="384-dim embeddings via sentence-transformers all-MiniLM-L6-v2. 30 past incidents pre-ingested. Cosine similarity search returns top-3." accent="var(--blue)" />
        </div>
      </Section>

      {/* ── 5. AI / LLM CONCEPTS ── */}
      <Section id="ai-concepts" title="AI / LLM Concepts Used" accent="var(--accent)">

        <div className="rm-concept-grid">

          <div className="rm-concept-card">
            <div className="rm-concept-tag" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent-border)' }}>Implemented</div>
            <div className="rm-concept-title">RAG — Retrieval Augmented Generation</div>
            <div className="rm-concept-body">
              Before any LLM call, the incident description is embedded into a vector and compared against
              30 past incidents in ChromaDB. The 3 most semantically similar incidents are retrieved and
              passed as context. This grounds Claude's response in real data — not hallucination.
            </div>
            <div className="rm-concept-why"><strong>Why:</strong> LLMs without grounding invent plausible-sounding but wrong root causes. RAG ties the response to what actually happened before.</div>
          </div>

          <div className="rm-concept-card">
            <div className="rm-concept-tag" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent-border)' }}>Implemented</div>
            <div className="rm-concept-title">Multi-Agent Orchestration</div>
            <div className="rm-concept-body">
              4 specialised agents each with a single responsibility: Retrieval, Analysis, Recommendation, Evaluation.
              The Orchestrator coordinates them in sequence, passing outputs as inputs.
              Each agent has its own prompt, output schema, and can be tuned independently.
            </div>
            <div className="rm-concept-why"><strong>Why:</strong> One big prompt does everything poorly. Separation of concerns means each agent is optimised, testable, and replaceable without touching the others.</div>
          </div>

          <div className="rm-concept-card">
            <div className="rm-concept-tag" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent-border)' }}>Implemented</div>
            <div className="rm-concept-title">Claude-as-Judge (LLM Evaluation)</div>
            <div className="rm-concept-body">
              A fourth Claude call evaluates the pipeline output after generation. It checks:
              accuracy against retrieved context, hallucination detection, recommendation quality,
              and actionability. Produces a score out of 5 stored permanently in SQLite.
            </div>
            <div className="rm-concept-why"><strong>Why:</strong> Without self-evaluation you have no signal on quality drift. The score over time is the primary metric for prompt improvement.</div>
          </div>

          <div className="rm-concept-card">
            <div className="rm-concept-tag" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent-border)' }}>Implemented</div>
            <div className="rm-concept-title">Structured Output + Schema Enforcement</div>
            <div className="rm-concept-body">
              Every Claude call is instructed to return JSON only. Pydantic models validate the schema.
              If validation fails, a correction prompt is automatically sent and the call retried (max 2x).
              No pipeline crash on bad output.
            </div>
            <div className="rm-concept-why"><strong>Why:</strong> LLMs occasionally return malformed JSON or miss fields. Without schema enforcement the pipeline crashes silently — with it, it self-heals.</div>
          </div>

          <div className="rm-concept-card">
            <div className="rm-concept-tag" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent-border)' }}>Implemented</div>
            <div className="rm-concept-title">Fallback Model Routing</div>
            <div className="rm-concept-body">
              Every Claude call uses tenacity retry with exponential backoff. If the primary model
              (Sonnet 4.6) fails after 3 retries, it automatically falls back to Haiku 4.5.
              The model used is recorded in the audit log and surfaced in the Metrics dashboard.
            </div>
            <div className="rm-concept-why"><strong>Why:</strong> Production systems need resilience. A 500 error during a live P1 incident is unacceptable — fallback ensures the engineer always gets a response.</div>
          </div>

          <div className="rm-concept-card">
            <div className="rm-concept-tag" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent-border)' }}>Implemented</div>
            <div className="rm-concept-title">Prompt Chaining</div>
            <div className="rm-concept-body">
              Agent outputs feed directly into the next agent's prompt. Analysis output becomes
              part of the Recommendation prompt. Recommendation output becomes part of the
              Evaluation prompt. Each stage builds on structured context from the prior stage.
            </div>
            <div className="rm-concept-why"><strong>Why:</strong> Each subsequent agent needs richer context than the original incident alone — chaining eliminates redundancy and improves coherence.</div>
          </div>

          <div className="rm-concept-card">
            <div className="rm-concept-tag" style={{ background: 'var(--green-dim)', color: 'var(--green)', borderColor: 'rgba(63,185,80,0.3)' }}>Extensible</div>
            <div className="rm-concept-title">Streaming Responses</div>
            <div className="rm-concept-body">
              Currently the UI waits for the full 20-second pipeline to complete before rendering.
              Streaming would push tokens to the browser as they're generated — showing the severity
              in 2s, root cause in 5s, actions in 10s.
            </div>
            <div className="rm-concept-why"><strong>How to add:</strong> StreamingResponse + EventSource API. Splits the response into per-agent chunks using Server-Sent Events.</div>
          </div>

          <div className="rm-concept-card">
            <div className="rm-concept-tag" style={{ background: 'var(--green-dim)', color: 'var(--green)', borderColor: 'rgba(63,185,80,0.3)' }}>Extensible</div>
            <div className="rm-concept-title">Tool Use / Function Calling</div>
            <div className="rm-concept-body">
              Claude can be given tools it calls dynamically — e.g. search_runbooks(service),
              get_recent_deployments(service), check_dependencies(service). Claude decides which
              tools to invoke based on the incident, making the pipeline adaptive rather than fixed.
            </div>
            <div className="rm-concept-why"><strong>How to add:</strong> Anthropic tool_use API. Claude returns tool_call blocks, the app executes them, results are fed back.</div>
          </div>

          <div className="rm-concept-card">
            <div className="rm-concept-tag" style={{ background: 'var(--green-dim)', color: 'var(--green)', borderColor: 'rgba(63,185,80,0.3)' }}>Extensible</div>
            <div className="rm-concept-title">Prompt Caching</div>
            <div className="rm-concept-body">
              The system prompt and 30-incident context are static on every call — they can be
              cached using Anthropic's cache_control API. Reduces token cost by ~60% and
              latency by ~40% on cache hits.
            </div>
            <div className="rm-concept-why"><strong>How to add:</strong> Add cache_control: ephemeral to the static parts of the messages array.</div>
          </div>

        </div>
      </Section>

      {/* ── 6. GUARDRAILS ── */}
      <Section id="guardrails" title="Guardrails" accent="var(--red)">
        <div className="rm-prose">
          <p>
            Guardrails are safety checks that run at the <strong>boundaries</strong> of the LLM — before input reaches Claude
            and after output comes back. They prevent bad data from reaching the model and ensure the model's
            response is always structurally valid.
          </p>
        </div>

        <div className="rm-2grid">
          <div className="rm-detail-card" style={{ borderTopColor: 'var(--amber)' }}>
            <div className="rm-detail-card-title" style={{ color: 'var(--amber)' }}>Input Guardrails</div>
            <div className="rm-detail-card-subtitle">app/guardrails/input_guard.py</div>
            <div className="rm-check-list">
              {[
                ['Field presence',       'Title and description must not be empty'],
                ['Length limits',        'Title 5–200 chars · Description 10–4000 chars'],
                ['Prompt injection',     'Regex blocks: "ignore instructions", "you are now", "jailbreak"'],
                ['Relevance heuristic',  '30+ incident keywords checked — is this actually an IT incident?'],
                ['LLM fallback check',   'Haiku classifier if keyword check gives no signal'],
              ].map(([name, desc]) => (
                <div key={name} className="rm-check-row">
                  <span className="rm-check-icon" style={{ color: 'var(--amber)' }}>◆</span>
                  <div><strong>{name}</strong> — {desc}</div>
                </div>
              ))}
            </div>
            <div className="rm-callout rm-callout-amber" style={{ marginTop: 14 }}>
              Returns GuardResult(passed, reason, code). HTTP 422 with the reason shown directly in the UI.
            </div>
          </div>

          <div className="rm-detail-card" style={{ borderTopColor: 'var(--red)' }}>
            <div className="rm-detail-card-title" style={{ color: 'var(--red)' }}>Output Guardrails</div>
            <div className="rm-detail-card-subtitle">app/guardrails/output_guard.py</div>
            <div className="rm-check-list">
              {[
                ['Pydantic schema',      'AnalysisOutput · RecommendationOutput · EvaluationOutput'],
                ['Severity enum',        'Must be exactly P1, P2, or P3 — nothing else accepted'],
                ['Confidence range',     '0.0 – 1.0 float enforced at field level'],
                ['ETA bounds',           '1–1440 minutes (1 min to 24 hours)'],
                ['Non-empty fields',     'Actions list ≥ 1, root cause ≥ 10 chars, not generic placeholder'],
                ['Auto-retry',           'On ValidationError: correction prompt sent, retried up to 2×'],
              ].map(([name, desc]) => (
                <div key={name} className="rm-check-row">
                  <span className="rm-check-icon" style={{ color: 'var(--red)' }}>◆</span>
                  <div><strong>{name}</strong> — {desc}</div>
                </div>
              ))}
            </div>
            <div className="rm-callout rm-callout-red" style={{ marginTop: 14 }}>
              Correction prompt tells Claude exactly what was wrong and asks it to fix only that. No full re-run.
            </div>
          </div>
        </div>
      </Section>

      {/* ── 7. EVALS ── */}
      <Section id="evals" title="Evaluations" accent="var(--purple)">
        <div className="rm-prose">
          <p>
            Evals are how you measure whether the AI pipeline is actually producing correct, high-quality output —
            like unit tests but for AI behaviour. Two layers run on every single triage request.
          </p>
        </div>

        <div className="rm-2grid">
          <div className="rm-detail-card" style={{ borderTopColor: 'var(--blue)' }}>
            <div className="rm-detail-card-title" style={{ color: 'var(--blue)' }}>Layer 1 — Deterministic Evals</div>
            <div className="rm-detail-card-subtitle">8 rule-based checks · No LLM call · Runs in &lt;1ms</div>
            <div className="rm-check-list">
              {[
                'Severity is exactly P1, P2, or P3',
                'Confidence is a float between 0.0 and 1.0',
                'Root cause is not empty or a generic placeholder',
                'At least 1 affected service listed',
                'At least 1 immediate action provided',
                'Immediate actions are specific (length > 15 chars)',
                'ETA is between 1 and 1440 minutes',
                'Root cause fix is not empty',
              ].map(c => (
                <div key={c} className="rm-check-row">
                  <span className="rm-check-icon" style={{ color: 'var(--blue)' }}>✓</span>
                  <div>{c}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rm-detail-card" style={{ borderTopColor: 'var(--purple)' }}>
            <div className="rm-detail-card-title" style={{ color: 'var(--purple)' }}>Layer 2 — LLM-as-Judge</div>
            <div className="rm-detail-card-subtitle">Claude grades Claude · Semantic checks</div>
            <div className="rm-check-list">
              {[
                ['Accuracy score (1–5)',     'Is the root cause plausible given the retrieved context?'],
                ['Hallucination detection',  'Are any claims NOT supported by the context documents?'],
                ['Quality score (1–5)',      'Are the recommendations clear and well-formed?'],
                ['Actionability',            'Can an engineer follow these steps at 2am without guidance?'],
                ['Reasoning',               'One-sentence explanation of the evaluation result'],
              ].map(([name, desc]) => (
                <div key={name} className="rm-check-row">
                  <span className="rm-check-icon" style={{ color: 'var(--purple)' }}>◈</span>
                  <div><strong>{name}</strong> — {desc}</div>
                </div>
              ))}
            </div>
            <div className="rm-callout rm-callout-purple" style={{ marginTop: 14 }}>
              Final score = LLM score − (0.2 × deterministic failures). Result fails if either layer fails.
              Scores stored in SQLite and charted on the Metrics page.
            </div>
          </div>
        </div>

        <div className="rm-detail-card" style={{ borderTopColor: 'var(--green)', marginTop: 16 }}>
          <div className="rm-detail-card-title" style={{ color: 'var(--green)' }}>Offline Eval Suite</div>
          <div className="rm-detail-card-subtitle">app/eval/eval_suite.py · Regression tests · CI-ready</div>
          <div className="rm-prose" style={{ marginTop: 10 }}>
            <p>5 test cases run against the full live pipeline. Each case defines expected severity, minimum confidence, required root cause keywords, minimum action count, and whether the eval should pass.</p>
          </div>
          <div className="rm-code-block">python -m app.eval.eval_suite<br /># Exit 0 = all passed · Exit 1 = failures found</div>
        </div>
      </Section>

      {/* ── 8. PII ── */}
      <Section id="pii" title="PII & Compliance" accent="var(--amber)">
        <div className="rm-prose">
          <p>
            Production incident descriptions routinely contain sensitive data — customer emails, internal IP addresses,
            employee names, phone numbers. Sending this raw to an external LLM API is a compliance violation
            in most regulated industries. PII masking is a hard gate — not optional.
          </p>
        </div>
        <div className="rm-2grid">
          <div className="rm-detail-card" style={{ borderTopColor: 'var(--amber)' }}>
            <div className="rm-detail-card-title" style={{ color: 'var(--amber)' }}>What Gets Masked</div>
            <div className="rm-check-list">
              {['Email addresses', 'IP addresses (IPv4 + IPv6)', 'Phone numbers', 'Person names', 'Credit card numbers', 'SSNs / national IDs', 'Custom entity types'].map(e => (
                <div key={e} className="rm-check-row">
                  <span className="rm-check-icon" style={{ color: 'var(--amber)' }}>◆</span>
                  <div>{e}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rm-detail-card" style={{ borderTopColor: 'var(--amber)' }}>
            <div className="rm-detail-card-title" style={{ color: 'var(--amber)' }}>How It Works</div>
            <div className="rm-check-list">
              {[
                ['Microsoft Presidio',  'Industry-standard NLP-based PII detection'],
                ['Step 1 in pipeline',  'Runs before any LLM call — nothing sensitive reaches Claude'],
                ['Token replacement',   'Entities replaced with [EMAIL], [IP_ADDRESS], [PERSON] tokens'],
                ['Audit flag',          'pii_masked=true stored in audit_log for every request'],
                ['UI indicator',        '"PII masked" pill shown in the triage result meta row'],
                ['Compliance proof',    'Auditors can query the audit_log to verify PII was handled'],
              ].map(([name, desc]) => (
                <div key={name} className="rm-check-row">
                  <span className="rm-check-icon" style={{ color: 'var(--amber)' }}>◆</span>
                  <div><strong>{name}</strong> — {desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rm-callout rm-callout-amber">
          <strong>Compliance posture:</strong> Every request is auditable. The audit_log table records
          who submitted what, which model was used, whether PII was found, and what quality score the
          response achieved — sufficient for SOC 2, GDPR, and HIPAA incident logging requirements.
        </div>
      </Section>

      {/* ── 9. INTEGRATIONS ── */}
      <Section id="integrations" title="Integrations" accent="var(--blue)">
        <div className="rm-4grid">
          <div className="rm-detail-card" style={{ borderTopColor: 'var(--green)' }}>
            <div className="rm-detail-card-title" style={{ color: 'var(--green)' }}>PagerDuty ✅ Live</div>
            <div className="rm-detail-card-subtitle">POST /webhook/pagerduty</div>
            <div className="rm-concept-body">
              Accepts PagerDuty v3 webhook events. Verifies HMAC-SHA256 signature.
              Auto-triages each incident through the full pipeline. Returns structured results.
              Test with: python simulate_pagerduty.py
            </div>
          </div>
          <div className="rm-detail-card" style={{ borderTopColor: 'var(--text-muted)' }}>
            <div className="rm-detail-card-title" style={{ color: 'var(--text-muted)' }}>OpsGenie · Planned</div>
            <div className="rm-detail-card-subtitle">POST /webhook/opsgenie</div>
            <div className="rm-concept-body">
              Different payload shape. Uses IP allowlist rather than HMAC. Same adapter pattern as PagerDuty — normalise payload → orchestrate → return result.
            </div>
          </div>
          <div className="rm-detail-card" style={{ borderTopColor: 'var(--text-muted)' }}>
            <div className="rm-detail-card-title" style={{ color: 'var(--text-muted)' }}>Slack · Planned</div>
            <div className="rm-detail-card-subtitle">/triage slash command</div>
            <div className="rm-concept-body">
              Engineers never leave Slack during incidents. A slash command lets them triage
              inline and receive a formatted result posted back to the channel.
            </div>
          </div>
          <div className="rm-detail-card" style={{ borderTopColor: 'var(--text-muted)' }}>
            <div className="rm-detail-card-title" style={{ color: 'var(--text-muted)' }}>Jira / ServiceNow · Planned</div>
            <div className="rm-detail-card-subtitle">Bidirectional</div>
            <div className="rm-concept-body">
              Inbound: triage when ticket created. Outbound: post analysis as a comment on the
              ticket automatically. Closes the loop with ITSM workflows.
            </div>
          </div>
        </div>
      </Section>

      {/* ── 10. STACK ── */}
      <Section id="stack" title="Tech Stack" accent="var(--accent)">
        <div className="rm-2grid">
          <div>
            <div className="rm-stack-group-title">Backend</div>
            <TechRow label="Language"       value="Python 3.11+"                              accent="var(--blue)"   />
            <TechRow label="Framework"      value="FastAPI"                                   accent="var(--blue)"   />
            <TechRow label="LLM"            value="Anthropic Claude Sonnet 4.6 + Haiku 4.5"  accent="var(--purple)" />
            <TechRow label="Vector DB"      value="ChromaDB (cosine similarity)"              accent="var(--accent)" />
            <TechRow label="Embeddings"     value="sentence-transformers all-MiniLM-L6-v2"    accent="var(--accent)" />
            <TechRow label="PII"            value="Microsoft Presidio"                        accent="var(--amber)"  />
            <TechRow label="Database"       value="SQLite"                                    accent="var(--text-secondary)" />
            <TechRow label="Resilience"     value="Tenacity (retry + exponential backoff)"    accent="var(--green)"  />
            <TechRow label="Validation"     value="Pydantic v2"                               accent="var(--red)"    />
            <TechRow label="Testing"        value="pytest (39 tests)"                         accent="var(--green)"  />
            <TechRow label="Deployment"     value="Railway (Docker)"                          accent="var(--blue)"   />
          </div>
          <div>
            <div className="rm-stack-group-title">Frontend</div>
            <TechRow label="Framework"      value="React 19"                                  accent="var(--blue)"   />
            <TechRow label="HTTP"           value="Axios"                                     accent="var(--blue)"   />
            <TechRow label="Routing"        value="React Router DOM 7"                        accent="var(--blue)"   />
            <TechRow label="Fonts"          value="DM Sans + JetBrains Mono"                  accent="var(--text-secondary)" />
            <TechRow label="Charts"         value="Custom CSS (no chart library)"             accent="var(--accent)" />
            <TechRow label="State"          value="useState / useEffect / useCallback"        accent="var(--text-secondary)" />
            <TechRow label="Persistence"    value="localStorage + backend /incidents API"     accent="var(--accent)" />
            <TechRow label="Deployment"     value="Netlify (CI/CD from GitHub main)"          accent="var(--green)"  />
            <TechRow label="Notifications"  value="Custom event-based toast system"           accent="var(--amber)"  />
          </div>
        </div>
      </Section>

      {/* ── 11. ADVANTAGES ── */}
      <Section id="advantages" title="Advantages" accent="var(--green)">
        <div className="rm-4grid">
          <Card icon="⚡" title="Speed"
            body="Diagnosis that takes a senior engineer 10 minutes is done in under 20 seconds. Engineers skip straight to resolution."
            accent="var(--accent)" />
          <Card icon="🧠" title="Institutional Memory"
            body="30 past incidents encoded in the RAG knowledge base. New engineers get the same quality analysis as veterans."
            accent="var(--blue)" />
          <Card icon="🔒" title="Compliance-Ready"
            body="PII masked before every LLM call. Full audit trail in SQLite. Every decision is attributable, timestamped, and scored."
            accent="var(--amber)" />
          <Card icon="📈" title="Self-Improving"
            body="Every triage is evaluated and scored. Low scores are flagged. The metrics dashboard shows quality trends. The system improves with feedback."
            accent="var(--green)" />
          <Card icon="🛡" title="Resilient"
            body="Input guardrails block bad data. Output guardrails self-heal invalid responses. Fallback model ensures availability. 3x retry with backoff."
            accent="var(--red)" />
          <Card icon="🔗" title="Integrates Anywhere"
            body="PagerDuty webhook live. Generic REST API accepts any source. Adapter pattern makes adding OpsGenie, Slack, Jira a 1-hour task."
            accent="var(--purple)" />
          <Card icon="📊" title="Observable"
            body="Metrics dashboard shows latency, eval scores, severity distribution, model usage, pass rates — all auto-refreshing every 30s."
            accent="var(--accent)" />
          <Card icon="🧪" title="Tested"
            body="39 pytest tests covering all agents, endpoints, PII masking, RAG retrieval, and the orchestrator pipeline end-to-end."
            accent="var(--green)" />
        </div>

        <div className="rm-callout rm-callout-green" style={{ marginTop: 24 }}>
          <strong>Interview summary:</strong> "I built an enterprise-grade multi-agent AI system for incident management using Python, FastAPI, React, and Claude.
          It has four specialised agents — retrieval, analysis, recommendation, evaluation — coordinated by an orchestrator.
          RAG grounds responses in 30 real past incidents. Guardrails validate every input and output.
          PII is masked before any LLM call. The system grades its own output on every request and the scores are charted over time.
          39 tests, Docker deployment, live on Railway and Netlify."
        </div>
      </Section>

    </div>
  );
}
