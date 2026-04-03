"""
Seed the live backend with 20 realistic incidents.
Populates Railway SQLite → feeds /metrics endpoint → fills all dashboard charts.

Usage:
    python scripts/seed_demo.py

Requires: pip install requests
"""

import requests
import time
import json

BASE = "https://incident-agent-production.up.railway.app"

INCIDENTS = [
    {
        "title": "Payment service database connection pool exhausted",
        "description": (
            "The payment-service is throwing 'too many connections' errors. "
            "Postgres is at max_connections=100. Orders are failing at checkout. "
            "Error rate spiked to 45% in the last 10 minutes."
        ),
    },
    {
        "title": "Auth service returning 500 on all login requests",
        "description": (
            "Users cannot log in. auth-service pods are throwing NullPointerException "
            "on JWT validation. Started after the 14:30 deployment of auth-service v2.1.4. "
            "All sessions are being invalidated."
        ),
    },
    {
        "title": "Redis cache cluster out of memory — eviction storm",
        "description": (
            "Redis is reporting maxmemory-policy allkeys-lru evicting thousands of keys/sec. "
            "Cache hit rate dropped from 94% to 12%. API latency jumped from 80ms to 2.4s. "
            "Affected services: api-gateway, product-catalog, session-store."
        ),
    },
    {
        "title": "Kafka consumer lag exceeding 2 million messages",
        "description": (
            "The orders-consumer group is falling behind. Lag on partition 0-5 of "
            "orders.created topic is 2.1M messages. Background workers processing "
            "fulfillment are stuck. No dead-letter queue events but throughput is near zero."
        ),
    },
    {
        "title": "CDN serving stale 404 pages for all /api routes",
        "description": (
            "CloudFront is returning cached 404 responses for all API Gateway routes "
            "after a misconfigured cache behaviour was deployed. TTL is set to 86400s. "
            "Frontend calls are failing globally. Origin is healthy."
        ),
    },
    {
        "title": "Orders service memory leak — OOM kills every 20 minutes",
        "description": (
            "orders-service pods are being OOMKilled every ~20 minutes. "
            "Memory climbs from 256MB to 1.2GB before crash. "
            "Heap dump shows thousands of unclosed HTTP client connections. "
            "Introduced in commit a3f9c12 three days ago."
        ),
    },
    {
        "title": "Notification service sending duplicate emails to users",
        "description": (
            "Users are reporting receiving the same order confirmation email 3-5 times. "
            "notification-service is retrying on idempotent sends due to a missing "
            "deduplication key in the SQS message handler. Affects ~2,000 users/hr."
        ),
    },
    {
        "title": "Background job scheduler running duplicate cron tasks",
        "description": (
            "The daily billing-reconciliation job has run 4 times today instead of once. "
            "Caused by a DST clock-change bug in the cron parser. "
            "Duplicate charges have been attempted for 312 customers. Needs immediate rollback."
        ),
    },
    {
        "title": "API gateway rate limiter blocking legitimate traffic",
        "description": (
            "api-gateway rate limiter is throttling mobile clients at 10 req/min instead "
            "of the configured 1000 req/min. Config map was overwritten during Helm upgrade. "
            "Mobile app returning 429 for ~60% of authenticated requests."
        ),
    },
    {
        "title": "Search service Elasticsearch index corrupted after shard failure",
        "description": (
            "Product search returning 0 results for all queries. "
            "Elasticsearch cluster lost a primary shard (node es-data-2 went offline). "
            "Index products_v4 is red status. Replica promotion failed. "
            "Last successful snapshot was 6 hours ago."
        ),
    },
    {
        "title": "Slow query degrading checkout performance — missing index",
        "description": (
            "Checkout p99 latency climbed from 200ms to 8.4s over the last hour. "
            "Postgres slow query log shows full table scan on orders.customer_id. "
            "The index idx_orders_customer was dropped in migration 0045. "
            "Affects all /checkout and /order-history endpoints."
        ),
    },
    {
        "title": "S3 presigned URL generation failing — IAM permission revoked",
        "description": (
            "File upload feature is broken. media-service cannot generate S3 presigned URLs. "
            "Error: AccessDenied on s3:PutObject for role media-service-prod. "
            "IAM policy was tightened in a security review 2 hours ago. "
            "Affects profile picture uploads and document attachments."
        ),
    },
    {
        "title": "Webhook delivery failures — TLS certificate expired",
        "description": (
            "Outbound webhook delivery to customer endpoints is failing with SSL handshake errors. "
            "webhook-service TLS cert expired at 03:00 UTC today. "
            "Certificate auto-renewal failed (certbot timeout). "
            "~4,500 undelivered webhooks queued in retry backlog."
        ),
    },
    {
        "title": "Postgres replication lag exceeding 45 seconds on read replica",
        "description": (
            "Read replica postgres-replica-2 is 45+ seconds behind primary. "
            "Analytics queries are returning stale data. "
            "WAL sender process is consuming 98% CPU on primary. "
            "Large batch INSERT from the data pipeline job triggered the lag."
        ),
    },
    {
        "title": "Disk usage at 94% on logging node — log rotation not working",
        "description": (
            "logging-node-01 disk is at 94% capacity. Logrotate cron job has not run "
            "in 72 hours due to a permissions error on /var/log/app. "
            "Log ingestion will fail when disk hits 100%. "
            "Fluentd is already dropping log lines."
        ),
    },
    {
        "title": "Feature flag service unresponsive — all flags returning default",
        "description": (
            "LaunchDarkly SDK is timing out on flag evaluation. "
            "All feature flags are returning hardcoded defaults, enabling unreleased features "
            "for production users. LaunchDarkly API latency is >10s. "
            "Rollout of payments v2 is now live unintentionally for 100% of users."
        ),
    },
    {
        "title": "gRPC service mesh certificate rotation broke inter-service auth",
        "description": (
            "Istio mTLS certificate rotation ran at midnight and rotated certs on 3/5 services. "
            "Two services (inventory-service, pricing-service) missed rotation. "
            "All gRPC calls between these services are now failing with CERTIFICATE_EXPIRED. "
            "Cart and product pages are returning 503."
        ),
    },
    {
        "title": "Mobile push notification delivery rate dropped to 3%",
        "description": (
            "iOS push notifications are failing. APNs is returning 'BadDeviceToken' for 97% "
            "of tokens in our database. Tokens were bulk-migrated from old provider last week "
            "without re-registration. Android (FCM) is unaffected."
        ),
    },
    {
        "title": "Terraform state lock stuck — blocking all infrastructure changes",
        "description": (
            "Terraform S3 backend state lock has been held for 3 hours by a timed-out CI job. "
            "DynamoDB lock table entry: job ID ci-run-4892. "
            "No infrastructure changes can be applied. Blocking hotfix deployment for auth rollback."
        ),
    },
    {
        "title": "GraphQL N+1 queries overloading postgres during peak hours",
        "description": (
            "Between 18:00-20:00 UTC postgres CPU hits 100%. "
            "GraphQL resolver for user.orders is firing one query per user instead of batching. "
            "DataLoader was accidentally removed in PR #2041. "
            "Affects dashboard page which loads 50+ user records simultaneously."
        ),
    },
]


def seed():
    print(f"Seeding {len(INCIDENTS)} incidents to {BASE}\n")
    results = []
    for i, incident in enumerate(INCIDENTS, 1):
        print(f"[{i:02d}/{len(INCIDENTS)}] {incident['title'][:60]}...")
        try:
            resp = requests.post(
                f"{BASE}/triage",
                json=incident,
                timeout=60,
            )
            if resp.status_code == 200:
                data = resp.json()
                sev   = data.get("analysis", {}).get("severity", "?")
                score = data.get("evaluation", {}).get("overall_score", "?")
                ms    = data.get("latency_ms", "?")
                rid   = data.get("request_id", "?")
                print(f"         ✓  {sev}  score={score}/5  {ms}ms  id={rid}")
                results.append(data)
            else:
                print(f"         ✗  HTTP {resp.status_code}: {resp.text[:100]}")
        except Exception as e:
            print(f"         ✗  Error: {e}")

        # brief pause to avoid hammering the API
        if i < len(INCIDENTS):
            time.sleep(2)

    print(f"\nDone. {len(results)}/{len(INCIDENTS)} succeeded.")

    # save responses for optional localStorage import
    out = "scripts/seed_results.json"
    with open(out, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Responses saved to {out}")
    print("\nNext: open the app and click 'Load Demo Data' in the History page to seed the browser.")


if __name__ == "__main__":
    seed()
