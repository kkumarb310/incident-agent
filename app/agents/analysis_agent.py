import json
from app.llm.claude_client import call_claude
from app.guardrails.output_guard import (
    parse_and_validate_analysis,
    build_correction_prompt,
)

SYSTEM_PROMPT = """You are an expert SRE incident analyst.
You will receive a new incident and similar past incidents as context.
Your job is ONLY to analyze and diagnose — do not suggest fixes yet.

Respond in JSON only. No extra text. Use this exact format:
{
  "severity": "P1 or P2 or P3",
  "root_cause": "one sentence root cause",
  "affected_services": ["service1", "service2"],
  "confidence": 0.0 to 1.0
}"""

MAX_RETRIES = 2


def run(incident_description: str, similar_incidents: list[str]) -> dict:
    """
    Takes incident + context from retrieval agent.
    Returns validated, structured diagnosis.
    Retries up to MAX_RETRIES times if output fails schema validation.
    """
    print("[Analysis Agent] Analyzing incident...")

    context = "\n---\n".join(similar_incidents)

    prompt = f"""New incident:
{incident_description}

Similar past incidents for context:
{context}

Respond with JSON only."""

    last_error = None
    current_prompt = prompt

    for attempt in range(1, MAX_RETRIES + 2):
        result = call_claude(prompt=current_prompt, system=SYSTEM_PROMPT)
        raw    = result["text"]

        try:
            parsed = parse_and_validate_analysis(raw, model_used=result["model"])
            if attempt > 1:
                print(f"[Analysis Agent] Validation passed on attempt {attempt}")
            print(f"[Analysis Agent] Severity: {parsed['severity']} | Confidence: {parsed['confidence']}")
            return parsed

        except (ValueError, Exception) as e:
            last_error = str(e)
            print(f"[Analysis Agent] Attempt {attempt} failed validation: {last_error}")
            if attempt <= MAX_RETRIES:
                current_prompt = build_correction_prompt(prompt, raw, last_error)

    # All retries exhausted — raise so orchestrator can handle
    raise ValueError(f"[Analysis Agent] Failed after {MAX_RETRIES + 1} attempts: {last_error}")
