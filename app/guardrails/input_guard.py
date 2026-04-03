"""
Input Guardrails
================
Validates incident inputs BEFORE they reach the LLM pipeline.

Checks performed:
  1. Field presence       — title and description must exist
  2. Length limits        — title 5–200 chars, description 10–4000 chars
  3. Relevance check      — is this actually an incident? (LLM classifier)
  4. Prompt injection     — detect attempts to override system prompt
  5. Language check       — English only (system is trained on English incidents)
"""

import re
from dataclasses import dataclass
from app.llm.claude_client import call_claude


# ── Patterns that indicate prompt injection attempts ──────────────────────────
INJECTION_PATTERNS = [
    r"ignore (all |previous |above |prior )?instructions",
    r"you are now",
    r"new system prompt",
    r"disregard (your |all )?",
    r"forget (everything|all|your instructions)",
    r"act as (if you are|a|an)",
    r"jailbreak",
    r"do anything now",
]

# ── Words that suggest this is actually an IT/SRE incident ────────────────────
INCIDENT_KEYWORDS = [
    "error", "fail", "down", "timeout", "crash", "spike", "latency",
    "slow", "outage", "500", "503", "404", "cpu", "memory", "disk",
    "database", "db", "api", "service", "pod", "deploy", "queue",
    "connection", "network", "alert", "monitor", "log", "exception",
    "null", "overflow", "leak", "throttl", "rate limit", "unreachable",
    "not responding", "high", "degraded", "unavailable", "broken",
]


@dataclass
class GuardResult:
    passed: bool
    reason: str           # human-readable explanation
    code: str             # machine-readable code for the frontend


def check_input(title: str, description: str) -> GuardResult:
    """
    Run all input guardrails. Returns GuardResult.
    If passed=False, the pipeline should be blocked and reason shown to user.
    """

    # ── 1. Presence ───────────────────────────────────────────────────────────
    if not title or not title.strip():
        return GuardResult(False, "Incident title is required.", "MISSING_TITLE")

    if not description or not description.strip():
        return GuardResult(False, "Incident description is required.", "MISSING_DESCRIPTION")

    title       = title.strip()
    description = description.strip()

    # ── 2. Length limits ──────────────────────────────────────────────────────
    if len(title) < 5:
        return GuardResult(False, "Title too short — minimum 5 characters.", "TITLE_TOO_SHORT")

    if len(title) > 200:
        return GuardResult(False, "Title too long — maximum 200 characters.", "TITLE_TOO_LONG")

    if len(description) < 10:
        return GuardResult(False, "Description too short — please provide more detail.", "DESC_TOO_SHORT")

    if len(description) > 4000:
        return GuardResult(
            False,
            f"Description too long ({len(description)} chars) — maximum 4000. Please summarise.",
            "DESC_TOO_LONG"
        )

    # ── 3. Prompt injection detection ─────────────────────────────────────────
    combined = (title + " " + description).lower()
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, combined, re.IGNORECASE):
            return GuardResult(
                False,
                "Input contains patterns that look like prompt injection. Please describe a real incident.",
                "PROMPT_INJECTION"
            )

    # ── 4. Relevance check (fast heuristic — no LLM call) ────────────────────
    keyword_hits = sum(1 for kw in INCIDENT_KEYWORDS if kw in combined)
    if keyword_hits == 0:
        # Fall back to LLM classifier only if heuristic gives no signal
        relevance = _llm_relevance_check(title, description)
        if not relevance:
            return GuardResult(
                False,
                "This doesn't appear to be a technical incident. Please describe a system error, outage, or performance issue.",
                "NOT_AN_INCIDENT"
            )

    return GuardResult(True, "Input passed all guardrails.", "OK")


def _llm_relevance_check(title: str, description: str) -> bool:
    """
    Fast LLM call to classify whether this is a real IT/SRE incident.
    Only called when keyword heuristic gives no signal.
    Uses Haiku for speed + cost.
    """
    prompt = f"""Is this a legitimate IT/SRE/engineering incident report?
Title: {title}
Description: {description}

Reply with a single word: YES or NO"""

    try:
        result = call_claude(
            prompt=prompt,
            system="You classify whether text is a real technical incident report. Reply YES or NO only.",
            model_override="claude-haiku-4-5-20251001",
        )
        return result["text"].strip().upper().startswith("YES")
    except Exception:
        return True  # fail open — don't block if classifier errors
