import json
from app.llm.claude_client import call_claude

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

def run(incident_description: str, similar_incidents: list[str]) -> dict:
    """
    Takes incident + context from retrieval agent.
    Returns structured diagnosis.
    """
    print("[Analysis Agent] Analyzing incident...")

    context = "\n---\n".join(similar_incidents)

    prompt = f"""New incident:
{incident_description}

Similar past incidents for context:
{context}

Respond with JSON only."""

    result = call_claude(prompt=prompt, system=SYSTEM_PROMPT)

    # Strip markdown code fences if Claude adds them
    text = result["text"].strip()
    text = text.replace("```json", "").replace("```", "").strip()

    parsed = json.loads(text)
    parsed["model_used"] = result["model"]

    print(f"[Analysis Agent] Severity: {parsed['severity']} | Confidence: {parsed['confidence']}")

    return parsed