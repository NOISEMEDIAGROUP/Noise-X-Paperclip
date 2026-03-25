---
name: Deploy SRE observability stack and incident runbooks
assignee: sre
project: cloud-operations-platform
---

## Objective

Stand up the full observability stack for all client environments and author the automated incident runbook library. The goal is that every known failure mode either auto-resolves (P3/P4) or escalates with full context in under 5 minutes (P1/P2).

## Acceptance Criteria

- [ ] Metrics pipeline: Prometheus/CloudWatch/Azure Monitor/Cloud Monitoring → centralised aggregation
- [ ] Log pipeline: structured log ingestion from all services into central log store (e.g., OpenSearch, Datadog Logs)
- [ ] Tracing: distributed trace collection configured (OpenTelemetry or native APM)
- [ ] SLO dashboards created for each client environment: availability %, error rate, p99 latency
- [ ] Error budget burn rate dashboard: 1-hour burn rate and 6-hour burn rate alerts configured
- [ ] Synthetic monitoring: HTTP uptime probes every 5 minutes for all client-facing endpoints
- [ ] Alerting rules: P1–P4 severity tiers configured with PagerDuty routing (optional: Slack notifications)
- [ ] Automated runbook library (minimum 10 runbooks covering top failure modes):
  - High CPU / memory exhaustion
  - Disk space critical
  - Pod CrashLoopBackOff
  - RDS connection pool exhaustion
  - Load balancer 5xx spike
  - Certificate expiry warning
  - Autoscaling failure
  - DNS resolution failure
  - Database failover
  - Network egress spike
- [ ] P3/P4 runbooks are fully automated: detect → diagnose → remediate → verify → close
- [ ] P1/P2 runbooks auto-escalate to CloudCTO within 5 minutes with: alert context, affected services, blast radius assessment
- [ ] Post-incident review template created and linked in every P1/P2 runbook
- [ ] Chaos engineering baseline: 3 game-day experiments documented and scheduled

## SLO Targets

| SLI | Target | Measurement Window |
|-----|--------|-------------------|
| Availability | ≥ 99.9% | 30-day rolling |
| Error rate | ≤ 0.1% | 30-day rolling |
| p99 latency | ≤ 500ms | 7-day rolling |

## Security Requirements

- Observability dashboards are read-only for non-SRE agents
- Alert routing credentials (PagerDuty, Slack) stored in secrets manager
- Log data containing PII must be masked before storage
- Runbook execution is logged with full audit trail: runbook name, trigger, actions taken, outcome
