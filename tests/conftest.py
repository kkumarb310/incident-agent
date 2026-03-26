import pytest
import os
import sys

os.environ["ANTHROPIC_API_KEY"] = "test-key-fake"
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def api_client():
    return TestClient(app)


@pytest.fixture
def sample_incident():
    return {
        "title": "Database connection pool exhausted",
        "description": "PostgreSQL connection pool maxed out at 100. Orders API throwing timeout errors."
    }


@pytest.fixture
def sample_incident_with_pii():
    return {
        "title": "User reported outage",
        "description": "User john.doe@company.com from IP 192.168.1.45 reported checkout broken."
    }


@pytest.fixture
def mock_similar_incidents():
    return [
        "INC001: PostgreSQL connection pool hit max 100. Fixed by adding index and increasing pool size to 200.",
        "INC003: Redis eviction during traffic spike. Fixed by increasing memory.",
        "INC021: Replica lag 45 seconds behind primary. Fixed by killing analytics query."
    ]


@pytest.fixture
def mock_analysis():
    return {
        "severity": "P1",
        "root_cause": "PostgreSQL connection pool exhausted due to slow queries",
        "affected_services": ["orders-api", "postgres"],
        "confidence": 0.95,
        "model_used": "claude-sonnet-4-5"
    }


@pytest.fixture
def mock_recommendations():
    return {
        "immediate_actions": [
            "Kill idle connections with pg_terminate_backend",
            "Restart orders service to reset pool",
            "Check slow query log"
        ],
        "root_cause_fix": "Add index on orders.created_at",
        "escalate_to": "Database team",
        "estimated_resolution_mins": 20,
        "model_used": "claude-sonnet-4-5"
    }


@pytest.fixture
def mock_eval():
    return {
        "accuracy_score": 5,
        "hallucination_detected": False,
        "hallucinated_claims": [],
        "quality_score": 5,
        "actionable": True,
        "reasoning": "Analysis matches context perfectly",
        "passed": True,
        "overall_score": 5.0
    }