---
name: Implement zero-touch CI/CD deployment platform
assignee: devops-engineer
project: cloud-operations-platform
---

## Objective

Build the GitHub Actions CI/CD platform that enforces zero-touch deployments for all client environments. Every infrastructure and application change must flow through this pipeline — manual deploys are a P2 incident.

## Acceptance Criteria

- [ ] GitHub Actions reusable workflow library created (`workflows/`)
- [ ] `ci.yml`: lint → IaC security scan (checkov/tfsec) → validate → plan → cost estimate
- [ ] `cd-staging.yml`: plan → security gate (DriftGuard approval) → apply → smoke test
- [ ] `cd-production.yml`: plan → security gate → cost gate → SLA gate → apply → health check → rollback on failure
- [ ] Automated rollback: if post-deploy health check fails within 5 minutes, pipeline auto-reverts to previous state
- [ ] Container image build pipeline: build → scan (Trivy) → sign (cosign/sigstore) → push to registry
- [ ] SBOM generated on every build and stored in artifact registry alongside the image
- [ ] Pipeline secrets injected via GitHub Actions secrets / OIDC (no plaintext credentials in YAML)
- [ ] OIDC-based cloud provider authentication (no long-lived access keys in CI)
- [ ] DORA metrics emitted per deployment: timestamp, duration, commit SHA, environment, success/failure
- [ ] Dependency vulnerability scanning on every PR (Trivy or Snyk)
- [ ] Pipeline branch protection: no direct push to main; all changes via PR with required status checks
- [ ] Reusable workflow templates for client onboarding (parameterised by cloud provider and environment)

## Deployment Gates (in order)

1. **Lint & Validate** — IaC syntax valid, no tflint errors
2. **Security Gate** — DriftGuard scan: zero HIGH/CRITICAL findings (auto-check, no manual step)
3. **Cost Gate** — CostSage cost estimate: delta within approved budget threshold
4. **SLA Gate** — UptimeGuard pre-deploy risk check: no active incidents, error budget healthy
5. **Apply** — Terraform apply / kubectl apply / helm upgrade
6. **Health Check** — Synthetic probe and SLO check (5-minute window)
7. **Auto-Rollback** — If health check fails: automatic revert + P2 incident created

## Security Requirements

- All cloud provider authentication via OIDC short-lived tokens only — no IAM access keys stored in CI
- Pipeline permissions follow least-privilege: each job has only the permissions it needs
- Unsigned container images are rejected at deploy time
- All pipeline runs are logged with full audit trail: actor, time, inputs, outputs
