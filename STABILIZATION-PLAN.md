# Paperclip — Complete Stabilization Plan

> **Version:** 1.0 — 2026-03-24  
> **Status:** 🟡 **Phase 3 Complete** — Ready for Wave 3 Completion + Mobile Access  
> **Goal:** Production-ready AI agent orchestration platform with web + iPhone access

---

## 📊 **Current Status Audit**

### **✅ Completed Phases**

| Phase | Status | Commit | Files |
|-------|--------|--------|-------|
| **Wave 2: Notification UX** | ✅ Complete | `29a45e6` | 15 files (notification adapters, mission UI) |
| **Wave 3: PWA Phase 1** | ✅ Complete | Pending | 7 files (vite-pwa config, service worker, install prompt) |
| **Wave 3: WebSocket Phase 2** | ✅ Complete | Pending | 7 files (realtime server, WebSocket client, dashboard integration) |
| **Wave 3: Telegram Phase 3** | ✅ Complete | Pending | 6 files (Telegram bot, webhook, multi-channel notifications) |

**Overall Progress:** 85% complete

---

### **⚠️ Remaining Work (Wave 3 Completion)**

| Feature | Status | Priority | ETA |
|---------|--------|----------|-----|
| **PWA Install Flow** | ⚠️ Partial (config done, UX needs polish) | P0 | 2 days |
| **iPhone Home Screen Optimization** | ❌ Not started | P0 | 3 days |
| **Offline Mode** | ❌ Not started | P1 | 5 days |
| **Push Notifications (Web + Mobile)** | ⚠️ Partial (Telegram done, web push needs work) | P0 | 3 days |
| **Auth Session Persistence** | ⚠️ Partial (JWT exists, needs refresh token) | P0 | 2 days |
| **Multi-Device Sync** | ❌ Not started | P1 | 5 days |

---

## 🎯 **Stabilization Goals (2 Weeks)**

### **Week 1: Core Stability**
- ✅ Fix all type errors
- ✅ Pass all tests (lint, typecheck, test, build)
- ✅ Complete PWA install flow
- ✅ Add refresh token for auth session persistence
- ✅ Optimize iPhone home screen experience

### **Week 2: Mobile + Polish**
- ✅ Offline mode (read-only dashboard)
- ✅ Push notifications (web + mobile)
- ✅ Multi-device sync (WebSocket reconnection)
- ✅ Performance optimization (<3s page load)
- ✅ Error handling + user-friendly messages

---

## 🔐 **Auth + Session Audit**

### **Current State:**

| Feature | Status | Location |
|---------|--------|----------|
| **JWT Authentication** | ✅ Implemented | `server/src/middleware/auth.ts` |
| **API Key Auth** | ✅ Implemented | `server/src/middleware/api-key-auth.ts` |
| **Session Storage** | ✅ In-memory (volatile) | `server/src/services/session-store.ts` |
| **Refresh Tokens** | ❌ Not implemented | — |
| **Persistent Sessions** | ⚠️ Partial (JWT expires, no refresh) | — |
| **Multi-Device Sessions** | ❌ Not implemented | — |

### **Issues:**

1. **JWT expires after 24h** — User must re-login
2. **No refresh token** — Session lost on expiry
3. **In-memory session store** — Lost on server restart
4. **No device tracking** — Can't see active sessions

---

### **Required Fixes (Week 1):**

#### **1. Add Refresh Token Flow**

**Files to Create:**
```typescript
// server/src/middleware/refresh-token.ts
- Generate refresh token on login (7-day expiry)
- Store in httpOnly cookie
- Endpoint: POST /api/auth/refresh
- Endpoint: POST /api/auth/logout
```

**Files to Modify:**
```typescript
// server/src/middleware/auth.ts
- Add refresh token validation
- Extend JWT expiry to 1 hour (use refresh for renewal)

// server/src/routes/auth.ts
- Add /refresh endpoint
- Add /logout endpoint
- Add /sessions endpoint (list active devices)
```

**Database Schema:**
```sql
-- packages/db/src/schema/sessions.ts
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  refresh_token TEXT NOT NULL,
  device_info JSONB,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP
);
```

---

#### **2. Persistent Session Storage**

**Current:** In-memory (lost on restart)  
**Target:** PostgreSQL (persistent across restarts)

**Files to Modify:**
```typescript
// server/src/services/session-store.ts
- Replace Map with database queries
- Read from `sessions` table
- Write to `sessions` table on login/logout
```

---

#### **3. Multi-Device Session Management**

**Feature:** User can see active sessions, revoke devices

**UI Components:**
```typescript
// ui/src/pages/Settings/Sessions.tsx
- List active sessions (device, location, last active)
- "Revoke" button per session
- "Revoke All Other Sessions" button
```

**API Endpoint:**
```typescript
// server/src/routes/sessions.ts
GET /api/sessions — List active sessions
DELETE /api/sessions/:id — Revoke specific session
DELETE /api/sessions/all — Revoke all other sessions
```

---

## 📱 **Mobile Accessibility (iPhone) Audit**

### **Current State:**

| Feature | Status | Location |
|---------|--------|----------|
| **PWA Manifest** | ✅ Generated | `ui/public/manifest.webmanifest` |
| **Service Worker** | ✅ Configured | `ui/vite-pwa.config.ts` |
| **Install Prompt** | ⚠️ Partial (component exists, UX needs work) | `ui/src/components/PWAInstallPrompt.tsx` |
| **Offline Mode** | ❌ Not implemented | — |
| **Push Notifications** | ⚠️ Partial (Telegram only) | `server/src/services/telegram-notifier.ts` |
| **iPhone-Specific Optimization** | ❌ Not started | — |

### **Required Fixes (Week 2):**

#### **1. PWA Install Flow (iPhone Optimized)**

**Problem:** iOS doesn't show native install prompt

**Solution:** Custom install instructions for iOS

**Files to Create:**
```typescript
// ui/src/components/PWAInstallGuide.tsx
- Detect iOS device
- Show step-by-step instructions:
  1. "Tap the Share button"
  2. "Scroll down and tap 'Add to Home Screen'"
  3. "Tap 'Add' in the top right corner"
- Include screenshots for each step
```

**Files to Modify:**
```typescript
// ui/src/components/PWAInstallPrompt.tsx
- Detect iOS vs Android vs Desktop
- Show appropriate install instructions
- Dismiss prompt after installation
```

---

#### **2. Offline Mode (Read-Only Dashboard)**

**Feature:** User can view dashboard offline (no edits)

**Files to Create:**
```typescript
// ui/src/hooks/useOfflineMode.ts
- Cache dashboard data in IndexedDB
- Detect online/offline status
- Show "Offline Mode" banner
- Queue actions for when online again
```

**Service Worker Updates:**
```typescript
// ui/vite-pwa.config.ts
- Cache API responses for dashboard
- Cache static assets (JS, CSS, images)
- Network-first for API calls, cache fallback
```

---

#### **3. Push Notifications (Web + Mobile)**

**Current:** Telegram notifications only  
**Target:** Web Push + Telegram + Email

**Files to Create:**
```typescript
// server/src/services/webpush-service.ts
- VAPID keys generation
- Subscribe/unsubscribe endpoints
- Send push notification method
```

**UI Components:**
```typescript
// ui/src/components/NotificationSettings.tsx
- Toggle: Email notifications
- Toggle: Web push notifications
- Toggle: Telegram notifications
- Test notification button
```

---

## 🗄️ **Storage Audit**

### **Current State:**

| Storage | Status | Location |
|---------|--------|----------|
| **Database** | ✅ PGlite (embedded) | `~/.paperclip/data/` |
| **File Storage** | ✅ Local filesystem | `data/`, `skills/`, `docs/` |
| **Session Storage** | ⚠️ In-memory (volatile) | `server/src/services/session-store.ts` |
| **Cache** | ⚠️ Basic (needs optimization) | Service worker |
| **Backup** | ❌ Not automated | — |

### **Required Fixes:**

#### **1. Automated Database Backup**

**Files to Create:**
```bash
# scripts/backup-db.sh
- Dump PGlite database to SQL file
- Compress with gzip
- Store in `backups/` directory
- Keep last 7 backups (delete older)
- Run daily via cron/launchd
```

**Files to Modify:**
```bash
# .slim.yaml
- Add backup schedule (daily at 3 AM)
- Add backup retention (7 days)
```

---

#### **2. Storage Optimization**

**Issue:** Large files slow down sync

**Solution:** Compress old runs, archive completed phases

**Files to Create:**
```typescript
// scripts/archive-old-runs.sh
- Find runs > 30 days old
- Compress to `.tar.gz`
- Move to `archive/` directory
- Update database with archive location
```

---

## 🌐 **Web Accessibility Audit**

### **Current State:**

| Feature | Status | Location |
|---------|--------|----------|
| **Responsive Design** | ⚠️ Partial (works on desktop, tablet needs work) | `ui/src/pages/` |
| **Dark Mode** | ✅ Implemented | `ui/src/styles/` |
| **Accessibility (a11y)** | ⚠️ Partial (needs audit) | — |
| **Performance** | ⚠️ Partial (needs optimization) | — |
| **SEO** | ❌ Not needed (private app) | — |

### **Required Fixes:**

#### **1. Responsive Design (Tablet + Mobile)**

**Files to Modify:**
```css
/* ui/src/styles/responsive.css */
- Add media queries for tablet (768px)
- Add media queries for mobile (375px)
- Test Dashboard page on all screen sizes
- Test MissionWizard on mobile (touch-friendly)
```

**Components to Test:**
- Dashboard (charts, metrics)
- Missions list (scrollable on mobile)
- MissionWizard (step-by-step on small screen)
- Settings (form inputs on mobile)

---

#### **2. Performance Optimization**

**Target:** <3s page load, <100ms interactions

**Files to Modify:**
```typescript
// ui/src/pages/Dashboard.tsx
- Lazy load charts (React.lazy)
- Virtualize long lists (react-window)
- Memoize expensive calculations (useMemo)

// ui/src/lib/queryKeys.ts
- Add React Query caching
- Stale-while-revalidate strategy
- Prefetch on hover
```

---

## ✅ **Stabilization Checklist**

### **Week 1: Core Stability**

**Auth + Sessions:**
- [ ] Create refresh token middleware
- [ ] Add /refresh, /logout, /sessions endpoints
- [ ] Create sessions database table
- [ ] Migrate session storage to PostgreSQL
- [ ] Add session management UI (Settings → Sessions)

**PWA + Mobile:**
- [ ] Polish PWA install prompt (iOS + Android)
- [ ] Create iOS install guide component
- [ ] Test PWA installation on iPhone
- [ ] Test PWA installation on Android
- [ ] Add app icons for all sizes

**Testing:**
- [ ] Fix all type errors
- [ ] Pass lint (`pnpm lint`)
- [ ] Pass tests (`pnpm test`)
- [ ] Pass build (`pnpm build`)
- [ ] Run E2E test (login → dashboard → mission → logout)

---

### **Week 2: Mobile + Polish**

**Offline Mode:**
- [ ] Create useOfflineMode hook
- [ ] Cache dashboard data in IndexedDB
- [ ] Show "Offline Mode" banner
- [ ] Queue actions for retry
- [ ] Test offline mode (disable WiFi, verify cache)

**Push Notifications:**
- [ ] Create webpush-service.ts
- [ ] Generate VAPID keys
- [ ] Add subscribe/unsubscribe endpoints
- [ ] Create NotificationSettings UI component
- [ ] Test push notification (send → receive)

**Performance:**
- [ ] Lazy load dashboard charts
- [ ] Virtualize missions list
- [ ] Add React Query caching
- [ ] Measure page load time (<3s target)
- [ ] Measure interaction time (<100ms target)

**Responsive Design:**
- [ ] Test on iPhone (Safari)
- [ ] Test on Android (Chrome)
- [ ] Test on iPad (Safari)
- [ ] Fix mobile layout issues
- [ ] Add touch-friendly buttons (min 44px)

**Error Handling:**
- [ ] Add user-friendly error messages
- [ ] Add retry logic for failed API calls
- [ ] Add error boundary (React)
- [ ] Test error scenarios (network failure, server error)

---

## 📊 **Success Metrics**

### **Week 1 (Core Stability):**

| Metric | Target | Actual |
|--------|--------|--------|
| Type errors | 0 | — |
| Test pass rate | 100% | — |
| Build success | ✅ Yes | — |
| Refresh token flow | ✅ Working | — |
| Session persistence | ✅ Survives restart | — |

### **Week 2 (Mobile + Polish):**

| Metric | Target | Actual |
|--------|--------|--------|
| PWA install (iOS) | ✅ Works | — |
| PWA install (Android) | ✅ Works | — |
| Offline mode | ✅ Read-only dashboard | — |
| Push notifications | ✅ Web + Telegram | — |
| Page load time | <3s | — |
| Interaction time | <100ms | — |
| Mobile responsive | ✅ iPhone, iPad, Android | — |

---

## 🚀 **Post-Stabilization (Week 3+)**

### **Ready for Production:**
- ✅ All features complete
- ✅ All tests passing
- ✅ Mobile accessible (web + iPhone)
- ✅ Auth session persistent
- ✅ Offline mode working
- ✅ Push notifications working

### **Next Phase: AutomationHub Integration**
- Connect AutomationHub as Paperclip "product"
- CEO agent monitors AutomationHub metrics
- Daily brief includes AutomationHub status
- Paperclip manages AutomationHub development

---

## 📞 **Quick Reference**

### **Start Development:**
```bash
cd Paperclip
pnpm install
pnpm dev  # Starts server + UI
open http://localhost:3100
```

### **Run Quality Gates:**
```bash
pnpm lint        # Lint
pnpm typecheck   # TypeScript
pnpm test        # Tests
pnpm build       # Build
```

### **Test PWA:**
```bash
pnpm build
pnpm preview  # Preview production build
# Open http://localhost:4173 on iPhone/Android
```

### **Test Auth:**
```bash
# Login
curl -X POST http://localhost:3100/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Refresh token
curl -X POST http://localhost:3100/api/auth/refresh \
  -H "Cookie: refresh_token=..."

# List sessions
curl http://localhost:3100/api/sessions \
  -H "Authorization: Bearer ..."
```

---

**Last Updated:** 2026-03-24  
**Version:** 1.0  
**Next Review:** End of Week 1 (Mar 30, 2026)  
**Status:** 🟡 Ready to Start Stabilization
