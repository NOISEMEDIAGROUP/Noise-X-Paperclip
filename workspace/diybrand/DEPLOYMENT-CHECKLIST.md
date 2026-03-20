# DIYBrand Deployment Checklist

**Status:** Pre-Deployment Verification
**Owner:** Atlas (DevOps & Infrastructure Engineer)
**Last Updated:** 2026-03-20

---

## Phase 1: Domain & Vercel Setup

### Domain Registration
- [ ] Domain `diybrand.app` registered (GoDaddy, Namecheap, or Route 53)
- [ ] Domain ownership verified
- [ ] Nameserver details noted (needed for Vercel DNS)
- [ ] WHOIS privacy enabled (recommended)

**Related Issue:** [DIY-51](/DIY/issues/DIY-51)

### Vercel Project Creation
- [ ] New project created in Vercel
- [ ] GitHub repository linked to Vercel
- [ ] Preview deployment branch configured
- [ ] Production deployment branch configured (`main`)
- [ ] Custom domain `diybrand.app` added to Vercel project
- [ ] Staging subdomain `staging.diybrand.app` configured (optional)
- [ ] SSL/TLS certificates auto-provisioned by Let's Encrypt
- [ ] HSTS preload setup verified (via Vercel settings)

**Related Issue:** [DIY-52](/DIY/issues/DIY-52)
**Reference:** [VERCEL-SETUP.md](./VERCEL-SETUP.md)

---

## Phase 2: GitHub Secrets Configuration

### Required Secrets
- [ ] `VERCEL_TOKEN` — Vercel API token (from Vercel account settings)
- [ ] `VERCEL_PROJECT_ID` — DIYBrand project ID (from Vercel project settings)
- [ ] `VERCEL_ORG_ID` — Vercel organization ID (from Vercel team settings)
- [ ] `SENTRY_DSN` — Sentry server DSN (from Sentry project)
- [ ] `NEXT_PUBLIC_SENTRY_DSN` — Sentry client DSN (typically same as SENTRY_DSN)
- [ ] `STRIPE_SECRET_KEY` — Stripe API secret (production)
- [ ] `DATABASE_URL` — PostgreSQL connection string
- [ ] `SLACK_WEBHOOK` — Slack notification webhook (optional)

### Secret Verification
- [ ] All secrets stored in GitHub → Settings → Secrets and variables → Actions
- [ ] All secrets marked as masked in GitHub
- [ ] No secrets committed to repository (double-check: `git log --all --source --grep=SECRET`)
- [ ] `.env.production` and `.env.staging` exist with template values only

**Related Issue:** [DIY-53](/DIY/issues/DIY-53)
**Reference:** [INFRASTRUCTURE.md - Environment Configuration](./INFRASTRUCTURE.md#environment-configuration)

---

## Phase 3: CI/CD Pipeline Verification

### Workflow Files
- [ ] `.github/workflows/ci-cd.yml` exists and is valid YAML
- [ ] `.github/workflows/pr-validation.yml` exists and is valid YAML
- [ ] `.github/dependabot.yml` exists for automated dependency updates
- [ ] All workflow files committed to `main` branch

### Pipeline Stages
- [ ] **Lint Stage:** ESLint validation enabled
- [ ] **Test Stage:** Test suite execution enabled (non-blocking)
- [ ] **Build Stage:** Next.js build configured
- [ ] **Deploy Staging:** Auto-deployment to preview environment
- [ ] **Deploy Production:** Manual approval gate configured in GitHub

### GitHub Branch Protection
- [ ] `main` branch requires status checks to pass before merge
- [ ] Required checks: `lint`, `build`
- [ ] Production environment requires manual approval
- [ ] Dismiss stale PR approvals enabled (recommended)

---

## Phase 4: Sentry Error Tracking Setup

### Sentry Configuration
- [ ] Sentry project created (if not already)
- [ ] Sentry DSN obtained (both server and client)
- [ ] Server-side config: `sentry.server.config.ts` in place
- [ ] Client-side config: `sentry.client.config.ts` in place
- [ ] Instrumentation: `src/instrumentation.ts` in place
- [ ] Tunnel route `/monitoring` configured for ad-blocker safety
- [ ] Error suppression rules configured (filter out noise)

### Error Tracking Validation
- [ ] Test error endpoint responds: `/api/test-error`
- [ ] Test error captured in Sentry dashboard
- [ ] Stack traces readable (source maps working)
- [ ] Release tracking enabled (correlate errors to commits)
- [ ] Alerts configured for critical error rates (> 1% spike)

**Reference:** [INFRASTRUCTURE.md - Error Tracking](./INFRASTRUCTURE.md#error-tracking-sentry)

---

## Phase 5: Monitoring & Uptime Checks

### Uptime Monitoring
- [ ] Uptime monitoring tool configured (status.diybrand.app or equivalent)
- [ ] Production endpoint monitored: `https://diybrand.app`
- [ ] Staging endpoint monitored: `https://staging.diybrand.app` (optional)
- [ ] Check frequency: every 5 minutes
- [ ] Alert threshold: 2+ consecutive failures
- [ ] Alerting configured (Slack, email, PagerDuty)

### Performance Monitoring
- [ ] Core Web Vitals monitoring enabled (via Vercel Analytics or Google PageSpeed)
- [ ] Target LCP: < 2.5 seconds
- [ ] Target FID: < 100 milliseconds
- [ ] Target CLS: < 0.1
- [ ] Performance dashboard created or linked

### Error Rate Monitoring
- [ ] Error rate alert configured: > 1% within 5 minutes = critical
- [ ] Alert channel: Slack, email, or on-call tool
- [ ] Escalation procedure defined

**Reference:** [INFRASTRUCTURE.md - Monitoring & Observability](./INFRASTRUCTURE.md#monitoring--observability)

---

## Phase 6: Database & Backups

### Vercel Postgres Setup
- [ ] PostgreSQL instance created in Vercel
- [ ] Connection string obtained (stored in GitHub secrets as `DATABASE_URL`)
- [ ] Database initialized with schema
- [ ] Test query succeeds: `SELECT 1`

### Backup Verification
- [ ] Backup retention policy set (30 days minimum)
- [ ] Point-in-time recovery (PITR) enabled
- [ ] Backup testing scheduled (weekly)
- [ ] Restore procedure documented
- [ ] RTO < 4 hours target set
- [ ] RPO < 24 hours target set

**Reference:** [INFRASTRUCTURE.md - Database Backups & Disaster Recovery](./INFRASTRUCTURE.md#database-backups--disaster-recovery)

---

## Phase 7: Security Headers Verification

### HTTP Security Headers
- [ ] `X-Content-Type-Options: nosniff` ✓ (configured in `next.config.ts`)
- [ ] `X-Frame-Options: SAMEORIGIN` ✓ (configured in `next.config.ts`)
- [ ] `X-XSS-Protection: 1; mode=block` ✓ (configured in `next.config.ts`)
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` ✓ (configured in `next.config.ts`)
- [ ] `Permissions-Policy` ✓ (camera, microphone, geolocation disabled)
- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` ✓ (configured)

### Verification
- [ ] Test headers with curl: `curl -I https://diybrand.app`
- [ ] All required headers present
- [ ] No sensitive headers exposed

**Reference:** [INFRASTRUCTURE.md - Security Headers](./INFRASTRUCTURE.md#security-headers)

---

## Phase 8: First Production Deployment

### Pre-Deployment
- [ ] All phases 1-7 complete and verified
- [ ] Database migrations tested in staging
- [ ] Test users created for functionality verification
- [ ] All GitHub secrets configured

### Deployment Execution
- [ ] Create a test commit to `main` branch
- [ ] Verify GitHub Actions CI/CD pipeline starts
- [ ] Verify lint stage passes
- [ ] Verify build stage passes
- [ ] Verify staging deployment succeeds
- [ ] Test staging environment: `/api/test-error`, FAQ page, product flow
- [ ] Approve production deployment in GitHub (manual approval gate)
- [ ] Verify production deployment succeeds
- [ ] Verify uptime check passes for production
- [ ] Verify Sentry receives test error from production

### Post-Deployment Validation
- [ ] Production site loads: `https://diybrand.app`
- [ ] All pages accessible (home, FAQ, guides, products, checkout)
- [ ] Stripe payment flow works (test transaction)
- [ ] Feedback widget appears on success page
- [ ] Support email configured and receiving
- [ ] Analytics events tracking (if configured)
- [ ] No error rate spikes in Sentry
- [ ] Performance metrics within targets (LCP, FID, CLS)

**Related Issue:** [DIY-54](/DIY/issues/DIY-54)

---

## Phase 9: Post-Launch Monitoring (First 24 Hours)

### Real-Time Monitoring
- [ ] Uptime check: all green (no gaps)
- [ ] Error rate: < 1% (baseline)
- [ ] Sentry alerts: no critical errors
- [ ] Slack notifications: operational and clear
- [ ] Response times: p95 < 2s, p99 < 5s

### Team Coordination
- [ ] Support team monitoring incoming emails
- [ ] On-call engineer standing by for critical issues
- [ ] Escalation procedure tested
- [ ] Team Slack channel monitored

### Documentation
- [ ] Production deployment time logged
- [ ] Any issues encountered documented
- [ ] Lessons learned captured

---

## Critical Path Items

**Must Complete Before Production Launch:**
1. [ ] Domain registered and DNS configured
2. [ ] Vercel project created and linked to GitHub
3. [ ] GitHub secrets configured (all 8 required)
4. [ ] CI/CD pipeline verified (lint, build, deploy stages working)
5. [ ] Sentry error tracking operational
6. [ ] Uptime monitoring configured
7. [ ] Database backups verified
8. [ ] Security headers in place
9. [ ] First production deployment executed successfully

**Nice to Have Before Launch:**
1. [ ] Staging environment tested with real data
2. [ ] Performance monitoring dashboards created
3. [ ] Support team trained on runbooks
4. [ ] Analytics fully configured
5. [ ] Cost tracking dashboard set up

---

## Sign-Off

**DevOps Engineer (Atlas):** ________________ Date: ________

**Lead Engineer (Viktor):** ________________ Date: ________

**CEO:** ________________ Date: ________

---

## Reference Materials

- **[INFRASTRUCTURE.md](./INFRASTRUCTURE.md)** — Complete infrastructure and deployment guide
- **[VERCEL-SETUP.md](./VERCEL-SETUP.md)** — Domain, SSL, and Vercel configuration guide
- **[.github/workflows/ci-cd.yml](./.github/workflows/ci-cd.yml)** — GitHub Actions CI/CD pipeline definition
- **[.env.staging](./.env.staging)** — Staging environment template
- **[.env.production](./.env.production)** — Production environment template
- **[.github/dependabot.yml](./.github/dependabot.yml)** — Automated dependency updates

---

**Last Updated:** 2026-03-20
**Next Review:** Post-launch (24 hours after deployment)
