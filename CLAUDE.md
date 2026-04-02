# Incident Agent

## What this is
Enterprise AI incident management system with multi-agent pipeline.

## Stack
- Backend: Python, FastAPI, Claude (Anthropic SDK)
- Frontend: React (deployed on Netlify)
- Database: SQLite
- Deployment: Railway (backend), Netlify (frontend)

## Key commands
- Run backend: uvicorn app.main:app --reload --port 8000
- Run tests: pytest tests/ -v
- Run frontend: cd frontend && npm start

## Live URLs
- Frontend: https://benevolent-jalebi-6a544d.netlify.app
- Backend: https://incident-agent-production.up.railway.app
- API docs: https://incident-agent-production.up.railway.app/docs

## Architecture
- app/agents/orchestrator.py — main pipeline coordinator
- app/agents/analysis_agent.py — severity + root cause
- app/agents/recommendation_agent.py — fix steps
- app/agents/retrieval_agent.py — ChromaDB semantic search
- app/rag/ — RAG pipeline with 30 incidents
- app/compliance/pii.py — Microsoft Presidio PII masking