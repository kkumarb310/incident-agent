# AI Incident Management Agent

An enterprise-grade multi-agent AI system for incident triage built with Python, FastAPI, React, and Claude (Anthropic). The system uses RAG (Retrieval Augmented Generation) to ground responses in past incidents, evaluates its own output quality, masks PII for compliance, stores everything in SQLite, and provides a full React dashboard — all containerized with Docker.

---

## Live Demo

| Interface | URL |
|---|---|
| React Dashboard | http://localhost:3000 |
| FastAPI Docs | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |

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

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React, Axios |
| API framework | FastAPI |
| LLM | Anthropic Claude (Sonnet primary, Haiku fallback) |
| Vector database | ChromaDB |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| PII masking | Microsoft Presidio |
| Database | SQLite |
| Resilience | Tenacity (retry + backoff) |
| Testing | pytest (39 tests) |
| Containerization | Docker + Docker Compose |
| Language | Python 3.11+ |

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
