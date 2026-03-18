# Vercel Deployment & Domain Configuration Guide

This guide covers the complete setup of DIYBrand on Vercel, including domain configuration, SSL/TLS, environment variables, and production deployment.

## Prerequisites

- Vercel account (free or pro)
- Domain registered (GoDaddy, Namecheap, Route 53, etc.)
- Admin access to domain registrar DNS
- GitHub repository connected to Vercel
- GitHub secrets configured (see INFRASTRUCTURE.md)

## Step 1: Create Vercel Project

### 1a. Import from GitHub

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New..." → "Project"**
3. Select the DIYBrand GitHub repository
4. Click **"Import"**
5. Vercel will auto-detect Next.js configuration

### 1b. Project Settings

**Build & Development:**
- **Framework**: Next.js
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm ci` (auto-detected)

**Environment Variables:**
```
NODE_ENV=production
VERCEL_GIT_COMMIT_SHA=[auto-populated]
DATABASE_URL=[your-postgres-url]
STRIPE_SECRET_KEY=[from-stripe-dashboard]
STRIPE_PUBLISHABLE_KEY=[from-stripe-dashboard]
SENTRY_DSN=[from-sentry.io]
NEXT_PUBLIC_SENTRY_DSN=[same-as-above]
NEXT_PUBLIC_API_URL=https://diybrand.app
```

## Step 2: Configure Custom Domain

### 2a. Add Domain in Vercel

1. Go to **Project Settings → Domains**
2. Click **"Add Domain"**
3. Enter `diybrand.app`
4. Select **"Add"**

Vercel will show you the DNS records to configure.

### 2b. Update Domain Registrar DNS

**Example for GoDaddy / Namecheap:**

Create these DNS records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 76.76.19.165 | 3600 |
| CNAME | www | cname.vercel-dns.com | 3600 |
| MX | @ | aspmx.l.google.com (priority 10) | 3600 |
| TXT | @ | v=spf1 include:_spf.google.com ~all | 3600 |

**For Route 53 (AWS):**

Create hosted zone for `diybrand.app` with:
- A record: Alias to Vercel (provided by Vercel)
- CNAME record: www → cname.vercel-dns.com

**Propagation Time:** DNS changes take 10 minutes to 24 hours to propagate globally.

### 2c. Verify Domain in Vercel

1. Once DNS records are added, go back to Vercel dashboard
2. Click **"Verify"** next to the domain
3. Vercel will check DNS records
4. Status should change to ✅ **Valid Configuration**

## Step 3: SSL/TLS Certificate

### 3a. Automatic SSL (Recommended)

Vercel **automatically** provisions and renews SSL certificates via Let's Encrypt:

- **Provisioning Time**: Typically 2-10 minutes after DNS verification
- **Auto-Renewal**: Handled automatically before expiration
- **Certificate Type**: Wildcard (covers diybrand.app and *.diybrand.app)

**Check Certificate Status:**
1. Go to **Project Settings → Domains**
2. Look for the lock icon 🔒 next to domain name
3. 🔒 = Certificate active and valid

### 3b. Verify SSL

```bash
# Check certificate details
openssl s_client -connect diybrand.app:443 -servername diybrand.app < /dev/null

# Check SSL grade
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=diybrand.app
# Target score: A or A+
```

## Step 4: Configure Staging Environment

### 4a. Create Preview/Staging Deployment

Vercel automatically creates preview deployments for pull requests. Configure a manual staging environment:

1. **Option A**: Automatic preview for each PR (default)
   - Every PR gets a preview URL: `pr-[number].diybrand.vercel.app`
   - Configure in GitHub Actions to post preview URL in PR comments

2. **Option B**: Manual staging domain (alternative)
   - Add domain: `staging.diybrand.app`
   - Point to same Vercel project with different environment variables
   - Use `VERCEL_ENV=staging` to differentiate

### 4b. Environment Variable Overrides by Deployment

Vercel supports environment variables per deployment:

```
Settings → Environment Variables

Production Deployments:
- NODE_ENV: production
- DATABASE_URL: [prod-database]
- STRIPE_SECRET_KEY: [prod-key]
- NEXT_PUBLIC_API_URL: https://diybrand.app

Preview Deployments:
- NODE_ENV: production
- DATABASE_URL: [staging-database]
- STRIPE_SECRET_KEY: [test-key]
- NEXT_PUBLIC_API_URL: https://staging.diybrand.app
```

## Step 5: Git & Deployment Settings

### 5a. Deployment from Git

**Production Branch:** `main`
- Merges to `main` trigger production deployments
- Requires manual approval in GitHub Actions

**Preview Branch:** `*` (all branches)
- Every branch/PR gets a preview deployment
- Auto-generated URL: `branch-name.diybrand.vercel.app`

### 5b. Automatic Deployments

1. Go to **Project Settings → Git**
2. **Production Branch**: `main`
3. **Framework Preset**: Next.js (auto-detected)
4. **Deploy on push**: ✅ Enabled

### 5c. Ignored Builds

Configure which changes don't trigger rebuilds:

```
Project Settings → Git → Ignored Build Step

Add this script:
#!/bin/bash
git diff --quiet HEAD^ HEAD -- . ':!docs/**' ':!*.md'
```

This prevents rebuilds for documentation-only changes.

## Step 6: Environment Configuration

### 6a. Production Environment Variables

Set in **Project Settings → Environment Variables:**

```env
# Database
DATABASE_URL=postgres://user:pass@host:5432/diybrand_prod

# Stripe (Live/Production Keys)
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# Sentry (Production DSN)
SENTRY_DSN=https://key@domain.ingest.sentry.io/project-id
NEXT_PUBLIC_SENTRY_DSN=https://key@domain.ingest.sentry.io/project-id

# Application
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://diybrand.app
VERCEL_ANALYTICS_ID=[from-vercel-analytics]
```

**Security Rules:**
- ✅ Use "Production" checkbox for sensitive vars (hidden in logs)
- ✅ Rotate Stripe keys quarterly
- ✅ Never commit `.env.production.local`
- ✅ Audit access logs weekly

### 6b. Preview/Staging Variables

Set different values for preview deployments:

```
Settings → Environment Variables → Preview

DATABASE_URL=postgres://user:pass@host:5432/diybrand_staging
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=https://preview.diybrand.vercel.app
```

## Step 7: Analytics & Monitoring

### 7a. Enable Vercel Analytics

1. Go to **Project Settings → Analytics**
2. Click **"Enable Web Analytics"**
3. Automatically tracks:
   - Page load times (Core Web Vitals)
   - Response times
   - Cache hit rates
   - Deployment frequency

**Dashboard**: `vercel.com/dashboard/project/analytics`

### 7b. Edge Config (Optional)

For feature flags, A/B tests, or rate limiting:

1. Go to **Project Settings → Edge Config**
2. Create new config: `diybrand-prod`
3. Use in API routes:

```typescript
// app/api/feature/route.ts
import { get } from '@vercel/edge-config';

export async function GET(request: Request) {
  const enabled = await get('feature-flag-name');
  return Response.json({ enabled });
}
```

## Step 8: Redirects & Rewrites

Configure in `next.config.ts`:

```typescript
async redirects() {
  return [
    {
      source: '/old-page',
      destination: '/new-page',
      permanent: true, // 301 redirect
    },
  ];
},

async rewrites() {
  return {
    beforeFiles: [
      {
        source: '/api/:path*',
        destination: 'https://api.diybrand.app/:path*',
      },
    ],
  };
}
```

## Step 9: Security Headers (Verify)

Verify security headers are being sent:

```bash
# Check headers
curl -I https://diybrand.app

# Should see:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Content-Type-Options: nosniff
# X-Frame-Options: SAMEORIGIN
# Content-Security-Policy: ...
```

### HSTS Preload

To add `diybrand.app` to the HSTS preload list:

1. Ensure header includes `preload`:
   ```
   Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
   ```
   (Already configured in next.config.ts)

2. Submit to HSTS preload list:
   - Visit: https://hstspreload.org/
   - Enter `diybrand.app`
   - Click **"Submit"**
   - Propagates to all browsers within 6 weeks

## Step 10: Database Connection

### 10a. Connection String Format

PostgreSQL Vercel Postgres / external database:

```
DATABASE_URL=postgres://username:password@hostname:5432/database_name?sslmode=require
```

Verify connection:

```bash
# Test from local machine
psql "postgres://username:password@hostname:5432/database_name?sslmode=require" -c "SELECT version();"

# Test from Vercel (via CLI)
vercel env pull .env.production.local
npm run db:push
```

### 10b. Database Backups

For Vercel Postgres (managed):
- ✅ Automatic daily backups (30-day retention)
- ✅ Point-in-time recovery available
- ✅ No additional configuration needed

For external database:
- Set up external backup service (AWS RDS automated backups, etc.)
- See INFRASTRUCTURE.md → Database Backups section

## Deployment Checklist

Before first production deployment:

- [ ] Domain registered and pointing to Vercel DNS
- [ ] SSL certificate active (🔒 showing in Vercel)
- [ ] All environment variables configured
- [ ] Database migrations applied to production
- [ ] Stripe webhooks configured for production keys
- [ ] Sentry project created and DSN configured
- [ ] GitHub secrets configured (VERCEL_TOKEN, STRIPE_SECRET_KEY, etc.)
- [ ] CI/CD pipeline tested with staging
- [ ] Uptime monitoring configured
- [ ] Error tracking tested in staging
- [ ] Performance targets verified (Core Web Vitals)
- [ ] Security headers verified via curl
- [ ] Database backups configured and tested
- [ ] Team notified of deployment

## Troubleshooting

### Domain Not Resolving

```bash
# Check DNS propagation
nslookup diybrand.app
dig diybrand.app

# Check CNAME
nslookup www.diybrand.app

# If not resolved, wait and retry (can take 24 hours)
```

### SSL Certificate Not Issued

1. Verify DNS records are correct in registrar
2. Wait 10-15 minutes for DNS propagation
3. Check **Project Settings → Domains** for errors
4. If still failing, click **"Remove"** and re-add domain

### Build Failures

1. Check **Deployment Logs** in Vercel dashboard
2. Ensure all environment variables are set
3. Test build locally:
   ```bash
   npm run build
   npm start
   ```
4. Check GitHub Actions logs for lint/test failures

### Slow First Load

Common causes:
- Large bundle size (check lighthouse report)
- Unoptimized images (use Next.js `<Image>`)
- Database query on page load (use caching)

Solutions:
1. Enable Vercel Analytics to identify bottlenecks
2. Use `next/image` for all images
3. Implement ISR (incremental static regeneration) for slow pages
4. Use database query caching

## Useful Vercel Commands

```bash
# Deploy locally (requires `vercel` CLI)
vercel deploy --prod

# Pull environment variables
vercel env pull .env.local

# View logs
vercel logs [deployment-url]

# List deployments
vercel list

# Rollback to previous deployment
vercel rollback
```

## Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **SSL Labs Testing**: https://www.ssllabs.com/ssltest/
- **HSTS Preload**: https://hstspreload.org/
- **Core Web Vitals Guide**: https://web.dev/vitals/
- **Vercel Support**: https://vercel.com/support

---

**Last Updated**: 2026-03-18
**Status**: ✅ Configuration Guide Complete
**Ready for**: Domain registration and Vercel project setup
