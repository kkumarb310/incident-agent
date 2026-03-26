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

def evaluate(
    incident: str,
    context: list[str],
    analysis: dict,
    recommendations: dict
) -> dict:
    """
    Uses Claude to evaluate the pipeline response.
    Returns scores for accuracy, hallucination, quality.
    """
    print("[Evaluator] Evaluating response quality...")

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

    # Calculate overall pass/fail
    parsed["passed"] = (
        parsed["accuracy_score"] >= 3
        and not parsed["hallucination_detected"]
        and parsed["actionable"]
    )

    overall = round(
        (parsed["accuracy_score"] + parsed["quality_score"]) / 2, 2
    )
    parsed["overall_score"] = overall

    print(f"[Evaluator] Score: {overall}/5 | Hallucination: {parsed['hallucination_detected']} | Passed: {parsed['passed']}")

    return parsed