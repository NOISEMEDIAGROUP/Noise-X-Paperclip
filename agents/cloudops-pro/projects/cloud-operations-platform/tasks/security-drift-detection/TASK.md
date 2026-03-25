---
name: Implement continuous security drift detection and compliance pipeline
assignee: security-ops
project: cloud-operations-platform
---

## Objective

Deploy the Cloud Security Posture Management (CSPM) system and establish the continuous compliance pipeline that gates every infrastructure change. Every managed environment must have a live security posture score, and every IaC change must pass automated security scanning before reaching production.

## Acceptance Criteria

- [ ] CSPM tooling deployed: Prowler (AWS) / Azure Security Center / GCP Security Command Center
- [ ] Continuous drift detection configured: every 15 minutes, compare live state vs IaC state; alert on divergence
- [ ] Compliance baselines configured: CIS Benchmark Level 2 for AWS, Azure, and GCP
- [ ] SOC 2 Type II control mapping: all in-scope controls mapped to automated checks
- [ ] Security posture score dashboard: live score (0–100) per client environment updated every 15 minutes
- [ ] IaC security gate integrated into CI pipeline: checkov + tfsec on every PR targeting infrastructure code
- [ ] Pipeline security gate: DriftGuard review workflow on all pipeline YAML changes
- [ ] Secrets scanning enabled: pre-commit hook (detect-secrets or Gitleaks) + CI scan for committed secrets
- [ ] Quarterly IAM entitlement review workflow automated: identifies unused permissions, inactive credentials
- [ ] Vulnerability management: Trivy scanning of container images in registry; alerts on NEW HIGH/CRITICAL CVEs
- [ ] Secrets rotation schedule configured: API keys and service account credentials rotate every 90 days
- [ ] Network security baseline: automated check for overly-permissive security groups (0.0.0.0/0 ingress on sensitive ports)
- [ ] Incident severity matrix documented: CRITICAL ≤ 1h, HIGH ≤ 4h, MEDIUM ≤ 24h, LOW ≤ 7d remediation SLAs
- [ ] Security findings backlog created in Paperclip: all initial scan findings triaged and assigned

## Compliance Framework Coverage

| Framework | Automated Controls | Manual Controls | Scan Frequency |
|-----------|-------------------|-----------------|---------------|
| CIS Level 2 (AWS) | 150+ | 0 | 15 min |
| CIS Level 2 (Azure) | 130+ | 0 | 15 min |
| CIS Level 2 (GCP) | 120+ | 0 | 15 min |
| SOC 2 Type II | 80+ | 10 | Daily |
| NIST CSF | 60+ | 15 | Weekly |

## Security Requirements

- CSPM scan credentials must be read-only (no write permissions)
- All security findings are retained for 12 months for audit
- DriftGuard's gate approval is non-bypassable in the pipeline — pipeline must fail if gate is not completed
- Secrets detected in code trigger immediate rotation + incident creation (this is always P1)
- Security posture score below 70 triggers automatic escalation to CloudCTO and CloudCEO
