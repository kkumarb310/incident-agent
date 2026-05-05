# AI Incident Management Agent

An enterprise-grade multi-agent AI system for incident triage built with Python, FastAPI, React, and Claude (Anthropic). The system uses RAG (Retrieval Augmented Generation) to ground responses in past incidents, evaluates its own output quality, masks PII for compliance, stores everything in SQLite, and provides a full React dashboard — all containerized with Docker.

---

## Live Demo



| Endpoint | URL |
|---|---|
| Health check | https://incident-agent-production.up.railway.app/health |
| API docs | https://incident-agent-production.up.railway.app/docs |
| Triage | https://incident-agent-production.up.railway.app/triage |

---

## Architecture

```
React Frontend (port 3000)
        ↓  HTTP
FastAPI Gateway (port 8000)
        ↓
   Orchestrator
   ├── PII Masking (Presidio)
   ├── Retrieval Agent   → ChromaDB semantic search → top 3 similar incidents
   ├── Analysis Agent    → Claude → severity, root cause, confidence
   └── Recommendation Agent → Claude → immediate actions, fix steps
        ↓
   Evaluator (Claude-as-judge) → accuracy, hallucination, quality
        ↓
   SQLite Database → audit log, metrics, feedback
```

---

## Features

- **Multi-agent orchestration** — three specialized agents each with a single responsibility
- **RAG pipeline** — 30 past incidents embedded in ChromaDB, retrieved via semantic search
- **PII masking** — emails, IPs, names stripped before reaching the LLM
- **Evaluation framework** — Claude grades its own responses for accuracy and hallucination
- **Feedback loop** — user scores collected, low scores auto-flagged for prompt review
- **Resilience** — retry with exponential backoff + automatic fallback model
- **SQLite database** — all audit logs, metrics, and feedback stored with SQL queries
- **React frontend** — submit incidents and view metrics from a clean dashboard
- **39 pytest tests** — full test coverage across all agents and endpoints
- **Docker** — fully containerized, runs with one command

---

## Tech Stack — and Why

| Component | Technology | Why this choice? |
|---|---|---|
| Frontend | React + Axios | React's component model fits a dashboard with reusable cards (triage form, metric tiles, audit rows). Axios over `fetch` for automatic JSON parsing, interceptors, and consistent error shapes. Deploys cleanly to Netlify as a static bundle — no SSR overhead needed for an internal tool. |
| API framework | FastAPI | **Async-first**, which matters: every triage request waits 5–10s on Claude. With sync Flask/Django the worker blocks; FastAPI lets one process handle dozens of concurrent triages. **Pydantic validation** rejects malformed payloads at the boundary — agents can trust their inputs. **Auto-generated OpenAPI docs** at `/docs` mean zero hand-written API documentation. |
| LLM | Anthropic Claude (Sonnet primary, Haiku fallback) | Sonnet has the strongest reasoning for nuanced root-cause analysis and structured JSON output. Haiku is ~5× cheaper and ~3× faster — perfect for fallback when Sonnet is rate-limited or down. The fallback model is a real resilience strategy, not just "try again." |
| Vector database | ChromaDB | **Embedded, file-backed** — no separate server to operate, no network hop. For a 30-incident corpus this is the right size; Pinecone/Weaviate/pgvector would be over-engineering. Persists to `chroma_data/` so ingestion is a one-time cost. Switching later is a one-file change because retrieval is isolated in `app/rag/retrieval.py`. |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) | **Runs locally** — no per-embedding API cost, no extra latency, no PII leaving the process during ingestion. 384 dimensions is small enough for fast cosine search but high-quality enough for semantic incident matching. Industry-standard general-purpose model with a tiny footprint. |
| PII masking | Microsoft Presidio | Mature, battle-tested detectors for emails, IPs, names, credit cards out of the box — writing regex for this is a compliance liability. Backed by spaCy NER for name detection. Critical because we cannot ship raw customer data to a third-party LLM provider. |
| Database | SQLite | Zero-config, single file, no daemon. For audit logs and metrics at this scale Postgres would be operational overhead with no benefit. WAL mode supports concurrent reads while the API writes. Easy to ship inside a container, easy to back up (`cp incidents.db`). |
| Resilience | Tenacity | Declarative retry decorators (`@retry(...)`) keep the retry policy out of the call sites. Anthropic's API throttles under load — exponential backoff with jitter is the standard recovery pattern, and Tenacity is the de-facto Python implementation. |
| Testing | pytest (39 tests) | Industry-standard fixtures + parametrize make agent tests concise. Shared `conftest.py` mocks Claude so the suite runs offline in <5s — important because LLM calls in CI are slow and flaky. |
| Containerization | Docker + Docker Compose | Presidio + spaCy + ChromaDB have notoriously messy native dependencies; a container guarantees the same build on any laptop or cloud host. Compose wires backend + frontend together so contributors run one command. Same image deploys to Railway. |
| Language | Python 3.11+ | Anthropic, ChromaDB, Presidio, FastAPI — every piece of the stack has a first-class Python SDK. 3.11 specifically for the ~25% perf bump and improved asyncio task groups. |

---

## Architectural Decisions — and Why

These are the design choices that aren't visible in the dependency list but shape how the system behaves.

### Why a multi-agent pipeline instead of one big prompt?
**Single Responsibility per agent.** Each agent (retrieval, analysis, recommendation) has one job, one prompt, one schema. That makes each one independently testable, swappable (e.g., move analysis to Haiku without touching recommendation), and debuggable — when output is wrong, the failing stage is obvious. A monolithic prompt would entangle everything and make iteration brittle.

### Why an Orchestrator instead of agents calling each other?
The orchestrator centralizes the pipeline shape: PII mask → retrieve → analyze → recommend → evaluate → log. Agents stay pure (input → LLM → output). Adding a new step (e.g., a translation agent) is one edit in [orchestrator.py](app/agents/orchestrator.py), not a refactor across every agent.

### Why mask PII *before* the LLM, not after?
Once data leaves our process for Anthropic's API, we've lost control of it (logs, caches, training opt-out windows). Masking at the boundary is the only defensible compliance posture — "we'll redact the response" is too late.

### Why RAG instead of fine-tuning?
- **Cheaper:** ingestion is free; fine-tuning Claude isn't even offered, and fine-tuning open models requires GPU infra.
- **Updateable:** add a new incident → re-run `ingest.py` → done. Fine-tuning needs a full retraining cycle.
- **Explainable:** every response can cite the 3 retrieved incidents that grounded it. Auditors and ops engineers can see *why* the model said what it said.
- **No hallucinated knowledge cutoff:** new incidents from last week are usable immediately.

### Why Claude-as-judge for evaluation?
Human review doesn't scale; pytest only catches structural correctness, not factual quality. An LLM judge gives a cheap, automated signal on hallucination and recommendation quality on every single request. It's not a replacement for human review — it's the cheap filter that makes human review tractable.

### Why auto-flag low feedback scores instead of dashboarding them?
Scores 1–2 are the clearest signal that a prompt is drifting. Surfacing them automatically into a `flagged` table creates a tiny, focused review queue instead of an unread dashboard. The action loop (user score → flagged row → prompt edit) closes in minutes, not weeks.

### Why a Sonnet-primary / Haiku-fallback strategy instead of always Sonnet?
Quality matters when the system is healthy; *availability* matters when it isn't. Falling back to a smaller model under load gives degraded-but-working triage instead of an outage. The orchestrator records `model_used` per request so you can see when fallback fires.

### Why SQLite instead of Postgres?
Audit logs at incident-volume (hundreds/day, not millions) fit comfortably in SQLite. Operating Postgres on Railway would mean a separate service, a connection pool to tune, and migrations to manage — all for zero functional gain at this scale. Migration path is open: SQLAlchemy-style operations isolated in [app/database/operations.py](app/database/operations.py).

### Why Railway (backend) + Netlify (frontend) split?
Railway handles long-lived Python containers and persistent volumes (for ChromaDB + SQLite) cheaply. Netlify is purpose-built for static React bundles with a global CDN — using Railway for both would mean paying for compute to serve static files. The split also means a frontend deploy can never break the backend, and vice versa.

### Why Docker Compose for local dev when production is split?
The compose file is for *contributors*, not production. It removes the "works on my machine" class of bug for a stack with ugly native deps (spaCy models, Presidio analyzers). One command (`docker compose up`) gets a new contributor running.

---

## Project Structure

```
incident-agent/
├── app/
│   ├── main.py                        # FastAPI endpoints + CORS
│   ├── agents/
│   │   ├── orchestrator.py            # Coordinates all agents
│   │   ├── retrieval_agent.py         # Fetches similar incidents
│   │   ├── analysis_agent.py          # Diagnoses severity + root cause
│   │   └── recommendation_agent.py   # Generates fix steps
│   ├── llm/
│   │   └── claude_client.py           # Shared Claude client with retry + fallback
│   ├── rag/
│   │   ├── ingest.py                  # Embeds incidents into ChromaDB
│   │   └── retrieval.py               # Semantic search
│   ├── compliance/
│   │   └── pii.py                     # PII detection and masking
│   ├── observability/
│   │   └── logger.py                  # Audit log + metrics
│   ├── eval/
│   │   └── evaluator.py               # Claude-as-judge evaluation
│   ├── feedback/
│   │   └── store.py                   # Feedback storage + auto-flagging
│   └── database/
│       ├── db.py                      # SQLite connection + table creation
│       └── operations.py              # SQL insert and query operations
├── frontend/
│   ├── src/
│   │   ├── App.js                     # Main app + navigation
│   │   ├── App.css                    # Styling
│   │   ├── api.js                     # API calls to FastAPI
│   │   └── pages/
│   │       ├── TriagePage.js          # Submit incidents + view results
│   │       └── MetricsPage.js         # Observability dashboard
│   ├── Dockerfile                     # Frontend container
│   └── package.json
├── tests/
│   ├── conftest.py                    # Shared fixtures and mocks
│   ├── test_pii.py                    # PII masking tests
│   ├── test_retrieval.py              # RAG retrieval tests
│   ├── test_analysis_agent.py         # Analysis agent tests
│   ├── test_recommendation_agent.py   # Recommendation agent tests
│   ├── test_orchestrator.py           # Full pipeline tests
│   └── test_api.py                    # FastAPI endpoint tests
├── data/
│   └── incidents.json                 # 30 past incidents knowledge base
├── Dockerfile                         # Backend container
├── docker-compose.yml                 # Runs both containers together
├── .dockerignore                      # Docker build exclusions
├── incidents.db                       # SQLite database (auto-generated)
├── chroma_data/                       # Vector database (auto-generated)
├── .env                               # API keys (never commit this)
├── .gitignore
├── pytest.ini
└── requirements.txt
```

---

## Quickstart — Docker (recommended)

### 1. Clone the repo

```bash
git clone https://github.com/kkumarb310/incident-agent.git
cd incident-agent
```

### 2. Set up environment variables

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Get your API key from [console.anthropic.com](https://console.anthropic.com)

### 3. Build the knowledge base

```bash
python app/rag/ingest.py
```

### 4. Run with Docker

```bash
docker compose up --build
```

Open your browser at `http://localhost:3000`

---

## Quickstart — Local (without Docker)

### 1. Create virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
python -m spacy download en_core_web_lg
```

### 3. Build the knowledge base

```bash
python app/rag/ingest.py
```

### 4. Start the backend

```bash
uvicorn app.main:app --reload
```

### 5. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm start
```

### 6. Open the dashboard

```
http://localhost:3000
```

---

## Docker Commands

```bash
# Start everything
docker compose up

# Start in background
docker compose up -d

# Stop everything
docker compose down

# Rebuild after code changes
docker compose up --build

# View logs
docker compose logs backend
docker compose logs frontend

# View running containers
docker ps
```

---

## API Endpoints

### POST /triage
Triages an incident through the full multi-agent pipeline.

**Request:**
```json
{
  "title": "Database timeouts on orders service",
  "description": "Orders API throwing connection refused errors. DB pool maxed out."
}
```

**Response:**
```json
{
  "request_id": "a3f2b1c4",
  "analysis": {
    "severity": "P1",
    "root_cause": "PostgreSQL connection pool exhausted",
    "affected_services": ["orders-api", "postgres"],
    "confidence": 0.95
  },
  "recommendations": {
    "immediate_actions": ["Kill idle connections", "Restart service"],
    "root_cause_fix": "Add index on orders.created_at",
    "escalate_to": "Database team",
    "estimated_resolution_mins": 20
  },
  "evaluation": {
    "overall_score": 5.0,
    "hallucination_detected": false,
    "passed": true
  },
  "latency_ms": 9200,
  "context_used": 3
}
```

### POST /feedback
Submit a score (1-5). Scores of 1-2 are auto-flagged for prompt review.

### GET /metrics
Aggregated metrics — latency, eval scores, severity breakdown.

### GET /audit
Full audit trail of every request.

### GET /feedback/summary
Feedback statistics and flagged response count.

### GET /health
Health check.

---

## Running Tests

```bash
pytest
```

Expected output:
```
39 passed in X.XXs
```

---

## How RAG Works

1. ingest.py converts 30 past incidents into 384-dimensional embedding vectors
2. Vectors stored in ChromaDB on disk
3. On each /triage request the incident description is embedded and compared against all stored vectors
4. The 3 most semantically similar past incidents are retrieved
5. These are passed as context to Claude alongside the new incident

---

## How Evaluation Works

After every triage response Claude evaluates itself on accuracy, hallucination detection, and recommendation quality. Responses pass if accuracy >= 3, no hallucination detected, and recommendations are actionable.

---

## Database Schema

```sql
audit_log   — request_id, severity, model_used, pii_masked, eval_score, latency_ms
metrics     — request_id, severity, latency_ms, model_used, eval_score, eval_passed
feedback    — request_id, score, comment, flagged
flagged     — request_id, score, comment
```

---

## Interview Pitch

"I built an enterprise-grade multi-agent AI system for incident management using Python, FastAPI, React, and Claude. The pipeline has three specialized agents — retrieval, analysis, and recommendation — coordinated by an orchestrator. I used RAG with ChromaDB so responses are grounded in 30 real past incidents. The system includes PII masking with Presidio, SQLite for audit logging, and an evaluation framework where Claude grades its own responses for accuracy and hallucination. A feedback loop auto-flags low-scored responses for prompt review. The React frontend provides a live triage interface and observability dashboard. I wrote 39 pytest tests covering every layer and containerized the entire system with Docker so it deploys anywhere with one command."

---

## Environment Variables

| Variable | Description |
|---|---|
| ANTHROPIC_API_KEY | Your Anthropic API key from console.anthropic.com |

---

## License

MIT
