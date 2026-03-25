---
name: Build multi-cloud IaC baseline module library
assignee: cloud-architect
project: cloud-operations-platform
---

## Objective

Design and publish the foundational Terraform/OpenTofu module library that serves as the single source of truth for all cloud resources across AWS, Azure, and GCP. Every module must comply with CIS Benchmark Level 2 out of the box.

## Acceptance Criteria

- [ ] Module library structure created with semantic versioning (`modules/aws/`, `modules/azure/`, `modules/gcp/`)
- [ ] AWS landing zone module: VPC, subnets (public/private/data), internet gateway, NAT gateway, flow logs enabled
- [ ] Azure landing zone module: VNET, NSGs, route tables, Azure Monitor diagnostic settings
- [ ] GCP landing zone module: VPC, subnets, firewall rules, Cloud Logging sinks
- [ ] IAM baseline modules: least-privilege role definitions, no wildcard policies, MFA enforcement
- [ ] Resource tagging module enforcing mandatory tags: `Environment`, `Owner`, `CostCentre`, `ManagedBy`
- [ ] All modules pass `checkov` scan with zero HIGH/CRITICAL findings
- [ ] All modules pass `tfsec` scan with zero HIGH/CRITICAL findings
- [ ] `tflint` runs clean with no errors
- [ ] README per module documenting inputs, outputs, and usage examples
- [ ] Module changelog (`CHANGELOG.md`) initialised at v1.0.0
- [ ] `.terraform.lock.hcl` committed for all modules with pinned provider versions
- [ ] DriftGuard security gate review completed and approved

## Security Requirements

- No hard-coded credentials or secrets in any module
- All storage resources must have encryption at rest enabled by default
- All network resources must deny public access by default (opt-in, not opt-out)
- CloudTrail/Audit Logging enabled on all landing zone modules by default
- S3 buckets: block public access, versioning enabled, MFA delete for production tier
