import json
import time
from pathlib import Path

FEEDBACK_FILE = Path("feedback_log.jsonl")
FLAGGED_FILE  = Path("flagged_log.jsonl")

def save_feedback(entry: dict) -> dict:
    """Save user feedback. Auto-flag if score <= 2."""
    entry["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    with open(FEEDBACK_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")

    # Auto-flag bad responses for prompt review
    if entry.get("score", 5) <= 2:
        entry["flagged"] = True
        with open(FLAGGED_FILE, "a") as f:
            f.write(json.dumps(entry) + "\n")
        print(f"[Feedback] Low score flagged for review: {entry.get('request_id')}")

    return entry

def load_feedback() -> list[dict]:
    if not FEEDBACK_FILE.exists():
        return []
    with open(FEEDBACK_FILE) as f:
        return [json.loads(line) for line in f if line.strip()]

def load_flagged() -> list[dict]:
    if not FLAGGED_FILE.exists():
        return []
    with open(FLAGGED_FILE) as f:
        return [json.loads(line) for line in f if line.strip()]