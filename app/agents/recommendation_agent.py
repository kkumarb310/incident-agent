import json
from app.llm.claude_client import call_claude
from app.guardrails.output_guard import (
    parse_and_validate_recommendations,
    build_correction_prompt,
)

SYSTEM_PROMPT = """You are a senior SRE on-call engineer.
You will receive an incident analysis and relevant past incident resolutions.
Your job is ONLY to prescribe the fix — clear, ordered action steps.

Respond in JSON only. No extra text. Use this exact format:
{
  "immediate_actions": ["step 1", "step 2", "step 3"],
  "root_cause_fix": "permanent fix description",
  "escalate_to": "team name or null",
  "estimated_resolution_mins": 30
}"""

MAX_RETRIES = 2


def run(incident_description: str, analysis: dict, similar_incidents: list[str]) -> dict:
    """
    Takes the analysis from analysis agent.
    Returns validated, actionable remediation steps.
    Retries up to MAX_RETRIES times if output fails schema validation.
    """
    print("[Recommendation Agent] Generating recommendations...")

    context = "\n---\n".join(similar_incidents)

    prompt = f"""Incident:
{incident_description}

Analysis from analyst:
{json.dumps(analysis, indent=2)}

Past incident resolutions for reference:
{context}

Respond with JSON only."""

    last_error = None
    current_prompt = prompt

    for attempt in range(1, MAX_RETRIES + 2):
        result = call_claude(prompt=current_prompt, system=SYSTEM_PROMPT)
        raw    = result["text"]

        try:
            parsed = parse_and_validate_recommendations(raw, model_used=result["model"])
            if attempt > 1:
                print(f"[Recommendation Agent] Validation passed on attempt {attempt}")
            print(f"[Recommendation Agent] Generated {len(parsed['immediate_actions'])} immediate actions")
            return parsed

        except (ValueError, Exception) as e:
            last_error = str(e)
            print(f"[Recommendation Agent] Attempt {attempt} failed validation: {last_error}")
            if attempt <= MAX_RETRIES:
                current_prompt = build_correction_prompt(prompt, raw, last_error)

    raise ValueError(f"[Recommendation Agent] Failed after {MAX_RETRIES + 1} attempts: {last_error}")
