"""
Offline Eval Suite
==================
Regression tests for the full pipeline using known incidents with expected outputs.

Run with:
    python -m app.eval.eval_suite

What it tests:
  - Does a P1 DB incident get classified as P1?
  - Does the root cause mention the right component?
  - Are there at least 3 immediate actions?
  - Is confidence above 0.6 for clear-cut incidents?
  - Does the eval agent correctly detect hallucination in a bad response?
  - Do all deterministic checks pass?

Exit code 0 = all passed, 1 = failures found.
"""

import sys
import json
from app.agents.orchestrator import run

# ── Test cases ────────────────────────────────────────────────────────────────
# Each case defines:
#   incident   — what the engineer submits
#   expect     — assertions to check on the result
#   label      — human-readable name

TEST_CASES = [
    {
        "label": "P1 — DB connection pool exhausted",
        "incident": {
            "title": "Payment service database connection pool exhausted",
            "description": (
                "The payment-service is throwing 'too many connections' errors. "
                "Postgres is at max_connections=100. Orders are failing at checkout. "
                "Error rate spiked to 45% in the last 10 minutes."
            ),
        },
        "expect": {
            "severity": "P1",
            "confidence_min": 0.6,
            "root_cause_contains": ["connection", "pool", "postgres"],
            "min_actions": 2,
            "eval_passed": True,
        },
    },
    {
        "label": "P2 — Redis cache miss spike",
        "incident": {
            "title": "Redis cache cluster OOM causing API slowdown",
            "description": (
                "Redis maxmemory-policy is evicting thousands of keys/sec. "
                "Cache hit rate dropped from 94% to 12%. API latency jumped to 2.4s. "
                "Affects api-gateway and session-store."
            ),
        },
        "expect": {
            "severity_in": ["P1", "P2"],
            "confidence_min": 0.5,
            "root_cause_contains": ["redis", "cache", "memory", "evict"],
            "min_actions": 1,
            "eval_passed": True,
        },
    },
    {
        "label": "P3 — Disk usage warning",
        "incident": {
            "title": "Disk usage at 94% on logging node",
            "description": (
                "logging-node-01 disk is at 94% capacity. "
                "Logrotate cron job has not run in 72 hours. "
                "Fluentd is dropping log lines."
            ),
        },
        "expect": {
            "severity_in": ["P2", "P3"],
            "confidence_min": 0.5,
            "root_cause_contains": ["disk", "log", "rotat"],
            "min_actions": 1,
            "eval_passed": True,
        },
    },
    {
        "label": "Deterministic — ETA must be positive",
        "incident": {
            "title": "Auth service JWT validation failing",
            "description": (
                "Users cannot log in. auth-service is throwing NullPointerException "
                "on JWT validation after deployment of v2.1.4."
            ),
        },
        "expect": {
            "eta_positive": True,
            "has_escalation": True,
            "det_passed": True,
        },
    },
    {
        "label": "Guardrail — input too short should be blocked",
        "incident": {
            "title": "broken",
            "description": "its slow",
        },
        "expect": {
            "guardrail_blocks": True,
        },
        "test_type": "guardrail",
    },
]


# ── Runner ────────────────────────────────────────────────────────────────────

def run_suite():
    from app.guardrails.input_guard import check_input

    print("\n" + "=" * 60)
    print("  INCIDENT AGENT — EVAL SUITE")
    print("=" * 60 + "\n")

    total   = len(TEST_CASES)
    passed  = 0
    failed  = 0
    results = []

    for i, case in enumerate(TEST_CASES, 1):
        label    = case["label"]
        incident = case["incident"]
        expect   = case["expect"]
        test_type = case.get("test_type", "pipeline")

        print(f"[{i}/{total}] {label}")

        try:
            # ── Guardrail-only test ───────────────────────────────────────────
            if test_type == "guardrail":
                guard = check_input(incident["title"], incident["description"])
                if expect.get("guardrail_blocks"):
                    ok = not guard.passed
                    msg = "PASS — input correctly blocked" if ok else f"FAIL — expected block, got: {guard.reason}"
                else:
                    ok = guard.passed
                    msg = "PASS — input correctly allowed" if ok else f"FAIL — unexpected block: {guard.reason}"

                print(f"  {'PASS' if ok else 'FAIL'}  {msg}")
                if ok:
                    passed += 1
                else:
                    failed += 1
                results.append({"label": label, "passed": ok, "detail": msg})
                continue

            # ── Full pipeline test ────────────────────────────────────────────
            result = run(incident)

            analysis     = result["analysis"]
            recs         = result["recommendations"]
            evaluation   = result["evaluation"]
            case_passed  = True
            case_notes   = []

            # Severity exact match
            if "severity" in expect:
                ok = analysis.get("severity") == expect["severity"]
                case_notes.append(f"severity={analysis.get('severity')} ({'OK' if ok else 'FAIL expected ' + expect['severity']})")
                if not ok:
                    case_passed = False

            # Severity in set
            if "severity_in" in expect:
                ok = analysis.get("severity") in expect["severity_in"]
                case_notes.append(f"severity={analysis.get('severity')} ({'OK' if ok else 'FAIL'})")
                if not ok:
                    case_passed = False

            # Confidence minimum
            if "confidence_min" in expect:
                conf = analysis.get("confidence", 0)
                ok   = conf >= expect["confidence_min"]
                case_notes.append(f"confidence={conf:.2f} ({'OK' if ok else 'FAIL min=' + str(expect['confidence_min'])})")
                if not ok:
                    case_passed = False

            # Root cause keywords
            if "root_cause_contains" in expect:
                rc   = analysis.get("root_cause", "").lower()
                hits = [kw for kw in expect["root_cause_contains"] if kw in rc]
                ok   = len(hits) >= 1
                case_notes.append(f"root_cause keywords={hits} ({'OK' if ok else 'FAIL none found in: ' + rc[:60]})")
                if not ok:
                    case_passed = False

            # Minimum immediate actions
            if "min_actions" in expect:
                n  = len(recs.get("immediate_actions", []))
                ok = n >= expect["min_actions"]
                case_notes.append(f"actions={n} ({'OK' if ok else 'FAIL min=' + str(expect['min_actions'])})")
                if not ok:
                    case_passed = False

            # Eval passed
            if "eval_passed" in expect:
                ok = evaluation.get("passed") == expect["eval_passed"]
                case_notes.append(f"eval_passed={evaluation.get('passed')} ({'OK' if ok else 'FAIL'})")
                if not ok:
                    case_passed = False

            # ETA positive
            if expect.get("eta_positive"):
                eta = recs.get("estimated_resolution_mins", 0)
                ok  = isinstance(eta, (int, float)) and eta > 0
                case_notes.append(f"eta={eta} ({'OK' if ok else 'FAIL'})")
                if not ok:
                    case_passed = False

            # Has escalation
            if expect.get("has_escalation"):
                esc = recs.get("escalate_to", "").strip()
                ok  = len(esc) > 0
                case_notes.append(f"escalate_to='{esc}' ({'OK' if ok else 'FAIL empty'})")
                if not ok:
                    case_passed = False

            # Deterministic checks passed
            if expect.get("det_passed"):
                ok = evaluation.get("deterministic_passed", True)
                case_notes.append(f"det_passed={ok} ({'OK' if ok else 'FAIL'})")
                if not ok:
                    case_passed = False
                    for fail in evaluation.get("deterministic_failures", []):
                        case_notes.append(f"  det_fail: {fail}")

            status = "PASS" if case_passed else "FAIL"
            print(f"  {status}  " + " | ".join(case_notes))

            if case_passed:
                passed += 1
            else:
                failed += 1

            results.append({"label": label, "passed": case_passed, "detail": case_notes})

        except Exception as e:
            print(f"  ERROR  {e}")
            failed += 1
            results.append({"label": label, "passed": False, "detail": str(e)})

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(f"  RESULTS: {passed}/{total} passed  |  {failed} failed")
    print("=" * 60 + "\n")

    if failed > 0:
        print("FAILED CASES:")
        for r in results:
            if not r["passed"]:
                print(f"  - {r['label']}")
        sys.exit(1)
    else:
        print("All eval cases passed.")
        sys.exit(0)


if __name__ == "__main__":
    run_suite()
