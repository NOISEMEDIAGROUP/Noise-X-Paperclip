---
name: CloudOps Pro
description: Deliver fully managed cloud infrastructure operations and cost optimisation as a service.
slug: cloudops-pro
schema: agentcompanies/v1
version: 1.0.0
license: MIT
authors:
  - name: CloudOps Pro Team
goals:
  - Achieve and maintain 99.9% uptime SLA across all managed client environments
  - Drive 30% cloud cost reduction through continuous FinOps optimisation
  - Eliminate all manual deployments via zero-touch CI/CD automation
  - Close the automated incident-to-resolution loop with no human-in-the-loop for P3/P4
  - Enforce infrastructure-as-code as the single source of truth for all provisioning
  - Implement continuous security compliance and drift detection across all accounts
  - Deliver automated SLA reports and cost dashboards to clients on cadence
  - Build multi-cloud governance across AWS, Azure, and GCP
tags:
  - cloud
  - devops
  - infrastructure
  - finops
  - sre
  - security
  - managed-services
  - iac
requirements:
  secrets:
    required:
      - GH_TOKEN
      - AWS_ACCESS_KEY_ID
      - AWS_SECRET_ACCESS_KEY
    optional:
      - AZURE_SUBSCRIPTION_ID
      - AZURE_CLIENT_ID
      - AZURE_CLIENT_SECRET
      - GCP_PROJECT_ID
      - GCP_SERVICE_ACCOUNT_KEY
      - PAGERDUTY_API_KEY
      - SLACK_WEBHOOK_URL
      - DATADOG_API_KEY
---

CloudOps Pro is a fully managed cloud and DevOps services company. It operates an autonomous team of specialised agents that collectively own the entire infrastructure lifecycle — from IaC design and zero-touch deployments to real-time SRE monitoring, FinOps cost governance, and security compliance.

The company targets three quantifiable outcomes: **99.9% uptime**, **30% cloud cost reduction**, and **zero manual deployments** — validated continuously by automated SLA tracking and client reporting.

## Workflow

Work flows from strategic direction through execution and back into continuous feedback loops:

1. **CEO (CloudCEO)** receives client mandates and SLA commitments from the board, sets quarterly OKRs, and delegates to functional leads
2. **CTO (CloudCTO)** owns the engineering roadmap; coordinates the Cloud Architect, DevOps Engineer, and SRE to deliver infrastructure and reliability targets
3. **Cloud Architect (ArchBot)** designs and maintains all IaC templates across AWS, Azure, and GCP — the single source of truth for provisioning
4. **DevOps Engineer (DeployBot)** owns CI/CD pipelines and enforces zero-touch deployment policy; automates rollback on failure
5. **SRE (UptimeGuard)** monitors uptime, owns incident runbooks, and closes the automated incident-to-resolution loop
6. **FinOps Analyst (CostSage)** analyses cloud spend, produces rightsizing recommendations, and tracks progress toward the 30% cost reduction target
7. **Security Ops (DriftGuard)** runs continuous drift detection, enforces compliance baselines (CIS, SOC 2, NIST), and blocks non-compliant changes
8. **Program Manager (SLAPilot)** tracks SLA metrics across all clients, generates automated reports, and escalates breach risks to the CEO

## Security and Governance

All infrastructure changes must pass a three-gate approval chain:
- **Security gate**: DriftGuard validates against compliance baselines before any apply
- **Cost gate**: CostSage verifies the change does not increase monthly spend beyond approved budget
- **SLA gate**: UptimeGuard confirms the change does not risk uptime SLA breach

Production deployments additionally require SLAPilot sign-off when client SLAs are active.
