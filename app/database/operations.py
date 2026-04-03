import time
from app.database.db import get_connection

def insert_audit_log(entry: dict):
    conn = get_connection()
    conn.execute("""
        INSERT INTO audit_log
            (request_id, incident_title, severity, model_used,
             pii_masked, eval_score, eval_passed, latency_ms, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        entry.get("request_id"),
        entry.get("incident_title"),
        entry.get("severity"),
        entry.get("model_used"),
        1 if entry.get("pii_masked") else 0,
        entry.get("eval_score"),
        1 if entry.get("eval_passed") else 0,
        entry.get("latency_ms"),
        entry.get("timestamp", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    ))
    conn.commit()
    conn.close()

def insert_metric(entry: dict):
    conn = get_connection()
    conn.execute("""
        INSERT INTO metrics
            (request_id, type, severity, latency_ms,
             model_used, eval_score, eval_passed, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        entry.get("request_id"),
        entry.get("type"),
        entry.get("severity"),
        entry.get("latency_ms"),
        entry.get("model_used"),
        entry.get("eval_score"),
        1 if entry.get("eval_passed") else 0,
        entry.get("timestamp", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    ))
    conn.commit()
    conn.close()

def insert_feedback(entry: dict) -> dict:
    flagged = entry.get("score", 5) <= 2
    conn = get_connection()
    conn.execute("""
        INSERT INTO feedback
            (request_id, score, comment, flagged, timestamp)
        VALUES (?, ?, ?, ?, ?)
    """, (
        entry.get("request_id"),
        entry.get("score"),
        entry.get("comment", ""),
        1 if flagged else 0,
        entry.get("timestamp", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    ))
    if flagged:
        conn.execute("""
            INSERT INTO flagged (request_id, score, comment, timestamp)
            VALUES (?, ?, ?, ?)
        """, (
            entry.get("request_id"),
            entry.get("score"),
            entry.get("comment", ""),
            time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        ))
        print(f"[DB] Flagged low-score response: {entry.get('request_id')}")
    conn.commit()
    conn.close()
    entry["flagged"] = flagged
    return entry

def get_all_metrics() -> list[dict]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM metrics ORDER BY timestamp DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_all_audit() -> list[dict]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM audit_log ORDER BY timestamp DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_all_feedback() -> list[dict]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM feedback ORDER BY timestamp DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_all_flagged() -> list[dict]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM flagged ORDER BY timestamp DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_metrics_summary() -> dict:
    conn = get_connection()
    total = conn.execute("SELECT COUNT(*) FROM metrics").fetchone()[0]
    if total == 0:
        conn.close()
        return {}
    avg_latency = conn.execute(
        "SELECT ROUND(AVG(latency_ms), 1) FROM metrics"
    ).fetchone()[0]
    avg_score = conn.execute(
        "SELECT ROUND(AVG(eval_score), 2) FROM metrics WHERE eval_score IS NOT NULL"
    ).fetchone()[0]
    severity_rows = conn.execute(
        "SELECT severity, COUNT(*) as count FROM metrics GROUP BY severity"
    ).fetchall()
    severity_breakdown = {row["severity"]: row["count"] for row in severity_rows}
    model_rows = conn.execute(
        "SELECT model_used, COUNT(*) as count FROM metrics GROUP BY model_used"
    ).fetchall()
    model_usage = {row["model_used"]: row["count"] for row in model_rows}
    passed = conn.execute(
        "SELECT COUNT(*) FROM metrics WHERE eval_passed = 1"
    ).fetchone()[0]
    score_rows = conn.execute(
        "SELECT ROUND(eval_score) as score, COUNT(*) as count "
        "FROM metrics WHERE eval_score IS NOT NULL GROUP BY ROUND(eval_score)"
    ).fetchall()
    score_breakdown = {int(row["score"]): row["count"] for row in score_rows}
    avg_feedback = conn.execute(
        "SELECT ROUND(AVG(score), 2) FROM feedback"
    ).fetchone()[0]
    conn.close()
    result = {
        "total_incidents":    total,
        "avg_latency_ms":     avg_latency or 0,
        "avg_eval_score":     avg_score or 0,
        "severity_breakdown": severity_breakdown,
        "score_breakdown":    score_breakdown,
        "model_usage":        model_usage,
        "pass_rate":          round(passed / total, 2) if total else 0,
    }
    if avg_feedback is not None:
        result["avg_feedback_score"] = avg_feedback
    return result