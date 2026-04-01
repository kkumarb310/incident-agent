import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.agents.orchestrator import run as orchestrate
from app.feedback.store import save_feedback, load_feedback, load_flagged
from app.observability.logger import load_metrics, load_audit
from collections import Counter
import statistics
from app.database.operations import get_metrics_summary


load_dotenv()

app = FastAPI(title="Incident Agent")

# Allow React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

#comment
class Incident(BaseModel):
    title: str
    description: str

class Feedback(BaseModel):
    request_id: str
    score: int
    comment: str = ""

@app.post("/triage")
def triage(incident: Incident):
    return orchestrate(incident.model_dump())

@app.post("/feedback")
def feedback(payload: Feedback):
    entry = save_feedback(payload.model_dump())
    return {
        "status": "recorded",
        "flagged": entry.get("flagged", False)
    }

@app.get("/metrics")
def get_metrics():
    summary = get_metrics_summary()
    if not summary:
        return {"message": "No metrics yet. Run some incidents first."}
    return summary

@app.get("/audit")
def get_audit():
    return {"entries": load_audit()}

@app.get("/feedback/summary")
def feedback_summary():
    all_fb = load_feedback()
    if not all_fb:
        return {"message": "No feedback yet"}
    scores = [f["score"] for f in all_fb if "score" in f]
    return {
        "total":         len(all_fb),
        "average_score": round(sum(scores) / len(scores), 2),
        "flagged":       len(load_flagged()),
        "breakdown":     {str(i): scores.count(i) for i in range(1, 6)}
    }

@app.get("/health")
def health():
    return {"status": "ok"}