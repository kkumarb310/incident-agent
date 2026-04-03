# AI Incident Management Agent

An enterprise-grade multi-agent AI system for automated incident triage. Built with Python, FastAPI, React, and Claude (Anthropic). The system uses RAG to ground responses in past incidents, evaluates its own output quality, masks PII for compliance, persists everything to SQLite, and ships a full dark-theme React dashboard — deployed on Railway (backend) and Netlify (frontend).

---

## Live Demo

| | URL |
|---|---|
| **Frontend** | https://benevolent-jalebi-6a544d.netlify.app |
| **API docs** | https://incident-agent-production.up.railway.app/docs |
| **Health** | https://incident-agent-production.up.railway.app/health |

---

## Architecture

```
React Dashboard (Netlify)
        │  HTTPS / Axios
FastAPI Backend (Railway)
        │
   Orchestrator
   ├── PII Masking (Microsoft Presidio)
   ├── Retrieval Agent   → ChromaDB semantic search → top 3 similar incidents
   ├── Analysis Agent    → Claude → severity + root cause + confidence
   ├── Recommendation Agent → Claude → immediate actions + fix + ETA
   └── Evaluation Agent  → Claude-as-judge → accuracy, hallucination, quality
        │
   SQLite Database → audit_log, metrics, feedback, flagged
        │
   GET /incidents, GET /metrics, GET /audit, GET /feedback/summary
```

Inbound PagerDuty webhooks are accepted at `POST /webhook/pagerduty` and auto-routed through the same pipeline.

---

## Frontend — 4-page React Dashboard

### Overview Page
- Stat cards: total incidents, P1 count, avg eval score, avg latency
- Live activity feed (fetched from `/incidents`, merged with localStorage)
- Top Affected Services bar chart
- Severity split chart
- Quick Actions panel
- Auto-refreshes every 30 seconds

### Triage Page
- **Quick-fill examples** — 3 one-click scenario buttons to prefill title + description
- **AI Pipeline card** — shows all 4 agents running in sequence with live step indicators
- **Recent Triages** — last 3 incidents from history, clickable to prefill
- **Severity banner** — colour-coded header with animated **confidence ring** (SVG gauge)
- **3-tab results layout:**
  - **Summary** — root cause, affected services, permanent fix, escalation
  - **Actions** — interactive checklist (click to tick off steps, green completion banner)
  - **Evaluation** — score breakdown bars, evaluator reasoning, hallucination status
- **Copy Report** — one-click clipboard export of full plain-text triage report
- Character counter on description field
- Toast notifications on triage complete / error

### History Page
- Full incident table fetched from `/incidents` (backend-persisted, cross-device)
- Falls back to localStorage if backend is unreachable
- Live search + P1/P2/P3 filter pills
- Pagination (10 per page)
- **Export CSV** — download all filtered incidents
- **Load Demo Data** — seeds 20 realistic incidents into the browser instantly
- Click **View** → detail modal with root cause, actions, eval cards

### Metrics Page
- Auto-refreshes every 30s with live "Updated Xs ago" badge
- 4 stat cards: total incidents, avg latency, avg eval score, pass rate
- Eval Score Distribution chart (from `/metrics` API)
- Severity Breakdown chart
- Top Affected Services panel
- Agent Performance panel: pass rate %, hallucination %, eval trend sparkbar
- Model Usage panel — which Claude models handled calls + call counts

---

## Features

- **Multi-agent orchestration** — 4 specialized agents each with a single responsibility
- **RAG pipeline** — 30 past incidents embedded in ChromaDB, retrieved via semantic search
- **PII masking** — emails, IPs, names stripped before reaching the LLM
- **Claude-as-judge evaluation** — Claude grades its own output for accuracy and hallucination
- **Feedback loop** — user star ratings collected; scores ≤ 2 auto-flagged for prompt review
- **Resilience** — retry with exponential backoff + automatic fallback model (Sonnet → Haiku)
- **SQLite persistence** — audit logs, metrics, and feedback with full SQL query support
- **PagerDuty integration** — HMAC-SHA256 verified inbound webhooks auto-triage incidents
- **Demo seed script** — `scripts/seed_demo.py` populates 20 incidents against the live backend
- **39 pytest tests** — full coverage across all agents and endpoints
- **Docker** — fully containerized, runs with one command

---

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React 19, Axios, React Router |
| API framework | FastAPI |
| LLM | Anthropic Claude (Sonnet 4.6 primary, Haiku 4.5 fallback) |
| Vector database | ChromaDB |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| PII masking | Microsoft Presidio |
| Database | SQLite |
| Resilience | Tenacity (retry + exponential backoff) |
| Testing | pytest (39 tests) |
| Containerization | Docker + Docker Compose |
| Backend deployment | Railway |
| Frontend deployment | Netlify |
| Language | Python 3.11+ |

---

## Project Structure

```
incident-agent/
├── app/
│   ├── main.py                        # FastAPI endpoints + CORS
│   ├── agents/
│   │   ├── orchestrator.py            # Coordinates all agents
│   │   ├── retrieval_agent.py         # Semantic search over ChromaDB
│   │   ├── analysis_agent.py          # Severity + root cause + confidence
│   │   └── recommendation_agent.py    # Immediate actions + fix + ETA
│   ├── llm/
│   │   └── claude_client.py           # Claude client with retry + fallback
│   ├── rag/
│   │   ├── ingest.py                  # Embeds incidents into ChromaDB
│   │   └── retrieval.py               # Semantic search
│   ├── compliance/
│   │   └── pii.py                     # PII detection and masking
│   ├── observability/
│   │   └── logger.py                  # Audit log + metrics writer
│   ├── eval/
│   │   └── evaluator.py               # Claude-as-judge evaluation
│   ├── feedback/
│   │   └── store.py                   # Feedback storage + auto-flagging
│   └── database/
│       ├── db.py                      # SQLite schema + connection
│       └── operations.py              # SQL inserts and aggregated queries
├── frontend/
│   └── src/
│       ├── App.js                     # Sidebar shell + page routing
│       ├── App.css                    # Full design system (dark theme)
│       ├── api.js                     # Axios API client
│       ├── toast.js                   # Lightweight toast event bus
│       ├── demoData.js                # Demo incident seed for localStorage
│       ├── components/
│       │   └── Toast.js               # Toast notification component
│       └── pages/
│           ├── HomePage.js            # Overview dashboard
│           ├── TriagePage.js          # Incident triage + results
│           ├── HistoryPage.js         # Incident history table + export
│           └── MetricsPage.js         # Observability metrics
├── scripts/
│   └── seed_demo.py                   # Seeds 20 incidents to live backend
├── tests/
│   ├── conftest.py
│   ├── test_pii.py
│   ├── test_retrieval.py
│   ├── test_analysis_agent.py
│   ├── test_recommendation_agent.py
│   ├── test_orchestrator.py
│   └── test_api.py
├── data/
│   └── incidents.json                 # 30 past incidents knowledge base
├── Dockerfile                         # Backend container
├── docker-compose.yml
├── simulate_pagerduty.py              # PagerDuty webhook mock
├── requirements.txt
└── .env                               # API keys (never commit)
```

---

## Quickstart — Docker (recommended)

```bash
# 1. Clone
git clone https://github.com/kkumarb310/incident-agent.git
cd incident-agent

# 2. Set API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env

# 3. Build knowledge base
python app/rag/ingest.py

# 4. Run
docker compose up --build
```

Open `http://localhost:3000`

---

## Quickstart — Local

```bash
# 1. Create venv
python -m venv venv
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows

# 2. Install dependencies
pip install -r requirements.txt
python -m spacy download en_core_web_lg

# 3. Build knowledge base
python app/rag/ingest.py

# 4. Start backend
uvicorn app.main:app --reload

# 5. Start frontend (new terminal)
cd frontend && npm install && npm start
```

---

## Seed Demo Data

To populate the live backend with 20 realistic incidents:

```bash
pip install requests
python scripts/seed_demo.py
```

To populate the browser dashboard instantly, open the app → **History** → click **Load Demo Data**.

---

## API Reference

### POST /triage

```json
// Request
{ "title": "Database timeouts on orders service", "description": "Orders API throwing connection refused..." }

// Response
{
  "request_id": "a3f2b1c4",
  "latency_ms": 9200,
  "context_used": 3,
  "pii_masked": false,
  "analysis": {
    "severity": "P1",
    "root_cause": "PostgreSQL connection pool exhausted under load",
    "affected_services": ["orders-api", "postgres"],
    "confidence": 0.95
  },
  "recommendations": {
    "immediate_actions": ["Kill idle connections", "Restart service pod"],
    "root_cause_fix": "Add index on orders.created_at and increase pool size",
    "escalate_to": "Database team",
    "estimated_resolution_mins": 20
  },
  "evaluation": {
    "overall_score": 5.0,
    "accuracy_score": 5,
    "quality_score": 5,
    "hallucination_detected": false,
    "passed": true,
    "reasoning": "Response grounded in retrieved context..."
  }
}
```

### POST /webhook/pagerduty
Accepts PagerDuty v3 webhook events, verifies HMAC-SHA256 signature (when `PAGERDUTY_WEBHOOK_SECRET` is set), and auto-triages each incident.

```bash
# Test without a real PagerDuty account
python simulate_pagerduty.py
```

### GET /incidents
Returns all audit log rows — used by the History and Overview pages.

### GET /metrics
Aggregated stats: total incidents, avg latency, avg eval score, severity breakdown, score breakdown, model usage, pass rate, avg feedback score.

### POST /feedback
Submit a star rating (1–5). Scores ≤ 2 are auto-flagged.

### GET /audit
Full audit trail of every triage request.

### GET /feedback/summary
Feedback statistics and flagged response count.

---

## Running Tests

```bash
pytest tests/ -v
# Expected: 39 passed
```

---

## Database Schema

```sql
audit_log  — request_id, incident_title, severity, model_used, pii_masked, eval_score, eval_passed, latency_ms, timestamp
metrics    — request_id, type, severity, latency_ms, model_used, eval_score, eval_passed, timestamp
feedback   — request_id, score, comment, flagged, timestamp
flagged    — request_id, score, comment, timestamp
```

---

## How RAG Works

1. `ingest.py` embeds 30 past incidents into 384-dim vectors via `sentence-transformers`
2. Vectors stored on disk in ChromaDB
3. On each `/triage` call, the incident description is embedded and compared against all stored vectors
4. The 3 most semantically similar past incidents are retrieved
5. These are passed as context to Claude alongside the new incident, grounding the response

---

## How Evaluation Works

After every triage, a fourth Claude call evaluates the response on:
- **Accuracy** — are claims grounded in the retrieved context?
- **Hallucination** — did the model invent facts not in the incident data?
- **Quality** — are recommendations specific and actionable?

A response **passes** if accuracy ≥ 3, no hallucination detected, and recommendations are actionable. Results are stored in SQLite and surfaced in the Metrics dashboard.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | From [console.anthropic.com](https://console.anthropic.com) |
| `PAGERDUTY_WEBHOOK_SECRET` | No | HMAC secret for verifying inbound PagerDuty webhooks |

---

## Interview Pitch

> "I built an enterprise-grade multi-agent AI system for incident management using Python, FastAPI, React, and Claude. The pipeline has four specialized agents — retrieval, analysis, recommendation, and evaluation — coordinated by an orchestrator. I used RAG with ChromaDB so responses are grounded in 30 real past incidents. The system includes PII masking with Presidio, SQLite for audit logging, and a self-evaluation framework where Claude grades its own output for accuracy and hallucination. A feedback loop auto-flags low-scored responses. The React frontend has four pages: an Overview dashboard, a Triage interface with interactive checklists and confidence gauges, a History page with search/filter/export, and a Metrics page with auto-refreshing charts. I wrote 39 pytest tests and containerized the system with Docker for one-command deployment."

---

## License

MIT
