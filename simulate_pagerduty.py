"""
PagerDuty webhook simulator.

Sends a fake PagerDuty v3 webhook payload to the local /webhook/pagerduty endpoint,
including a valid HMAC-SHA256 signature so the secret verification passes.

Usage:
    python simulate_pagerduty.py
    python simulate_pagerduty.py --url http://localhost:8000 --secret mysecret
"""

import argparse
import hashlib
import hmac
import json
import os
import sys
import urllib.request
import urllib.error

SAMPLE_PAYLOAD = {
    "messages": [
        {
            "event": "incident.trigger",
            "incident": {
                "id": "PD-SIMULATED-001",
                "title": "Database connection pool exhausted on orders-api",
                "description": (
                    "The orders-api is throwing 'connection refused' errors. "
                    "PostgreSQL connection pool is maxed out. "
                    "Error rate 94% over the last 5 minutes."
                ),
                "summary": "Database connection pool exhausted on orders-api",
                "service": {
                    "summary": "orders-api"
                },
                "urgency": "high",
                "status": "triggered"
            }
        }
    ]
}


def send_webhook(url: str, secret: str, payload: dict) -> None:
    body = json.dumps(payload).encode()

    headers = {"Content-Type": "application/json"}
    if secret:
        sig = "v1=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        headers["X-PagerDuty-Signature"] = sig
        print(f"Signature: {sig}")

    req = urllib.request.Request(url, data=body, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            response_body = resp.read().decode()
            print(f"Status: {resp.status}")
            print("Response:")
            print(json.dumps(json.loads(response_body), indent=2))
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"Connection error: {e.reason}", file=sys.stderr)
        print("Is the server running? Try: uvicorn app.main:app --reload", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Simulate a PagerDuty webhook")
    parser.add_argument("--url", default="http://localhost:8000/webhook/pagerduty",
                        help="Webhook endpoint URL")
    parser.add_argument("--secret", default=os.getenv("PAGERDUTY_WEBHOOK_SECRET", ""),
                        help="Webhook secret (defaults to PAGERDUTY_WEBHOOK_SECRET env var)")
    args = parser.parse_args()

    print(f"Sending simulated PagerDuty webhook to {args.url}")
    print(f"Secret: {'set' if args.secret else 'not set (skipping signature)'}")
    print(f"Payload: {json.dumps(SAMPLE_PAYLOAD, indent=2)}\n")

    send_webhook(args.url, args.secret, SAMPLE_PAYLOAD)


if __name__ == "__main__":
    main()
