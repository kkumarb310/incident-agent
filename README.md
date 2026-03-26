# AI Incident Management Agent

An enterprise-grade multi-agent AI system for incident triage built with Python, FastAPI, and Claude (Anthropic). The system uses RAG (Retrieval Augmented Generation) to ground responses in past incidents, evaluates its own output quality, masks PII for compliance, and logs every request for auditability.

---

## Architecture

```
Incoming Incident
       ↓
  PII Masking (Presidio)
       ↓
  Orchestrator
  ├── Retrieval Agent   → ChromaDB semantic search → top 3 similar incidents
  ├── Analysis Agent    → Claude → severity, root cause, confidence
  └── Recommendation Agent → Claude → immediate actions, fix steps
       ↓
  Evaluator (Claude-as-judge) → accuracy, hallucination, quality scores
       ↓
  Audit Log + Metrics
       ↓
  JSON Response
```

---

## Features

- **Multi-agent orchestration** — three specialized agents each with a single responsibility
- **RAG pipeline** — past incidents embedded in ChromaDB, retrieved via semantic search
- **PII masking** — emails, IPs, names stripped before reaching the LLM
- **Evaluation framework** — Claude grades its own responses for accuracy and hallucination
- **Feedback loop** — user scores collected, low scores auto-flagged for prompt review
- **Resilience** — retry with exponential backoff + automatic fallback model
- **Audit logging** — append-only JSONL log of every request for compliance
- **Observability** — latency, eval scores, model usage tracked per request

---

## Tech Stack

| Component | Technology |
|---|---|
| API framework | FastAPI |
| LLM | Anthropic Claude (Sonnet + Haiku fallback) |
| Vector database | ChromaDB |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| PII masking | Microsoft Presidio |
| Resilience | Tenacity (retry + backoff) |
| Language | Python 3.11+ |

---

## Project Structure

```
incident-agent/
├── app/
│   ├── main.py                     # FastAPI endpoints
│   ├── agents/
│   │   ├── orchestrator.py         # Coordinates all agents
│   │   ├── retrieval_agent.py      # Fetches similar incidents
│   │   ├── analysis_agent.py       # Diagnoses severity + root cause
│   │   └── recommendation_agent.py # Generates fix steps
│   ├── llm/
│   │   └── claude_client.py        # Shared Claude client with retry + fallback
│   ├── rag/
│   │   ├── ingest.py               # Embeds incidents into ChromaDB
│   │   └── retrieval.py            # Semantic search
│   ├── compliance/
│   │   └── pii.py                  # PII detection and masking
│   ├── observability/
│   │   └── logger.py               # Audit log + metrics
│   ├── eval/
│   │   └── evaluator.py            # Claude-as-judge evaluation
│   └── feedback/
│       └── store.py                # Feedback storage + auto-flagging
├── data/
│   └── incidents.json              # Sample past incidents knowledge base
├── audit_log.jsonl                 # Auto-generated audit trail
├── metrics_log.jsonl               # Auto-generated metrics
├── feedback_log.jsonl              # Auto-generated feedback
├── flagged_log.jsonl               # Auto-generated flagged responses
├── .env                            # API keys (never commit this)
├── .gitignore
└── requirements.txt
```

---

## Quickstart

### 1. Clone the repo

```bash
git clone https://github.com/your-username/incident-agent.git
cd incident-agent
```

### 2. Create and activate virtual environment

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

This embeds the sample incidents into ChromaDB. Run once — data persists to disk.

### 6. Start the server

```bash
uvicorn app.main:app --reload
```

### 7. Test it

Open your browser at:
```
http://127.0.0.1:8000/docs
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

---

### `POST /feedback`
Submit a score for a triage response. Scores of 1-2 are auto-flagged for prompt review.

```json
{
  "request_id": "a3f2b1c4",
  "score": 5,
  "comment": "Accurate and actionable"
}
```

---

### `GET /metrics`
Returns aggregated observability metrics.

```json
{
  "total_incidents": 12,
  "avg_latency_ms": 9800,
  "avg_eval_score": 4.6,
  "severity_breakdown": {"P1": 5, "P2": 6, "P3": 1},
  "model_usage": {"claude-sonnet-4-5": 11, "claude-haiku-4-5-20251001": 1},
  "pass_rate": 0.92
}
```

---

### `GET /audit`
Returns the full audit trail of all requests.

---

### `GET /feedback/summary`
Returns feedback statistics and flagged response count.

---

### `GET /health`
Health check endpoint.

---

## How RAG Works

1. On startup, `ingest.py` converts past incidents into 384-dimensional embedding vectors using `sentence-transformers`
2. Vectors are stored in ChromaDB on disk
3. On each `/triage` request, the incident description is embedded and compared against all stored vectors
4. The 3 most semantically similar past incidents are retrieved
5. These are passed as context to Claude alongside the new incident

This grounds Claude's responses in your actual incident history rather than general training data.

---

## How Evaluation Works

After every triage response, the evaluator sends the incident, retrieved context, and AI response back to Claude with a scoring prompt. Claude evaluates:

- **Accuracy score (1-5)** — is the diagnosis correct given the context?
- **Hallucination detected** — does the response contain claims not in the context?
- **Quality score (1-5)** — are the recommendations actionable and complete?

Responses pass if: accuracy >= 3, no hallucination detected, and recommendations are actionable.

---

## Adding More Incidents

Edit `data/incidents.json` to add real incidents from your environment, then re-run:

```bash
python app/rag/ingest.py
```

The more incidents you add, the better the retrieval quality.

---

## Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key from console.anthropic.com |

---

## License

MIT
