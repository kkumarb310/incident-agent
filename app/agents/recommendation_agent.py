import json
from app.llm.claude_client import call_claude

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

def run(incident_description: str, analysis: dict, similar_incidents: list[str]) -> dict:
    """
    Takes the analysis from analysis agent.
    Returns actionable remediation steps.
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

    result = call_claude(prompt=prompt, system=SYSTEM_PROMPT)

    # Strip markdown code fences if Claude adds them
    text = result["text"].strip()
    text = text.replace("```json", "").replace("```", "").strip()

    parsed = json.loads(text)
    parsed["model_used"] = result["model"]

    print(f"[Recommendation Agent] Generated {len(parsed['immediate_actions'])} immediate actions")

    return parsed