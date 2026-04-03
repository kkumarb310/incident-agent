/**
 * Loads 20 realistic pre-crafted incidents into localStorage.
 * Populates: Home activity feed, History table, Top Services chart, Agent Perf trend.
 * Timestamps are spread over the last 30 days so charts look natural.
 */

const DEMO_INCIDENTS = [
  { severity: "P1", title: "Payment service DB connection pool exhausted",       services: ["payments", "postgres"],              score: 4.5, latency: 3820, passed: true,  hallucination: false },
  { severity: "P1", title: "Auth service returning 500 on all login requests",   services: ["auth-service", "jwt-validator"],     score: 5,   latency: 4210, passed: true,  hallucination: false },
  { severity: "P2", title: "Redis cache cluster OOM — eviction storm",           services: ["redis", "api-gateway", "sessions"],  score: 4,   latency: 2900, passed: true,  hallucination: false },
  { severity: "P1", title: "Kafka consumer lag exceeding 2 million messages",    services: ["kafka", "orders-consumer"],          score: 4.5, latency: 5100, passed: true,  hallucination: false },
  { severity: "P2", title: "CDN serving stale 404 pages for all /api routes",    services: ["cdn", "api-gateway"],                score: 4,   latency: 2300, passed: true,  hallucination: false },
  { severity: "P2", title: "Orders service memory leak — OOM kills every 20m",   services: ["orders-service", "kubernetes"],      score: 3.5, latency: 3600, passed: true,  hallucination: false },
  { severity: "P2", title: "Notification service sending duplicate emails",       services: ["notification-service", "sqs"],       score: 4,   latency: 2800, passed: true,  hallucination: false },
  { severity: "P1", title: "Background job scheduler running duplicate cron",    services: ["background-worker", "billing"],      score: 5,   latency: 4500, passed: true,  hallucination: false },
  { severity: "P3", title: "API gateway rate limiter blocking legitimate traffic",services: ["api-gateway"],                       score: 4,   latency: 1900, passed: true,  hallucination: false },
  { severity: "P2", title: "Elasticsearch index corrupted after shard failure",  services: ["elasticsearch", "search-service"],   score: 3,   latency: 4800, passed: false, hallucination: true  },
  { severity: "P2", title: "Slow query degrading checkout — missing index",      services: ["postgres", "orders-service"],        score: 4.5, latency: 3200, passed: true,  hallucination: false },
  { severity: "P3", title: "S3 presigned URL generation failing — IAM revoked",  services: ["s3", "media-service", "iam"],        score: 4,   latency: 2100, passed: true,  hallucination: false },
  { severity: "P2", title: "Webhook delivery failures — TLS cert expired",       services: ["webhook-service", "tls"],            score: 5,   latency: 2600, passed: true,  hallucination: false },
  { severity: "P3", title: "Postgres replication lag exceeding 45 seconds",      services: ["postgres", "analytics"],             score: 4,   latency: 3100, passed: true,  hallucination: false },
  { severity: "P3", title: "Disk usage at 94% — log rotation not working",       services: ["logging-node", "fluentd"],           score: 3.5, latency: 1700, passed: true,  hallucination: false },
  { severity: "P2", title: "Feature flag service unresponsive — flags defaulting",services: ["launchdarkly", "api-gateway"],       score: 4.5, latency: 2400, passed: true,  hallucination: false },
  { severity: "P1", title: "gRPC service mesh cert rotation broke inter-service auth", services: ["istio", "inventory-service", "pricing-service"], score: 5, latency: 5300, passed: true, hallucination: false },
  { severity: "P2", title: "Mobile push delivery rate dropped to 3%",            services: ["apns", "notification-service"],      score: 4,   latency: 2700, passed: true,  hallucination: false },
  { severity: "P3", title: "Terraform state lock stuck — blocking infra changes",services: ["terraform", "s3", "dynamodb"],       score: 3,   latency: 2000, passed: false, hallucination: false },
  { severity: "P2", title: "GraphQL N+1 queries overloading postgres peak hours",services: ["graphql", "postgres", "api-gateway"],score: 4.5, latency: 3400, passed: true,  hallucination: false },
];

function makeEntry(inc, daysAgo) {
  const id = Math.random().toString(36).slice(2, 10);
  const date = new Date(Date.now() - daysAgo * 86400000 - Math.random() * 43200000);
  return {
    id,
    title: inc.title,
    severity: inc.severity,
    date: date.toISOString(),
    evalScore: inc.score,
    latency: inc.latency,
    services: inc.services,
    result: {
      request_id: id,
      latency_ms: inc.latency,
      context_used: 3,
      pii_masked: false,
      analysis: {
        severity: inc.severity,
        root_cause: `Root cause identified for: ${inc.title.toLowerCase()}. Detailed analysis provided by AI pipeline.`,
        affected_services: inc.services,
        confidence: 0.82 + Math.random() * 0.15,
      },
      recommendations: {
        immediate_actions: [
          "Isolate the affected component and enable circuit breaker",
          "Roll back the last deployment if issue started post-deploy",
          "Notify on-call team and open a war room bridge",
        ],
        root_cause_fix: "Implement a permanent fix by addressing the root configuration or code issue identified above.",
        escalate_to: inc.severity === "P1" ? "Engineering lead + on-call SRE" : "On-call SRE",
        estimated_resolution_mins: inc.severity === "P1" ? 30 : inc.severity === "P2" ? 60 : 120,
      },
      evaluation: {
        overall_score: inc.score,
        hallucination_detected: inc.hallucination,
        passed: inc.passed,
        accuracy_score: Math.round(inc.score),
        quality_score: Math.round(inc.score),
      },
    },
  };
}

export function loadDemoData() {
  // spread incidents over last 30 days, newest first
  const entries = DEMO_INCIDENTS.map((inc, i) =>
    makeEntry(inc, Math.round((i / DEMO_INCIDENTS.length) * 30))
  ).sort((a, b) => new Date(a.date) - new Date(b.date));

  localStorage.setItem("incident_history", JSON.stringify(entries));
  return entries.length;
}

export function clearDemoData() {
  localStorage.removeItem("incident_history");
}
