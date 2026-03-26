# AI Incident Management Agent

An enterprise-grade multi-agent AI system for incident triage built with Python, FastAPI, React, and Claude (Anthropic). The system uses RAG (Retrieval Augmented Generation) to ground responses in past incidents, evaluates its own output quality, masks PII for compliance, stores everything in SQLite, and provides a full React dashboard.

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
| Testing | pytest |
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
├── incidents.db                       # SQLite database (auto-generated)
├── chroma_data/                       # Vector database (auto-generated)
├── .env                               # API keys (never commit this)
├── .gitignore
├── pytest.ini
└── requirements.txt
```

---

## Quickstart

### 1. Clone the repo

```bash
git clone https://github.com/your-username/incident-agent.git
cd incident-agent
```

### 2. Create virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
python -m spacy download en_core_web_lg
```

### 4. Set up environment variables

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Get your API key from [console.anthropic.com](https://console.anthropic.com)

### 5. Build the knowledge base

```bash
python app/rag/ingest.py
```

Embeds 30 past incidents into ChromaDB. Run once — data persists to disk.

### 6. Start the backend

```bash
uvicorn app.main:app --reload
```

### 7. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm start
```

### 8. Open the dashboard

```
http://localhost:3000
```

---

## API Endpoints

### `POST /triage`
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
  "title": "Database timeouts on orders service",
  "analysis": {
    "severity": "P1",
    "root_cause": "PostgreSQL connection pool exhausted",
    "affected_services": ["orders-api", "postgres"],
    "confidence": 0.95,
    "model_used": "claude-sonnet-4-5"
  },
  "recommendations": {
    "immediate_actions": [
      "Kill idle connections with pg_terminate_backend",
      "Restart orders service to reset pool",
      "Check slow query log"
    ],
    "root_cause_fix": "Add index on orders.created_at",
    "escalate_to": "Database team",
    "estimated_resolution_mins": 20
  },
  "evaluation": {
    "accuracy_score": 5,
    "hallucination_detected": false,
    "quality_score": 5,
    "overall_score": 5.0,
    "passed": true
  },
  "latency_ms": 9200,
  "context_used": 3
}
```

### `POST /feedback`
Submit a score (1-5) for a triage response. Scores of 1-2 are auto-flagged.

### `GET /metrics`
Returns aggregated metrics from SQLite — latency, eval scores, severity breakdown.

### `GET /audit`
Returns full audit trail of all requests.

### `GET /feedback/summary`
Returns feedback statistics and flagged response count.

### `GET /health`
Health check endpoint.

---

## Running Tests

```bash
pytest
```

Expected output:
```
39 passed in X.XXs
```

Run specific test files:
```bash
pytest tests/test_pii.py        # PII masking tests
pytest tests/test_api.py -v     # API tests verbose
pytest -k "test_masks"          # Tests matching a name
```

---

## How RAG Works

1. `ingest.py` converts 30 past incidents into 384-dimensional embedding vectors
2. Vectors are stored in ChromaDB on disk
3. On each `/triage` request, the description is embedded and compared against all stored vectors
4. The 3 most semantically similar past incidents are retrieved
5. These are passed as context to Claude alongside the new incident

This grounds Claude's responses in your actual incident history.

---

## How Evaluation Works

After every triage response, Claude evaluates itself on:

- **Accuracy (1-5)** — is the diagnosis correct given the context?
- **Hallucination** — does the response contain claims not in the retrieved context?
- **Quality (1-5)** — are the recommendations actionable?

Responses pass if accuracy >= 3, no hallucination, and recommendations are actionable.

---

## Database Schema

```sql
audit_log   — request_id, severity, model_used, pii_masked, eval_score, latency_ms
metrics     — request_id, severity, latency_ms, model_used, eval_score, eval_passed
feedback    — request_id, score, comment, flagged
flagged     — request_id, score, comment (low-scored responses only)
```

---

## Interview Pitch

> "I built an enterprise-grade multi-agent AI system for incident management using Python, FastAPI, React, and Claude. The pipeline has three specialized agents — retrieval, analysis, and recommendation — coordinated by an orchestrator. I used RAG with ChromaDB so responses are grounded in 30 real past incidents. The system includes PII masking with Presidio before any data touches the LLM, SQLite for audit logging and metrics, and an evaluation framework where Claude grades its own responses for accuracy and hallucination. A feedback loop auto-flags low-scored responses for prompt review. The React frontend provides a live triage interface and observability dashboard. I also wrote 39 pytest tests covering every layer. This mirrors real AI operations in regulated environments like banking."

---

## Adding More Incidents

Edit `data/incidents.json` then re-run:

```bash
python app/rag/ingest.py
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |

---

## License

MIT
