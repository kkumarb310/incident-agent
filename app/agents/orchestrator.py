import time
import uuid
from app.agents import retrieval_agent, analysis_agent, recommendation_agent
from app.compliance.pii import mask_pii
from app.observability.logger import audit_log, record_metric
from app.eval.evaluator import evaluate

def run(incident: dict) -> dict:
    request_id = str(uuid.uuid4())[:8]
    start_time = time.time()

    print(f"\n[Orchestrator] Starting triage | ID: {request_id}")
    print(f"[Orchestrator] Incident: {incident['title']}")

    # Step 1 — mask PII before anything touches Claude
    clean_description = mask_pii(incident["description"])
    pii_was_found = clean_description != incident["description"]
    if pii_was_found:
        print(f"[Orchestrator] PII masked in description")

    # Step 2 — retrieval agent
    retrieval_result = retrieval_agent.run(clean_description)

    # Step 3 — analysis agent
    analysis_result = analysis_agent.run(
        incident_description=clean_description,
        similar_incidents=retrieval_result["similar_incidents"]
    )

    # Step 4 — recommendation agent
    recommendation_result = recommendation_agent.run(
        incident_description=clean_description,
        analysis=analysis_result,
        similar_incidents=retrieval_result["similar_incidents"]
    )

    # Step 5 — evaluate the response
    eval_result = evaluate(
        incident=clean_description,
        context=retrieval_result["similar_incidents"],
        analysis=analysis_result,
        recommendations=recommendation_result
    )

    latency_ms = int((time.time() - start_time) * 1000)

    # Step 6 — audit log (permanent record)
    audit_log({
        "request_id":    request_id,
        "incident_title": incident["title"],
        "severity":      analysis_result.get("severity"),
        "model_used":    analysis_result.get("model_used"),
        "pii_masked":    pii_was_found,
        "eval_score":    eval_result.get("overall_score"),
        "eval_passed":   eval_result.get("passed"),
        "latency_ms":    latency_ms
    })

    # Step 7 — record metrics
    record_metric({
        "type":       "triage",
        "request_id": request_id,
        "severity":   analysis_result.get("severity"),
        "latency_ms": latency_ms,
        "model_used": analysis_result.get("model_used"),
        "eval_score": eval_result.get("overall_score"),
        "eval_passed": eval_result.get("passed")
    })

    print(f"[Orchestrator] Complete in {latency_ms}ms")

    return {
        "request_id":      request_id,
        "title":           incident["title"],
        "analysis":        analysis_result,
        "recommendations": recommendation_result,
        "evaluation":      eval_result,
        "latency_ms":      latency_ms,
        "context_used":    retrieval_result["count"]
    }