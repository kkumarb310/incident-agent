import time
from app.database.db import init_db
from app.database.operations import (
    insert_audit_log,
    insert_metric,
    get_all_metrics,
    get_all_audit
)

# Initialize database tables on import
init_db()

def audit_log(entry: dict):
    """Write one audit entry to SQLite."""
    entry["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    insert_audit_log(entry)
    print(f"[Audit] request_id={entry.get('request_id')} severity={entry.get('severity')} latency={entry.get('latency_ms')}ms")

def record_metric(entry: dict):
    """Write one metrics entry to SQLite."""
    entry["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    insert_metric(entry)

def load_metrics() -> list[dict]:
    return get_all_metrics()

def load_audit() -> list[dict]:
    return get_all_audit()