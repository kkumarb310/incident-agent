"""
Output Guardrails
=================
Validates LLM outputs AFTER each agent call using Pydantic schemas.
If output is invalid, retries the agent call with a correction prompt (max 2 retries).

Schemas enforced:
  AnalysisOutput     — severity, root_cause, confidence, affected_services
  RecommendationOutput — immediate_actions, root_cause_fix, escalate_to, eta
  EvaluationOutput   — scores, hallucination flag, passed

Also runs deterministic checks:
  - Severity must be exactly P1, P2, or P3
  - Confidence must be 0.0–1.0
  - ETA must be a positive integer
  - Actions list must not be empty
  - Score values must be 1–5
"""

import json
from typing import Literal
from pydantic import BaseModel, Field, ValidationError, field_validator


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class AnalysisOutput(BaseModel):
    severity:          Literal["P1", "P2", "P3"]
    root_cause:        str = Field(min_length=10, max_length=500)
    affected_services: list[str] = Field(min_length=1)
    confidence:        float = Field(ge=0.0, le=1.0)
    model_used:        str = ""

    @field_validator("affected_services")
    @classmethod
    def services_not_empty_strings(cls, v):
        cleaned = [s.strip() for s in v if s.strip()]
        if not cleaned:
            raise ValueError("affected_services must contain at least one non-empty string")
        return cleaned

    @field_validator("root_cause")
    @classmethod
    def root_cause_not_generic(cls, v):
        generic = ["unknown", "n/a", "none", "tbd", "unclear"]
        if v.strip().lower() in generic:
            raise ValueError("root_cause must be a specific diagnosis, not a placeholder")
        return v


class RecommendationOutput(BaseModel):
    immediate_actions:         list[str] = Field(min_length=1)
    root_cause_fix:            str = Field(min_length=10)
    escalate_to:               str = ""
    estimated_resolution_mins: int = Field(ge=1, le=1440)  # 1 min to 24 hours
    model_used:                str = ""

    @field_validator("immediate_actions")
    @classmethod
    def actions_are_specific(cls, v):
        cleaned = [a.strip() for a in v if len(a.strip()) > 5]
        if not cleaned:
            raise ValueError("immediate_actions must contain actionable steps")
        return cleaned


class EvaluationOutput(BaseModel):
    accuracy_score:        int = Field(ge=1, le=5)
    quality_score:         int = Field(ge=1, le=5)
    overall_score:         float = Field(ge=0.0, le=5.0)
    hallucination_detected: bool
    hallucinated_claims:   list[str] = []
    actionable:            bool
    reasoning:             str = ""
    passed:                bool


# ── Parse + validate ──────────────────────────────────────────────────────────

def parse_and_validate_analysis(raw_text: str, model_used: str = "") -> dict:
    """Parse + validate analysis agent output. Returns validated dict."""
    parsed = _parse_json(raw_text)
    parsed["model_used"] = parsed.get("model_used") or model_used

    validated = AnalysisOutput.model_validate(parsed)
    result = validated.model_dump()

    # Deterministic checks logged as warnings
    _warn_if("confidence suspiciously perfect", validated.confidence in [0.0, 1.0])
    _warn_if("no affected services", len(validated.affected_services) == 0)

    return result


def parse_and_validate_recommendations(raw_text: str, model_used: str = "") -> dict:
    """Parse + validate recommendation agent output. Returns validated dict."""
    parsed = _parse_json(raw_text)
    parsed["model_used"] = parsed.get("model_used") or model_used

    validated = RecommendationOutput.model_validate(parsed)
    result = validated.model_dump()

    _warn_if("ETA suspiciously high (>480 min)", validated.estimated_resolution_mins > 480)
    _warn_if("only 1 immediate action", len(validated.immediate_actions) == 1)

    return result


def parse_and_validate_evaluation(raw_text: str) -> dict:
    """Parse + validate evaluation agent output. Returns validated dict."""
    parsed = _parse_json(raw_text)

    # Calculate overall_score if missing
    if "overall_score" not in parsed:
        parsed["overall_score"] = round(
            (parsed.get("accuracy_score", 3) + parsed.get("quality_score", 3)) / 2, 2
        )

    # Calculate passed if missing
    if "passed" not in parsed:
        parsed["passed"] = (
            parsed.get("accuracy_score", 0) >= 3
            and not parsed.get("hallucination_detected", True)
            and parsed.get("actionable", False)
        )

    validated = EvaluationOutput.model_validate(parsed)
    return validated.model_dump()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_json(raw_text: str) -> dict:
    """Strip markdown fences and parse JSON. Raises ValueError on failure."""
    text = raw_text.strip()
    text = text.replace("```json", "").replace("```", "").strip()

    # Find JSON object if there's surrounding text
    start = text.find("{")
    end   = text.rfind("}") + 1
    if start != -1 and end > start:
        text = text[start:end]

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM returned invalid JSON: {e}\nRaw output: {raw_text[:300]}")


def build_correction_prompt(original_prompt: str, raw_output: str, error: str) -> str:
    """Build a retry prompt that tells Claude what it got wrong."""
    return f"""{original_prompt}

IMPORTANT: Your previous response was invalid.
Error: {error}
Previous response: {raw_output[:400]}

Fix the issues and return ONLY valid JSON matching the exact schema above. No explanations."""


def _warn_if(message: str, condition: bool):
    if condition:
        print(f"[OutputGuard] WARNING: {message}")
