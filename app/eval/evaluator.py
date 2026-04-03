"""
Evaluator
=========
Two-layer evaluation of every triage response:

Layer 1 — Deterministic evals (no LLM, instant, always run)
  Rule-based checks that catch obvious failures:
  - Severity in valid range
  - Confidence is a real number
  - At least 1 immediate action
  - ETA is positive and reasonable
  - Root cause is not empty/generic
  - Services list is not empty

Layer 2 — LLM-as-judge (Claude grades Claude)
  Semantic checks that require understanding:
  - Is the root cause plausible given the incident?
  - Are claims grounded in the retrieved context?
  - Are the recommendations actionable?
  - Is there hallucination?

Both layers contribute to the final score and are stored in SQLite.
"""

import json
from app.llm.claude_client import call_claude

EVAL_SYSTEM = """You are an expert evaluator for AI incident management systems.
You will be given an incident, the context used, and the AI response.
Evaluate the response on three dimensions.

Respond in JSON only. Use this exact format:
{
  "accuracy_score": 1 to 5,
  "hallucination_detected": true or false,
  "hallucinated_claims": ["claim1"],
  "quality_score": 1 to 5,
  "actionable": true or false,
  "reasoning": "one sentence explanation"
}"""


# ── Layer 1: Deterministic evals ─────────────────────────────────────────────

def run_deterministic_evals(analysis: dict, recommendations: dict) -> dict:
    """
    Rule-based checks. No LLM call. Runs in < 1ms.
    Returns dict of check results — all failures are logged.
    """
    checks = {}
    failures = []

    # Severity must be P1, P2, or P3
    sev = analysis.get("severity", "")
    checks["severity_valid"] = sev in ["P1", "P2", "P3"]
    if not checks["severity_valid"]:
        failures.append(f"Invalid severity '{sev}' — must be P1, P2, or P3")

    # Confidence must be 0.0–1.0
    conf = analysis.get("confidence")
    checks["confidence_in_range"] = isinstance(conf, (int, float)) and 0.0 <= conf <= 1.0
    if not checks["confidence_in_range"]:
        failures.append(f"Confidence '{conf}' out of range 0.0–1.0")

    # Root cause must not be empty or generic
    rc = analysis.get("root_cause", "").strip().lower()
    generic = {"unknown", "n/a", "none", "tbd", "unclear", ""}
    checks["root_cause_specific"] = rc not in generic and len(rc) >= 10
    if not checks["root_cause_specific"]:
        failures.append("Root cause is empty or too generic")

    # At least one affected service
    services = analysis.get("affected_services", [])
    checks["has_affected_services"] = isinstance(services, list) and len(services) >= 1
    if not checks["has_affected_services"]:
        failures.append("No affected services listed")

    # At least one immediate action
    actions = recommendations.get("immediate_actions", [])
    checks["has_immediate_actions"] = isinstance(actions, list) and len(actions) >= 1
    if not checks["has_immediate_actions"]:
        failures.append("No immediate actions provided")

    # ETA must be positive and reasonable (1 min to 24 hours)
    eta = recommendations.get("estimated_resolution_mins", 0)
    checks["eta_reasonable"] = isinstance(eta, (int, float)) and 1 <= eta <= 1440
    if not checks["eta_reasonable"]:
        failures.append(f"ETA '{eta}' is not in range 1–1440 minutes")

    # Root cause fix must not be empty
    fix = recommendations.get("root_cause_fix", "").strip()
    checks["has_root_cause_fix"] = len(fix) >= 10
    if not checks["has_root_cause_fix"]:
        failures.append("Root cause fix is empty or too short")

    # Actions must be specific (not just "fix the issue")
    vague = {"fix it", "investigate", "check logs", "restart", "monitor"}
    specific_actions = [a for a in actions if a.strip().lower() not in vague and len(a) > 15]
    checks["actions_specific"] = len(specific_actions) >= 1
    if not checks["actions_specific"]:
        failures.append("Immediate actions are too vague")

    passed = len(failures) == 0
    det_score = round((sum(checks.values()) / len(checks)) * 5, 2)

    if failures:
        print(f"[Eval/Deterministic] FAILED {len(failures)} checks:")
        for f in failures:
            print(f"  - {f}")
    else:
        print(f"[Eval/Deterministic] All {len(checks)} checks passed")

    return {
        "checks":    checks,
        "failures":  failures,
        "passed":    passed,
        "det_score": det_score,   # 0–5, proportion of checks passed
    }


# ── Layer 2: LLM-as-judge ────────────────────────────────────────────────────

def run_llm_eval(incident: str, context: list[str], analysis: dict, recommendations: dict) -> dict:
    """
    Claude evaluates the pipeline output semantically.
    Returns scores for accuracy, hallucination, quality.
    """
    print("[Eval/LLM] Running Claude-as-judge evaluation...")

    context_text = "\n---\n".join(context)

    prompt = f"""Incident:
{incident}

Context retrieved from knowledge base:
{context_text}

AI Analysis:
{json.dumps(analysis, indent=2)}

AI Recommendations:
{json.dumps(recommendations, indent=2)}

Evaluate this response. Flag hallucination if any claim is NOT supported by the context."""

    result = call_claude(prompt=prompt, system=EVAL_SYSTEM)

    text = result["text"].strip()
    text = text.replace("```json", "").replace("```", "").strip()

    parsed = json.loads(text)

    overall = round((parsed["accuracy_score"] + parsed["quality_score"]) / 2, 2)
    parsed["overall_score"] = overall
    parsed["passed"] = (
        parsed["accuracy_score"] >= 3
        and not parsed["hallucination_detected"]
        and parsed["actionable"]
    )

    print(f"[Eval/LLM] Score: {overall}/5 | Hallucination: {parsed['hallucination_detected']} | Passed: {parsed['passed']}")

    return parsed


# ── Combined evaluator (both layers) ─────────────────────────────────────────

def evaluate(incident: str, context: list[str], analysis: dict, recommendations: dict) -> dict:
    """
    Runs both evaluation layers and merges results.
    Deterministic failures lower the final score.
    """
    # Layer 1 — deterministic (always)
    det = run_deterministic_evals(analysis, recommendations)

    # Layer 2 — LLM-as-judge
    llm = run_llm_eval(incident, context, analysis, recommendations)

    # Merge: if deterministic checks fail, penalise the overall score
    det_penalty = 0 if det["passed"] else len(det["failures"]) * 0.2
    final_score = max(1.0, round(llm["overall_score"] - det_penalty, 2))

    # A result fails if EITHER layer fails
    final_passed = det["passed"] and llm["passed"]

    return {
        # LLM eval fields
        "accuracy_score":         llm["accuracy_score"],
        "quality_score":          llm["quality_score"],
        "overall_score":          final_score,
        "hallucination_detected": llm["hallucination_detected"],
        "hallucinated_claims":    llm.get("hallucinated_claims", []),
        "actionable":             llm["actionable"],
        "reasoning":              llm.get("reasoning", ""),
        "passed":                 final_passed,

        # Deterministic eval fields
        "deterministic_checks":   det["checks"],
        "deterministic_failures": det["failures"],
        "deterministic_passed":   det["passed"],
        "det_score":              det["det_score"],
    }
