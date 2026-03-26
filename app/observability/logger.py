import json
import time
from pathlib import Path

AUDIT_FILE   = Path("audit_log.jsonl")
METRICS_FILE = Path("metrics_log.jsonl")

def audit_log(entry: dict):
    """Write one audit entry — permanent record of every request."""
    entry["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    with open(AUDIT_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")

    print(f"[Audit] {json.dumps(entry, indent=2)}")

def record_metric(entry: dict):
    """Write one metrics entry — latency, model, eval score."""
    entry["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    with open(METRICS_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")

def load_metrics() -> list[dict]:
    """Load all metrics for the dashboard."""
    if not METRICS_FILE.exists():
        return []
    with open(METRICS_FILE) as f:
        return [json.loads(line) for line in f if line.strip()]

def load_audit() -> list[dict]:
    """Load all audit entries."""
    if not AUDIT_FILE.exists():
        return []
    with open(AUDIT_FILE) as f:
        return [json.loads(line) for line in f if line.strip()]