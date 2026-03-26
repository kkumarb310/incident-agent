import sqlite3
from pathlib import Path

DB_PATH = Path("incidents.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id     TEXT NOT NULL,
            incident_title TEXT,
            severity       TEXT,
            model_used     TEXT,
            pii_masked     INTEGER DEFAULT 0,
            eval_score     REAL,
            eval_passed    INTEGER,
            latency_ms     INTEGER,
            timestamp      TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS metrics (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id  TEXT NOT NULL,
            type        TEXT,
            severity    TEXT,
            latency_ms  INTEGER,
            model_used  TEXT,
            eval_score  REAL,
            eval_passed INTEGER,
            timestamp   TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id  TEXT NOT NULL,
            score       INTEGER,
            comment     TEXT,
            flagged     INTEGER DEFAULT 0,
            timestamp   TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS flagged (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id  TEXT NOT NULL,
            score       INTEGER,
            comment     TEXT,
            timestamp   TEXT
        )
    """)

    conn.commit()
    conn.close()
    print("[DB] Tables created successfully")