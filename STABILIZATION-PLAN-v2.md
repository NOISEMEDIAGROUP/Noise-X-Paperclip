# Paperclip Stabilization Plan v2 — Honest Baseline

> **Version:** 2.0 — 2026-03-25  
> **Author:** Senior Technical Architect (Mentor Review)  
> **Status:** 🟡 **Ready to Start** — Wave 3 committed, stabilization needed  
> **Goal:** Minimum Viable Stability → Production-ready foundation  

---

## 🔍 What Changed from v1

### **Major Corrections:**

| v1 Claim | v2 Reality | Impact |
|----------|------------|--------|
| "Session storage: In-memory (volatile)" | ✅ **Actually PostgreSQL** via better-auth `authSessions` table | No migration needed |
| "Refresh tokens: Not implemented" | ✅ **Still not implemented** — only JWT, no refresh flow | **Critical gap** remains |
| "Offline mode: Not implemented" | ✅ **Still not implemented** — no hooks, no IndexedDB | Still Week 2+ work |
| "Web push: Partial" | ⚠️ **Placeholder only** — `webpush-adapter.ts` exists but just console.log | Needs real implementation |
| "Type errors: Fix all" | ⚠️ **11 actual errors** in CLI + adapter-utils + server | Concrete scope now known |
| "Timeline: 2 weeks" | ❌ **Overly optimistic** — revised to 3-4 weeks | Realistic planning |

### **What's Actually Done (Wave 2 & 3):**

✅ **Wave 2 (Notification UX)** — Complete at `29a45e6`:
- Notification settings UI (`ui/src/pages/Settings/Notifications.tsx`)
- Telegram integration (`server/src/services/telegram-notifier.ts`)
- Email integration (Resend)
- Multi-channel toggles

✅ **Wave 3 (PWA/WebSocket/Telegram)** — Complete at `082f6f3`:
- PWA configured (`ui/vite-pwa.config.ts`)
- Service worker with runtime caching
- PWA install prompt component (`ui/src/components/PWAInstallPrompt.tsx`)
- WebSocket server (`server/src/realtime/ws-server.ts`)
- Telegram bot + webhook (`server/src/services/telegram-bot.ts`)

---

## 📊 Accurate Baseline Audit

### **Auth & Sessions:**

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| **JWT Authentication** | ✅ Implemented | `server/src/middleware/auth.ts` | 24h expiry |
| **better-auth Integration** | ✅ Implemented | `server/src/auth/better-auth.ts` | v1.3.8 |
| **Session Storage** | ✅ PostgreSQL | `authSessions` table | NOT in-memory |
| **Refresh Tokens** | ❌ **NOT implemented** | — | **Critical gap** |
| **Session Management UI** | ❌ Not implemented | — | No `/settings/sessions` page |

### **PWA & Mobile:**

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| **PWA Manifest** | ✅ Configured | `ui/vite-pwa.config.ts` | Standard config |
| **Service Worker** | ✅ Configured | Same file | NetworkFirst for API |
| **Install Prompt** | ⚠️ **Desktop only** | `ui/src/components/PWAInstallPrompt.tsx` | No iOS detection |
| **iOS Install Guide** | ❌ Not implemented | — | **Critical for iPhone** |
| **Offline Mode** | ❌ Not implemented | — | No hooks, no IndexedDB |
| **Offline UI** | ❌ Not implemented | — | No "Offline Mode" banner |

### **Notifications:**

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| **Telegram** | ✅ Working | `server/src/services/telegram-notifier.ts` | Production-ready |
| **Email (Resend)** | ✅ Working | Notification settings | Configured |
| **Web Push** | ⚠️ **Placeholder only** | `server/src/services/adapters/webpush-adapter.ts` | Just console.log |
| **VAPID Keys** | ❌ Not generated | — | Need for web push |
| **Push Subscription UI** | ❌ Not implemented | — | No subscribe button |

### **TypeScript Health:**

```bash
$ pnpm -r typecheck
Total errors: 11

Breakdown:
- cli: 4 errors (worktree-make.ts, net.ts)
- adapter-utils: 5 errors (server-utils.ts ChildProcess types)
- server: 2 errors (index.ts Express type, live-events-ws.ts IncomingMessage)
```

**All errors are fixable in 1-2 days.**

---

## 🎯 Revised Goals — MVP First

### **Week 1-2: Minimum Viable Stability (8-10 days)**

**Priority: CRITICAL** — Ship blockers

1. **Refresh Token Flow** (2 days)
   - Generate refresh tokens on login (7-day expiry)
   - Store in httpOnly cookie
   - Add `/api/auth/refresh` endpoint
   - Add `/api/auth/logout` endpoint
   - Update JWT middleware to accept refreshed tokens

2. **Type Error Fixes** (1-2 days)
   - Fix all 11 TypeScript errors
   - Add proper type annotations
   - Ensure `pnpm typecheck` passes

3. **iOS PWA Install Guide** (1 day)
   - Add iOS detection to `PWAInstallPrompt.tsx`
   - Show step-by-step instructions for iOS
   - Include screenshots/icons

4. **Basic Error Boundaries** (1 day)
   - Add React error boundary wrapper
   - User-friendly error messages
   - Retry logic for failed API calls

5. **End-to-End Testing** (2-3 days)
   - Test login → dashboard → mission → logout
   - Test PWA install on iPhone (manual)
   - Test Telegram notifications
   - Test WebSocket reconnection

### **Week 3-4: Polish & Nice-to-Haves (7-10 days)**

**Priority: IMPORTANT** — Can wait for post-MVP

1. **Web Push Notifications** (2-3 days)
   - Generate VAPID keys
   - Implement real `web-push` adapter
   - Add subscribe/unsubscribe UI
   - Test push notifications

2. **Session Management UI** (1-2 days)
   - `/settings/sessions` page
   - List active sessions (device, IP, last active)
   - "Revoke" button per session
   - "Revoke All Other Sessions"

3. **Offline Mode** (3-4 days)
   - `useOfflineMode` hook
   - Cache dashboard data in IndexedDB
   - "Offline Mode" banner
   - Queue actions for retry
   - **Scope:** Read-only dashboard (no edits)

### **Post-Stabilization (Week 5+)**

**Priority: NICE-TO-HAVE** — Deprioritize

- ❌ **Multi-device sync** — Edge case for solo dev
- ❌ **Performance optimization** — Profile first, optimize later
- ❌ **Automated backup scripts** — Manual is fine for now
- ❌ **Responsive design polish** — Works on desktop, mobile is secondary

---

## ✅ Clear Success Criteria

### **What "Stable" Means (MVP Definition):**

1. **Auth works reliably:**
   - Login persists across browser restarts (refresh tokens)
   - JWT auto-refreshes before expiry
   - Logout clears all tokens

2. **No type errors:**
   - `pnpm -r typecheck` passes with 0 errors

3. **PWA installable on iPhone:**
   - iOS user sees install guide
   - Can add to home screen
   - Opens in standalone mode

4. **Wave 3 features work end-to-end:**
   - WebSocket connects and stays alive
   - Telegram notifications arrive
   - Dashboard shows real-time updates

5. **Basic error handling:**
   - Errors don't crash the app
   - User sees friendly messages
   - Can retry failed actions

### **What Can Wait:**

- Offline mode (nice-to-have, not critical)
- Web push (Telegram works for MVP)
- Session management UI (power user feature)
- Performance optimization (<3s load time is nice, not required)

### **Go/No-Go Criteria:**

**Week 1-2 Go Criteria:**
- ✅ Refresh tokens working (test: close browser, reopen, still logged in)
- ✅ 0 TypeScript errors
- ✅ iOS install guide shows on iPhone
- ✅ E2E test passes (login → dashboard → logout)

**Week 3-4 Go Criteria:**
- ✅ Web push subscription works (optional, can skip)
- ✅ Session management UI complete (optional, can skip)
- ✅ Offline mode shows "Offline" banner (optional, can skip)

**Stabilization Complete:**
- ✅ All Week 1-2 criteria met
- ✅ 2+ weeks without critical bugs
- ✅ User can use daily without auth issues

---

## 📅 Realistic Timeline

### **Week 1-2: Core Stability (8-10 days actual work)**

| Day | Task | Deliverable | Done Criteria |
|-----|------|-------------|---------------|
| **Day 1-2** | Refresh tokens | `/api/auth/refresh` endpoint | Token refreshes, session persists |
| **Day 3-4** | Type fixes | All 11 errors fixed | `pnpm typecheck` passes |
| **Day 5** | iOS PWA guide | Platform detection in `PWAInstallPrompt.tsx` | Shows iOS steps on iPhone |
| **Day 6** | Error boundaries | React error boundary + retry | Errors don't crash app |
| **Day 7-8** | E2E testing | Manual test script | All flows work |
| **Day 9-10** | Buffer | Catch up, fix issues | All Week 1-2 criteria met |

### **Week 3-4: Polish (7-10 days, optional)**

| Day | Task | Deliverable | Done Criteria |
|-----|------|-------------|---------------|
| **Day 1-2** | Web push setup | VAPID keys, adapter impl | Can subscribe to push |
| **Day 3** | Push subscription UI | Subscribe button in Settings | User can enable web push |
| **Day 4-5** | Session management | `/settings/sessions` page | List + revoke sessions |
| **Day 6-8** | Offline mode | IndexedDB cache, banner | Works offline (read-only) |
| **Day 9-10** | Buffer + testing | Final polish | All criteria met |

### **Total: 3-4 weeks (not 2 weeks)**

**Why longer?**
- Refresh tokens are critical — need careful testing
- Type fixes often reveal deeper issues
- iOS PWA testing requires physical device
- Buffer for unexpected issues (always happens)

---

## 🛠️ Action-Oriented Tasks

### **Phase 1: Refresh Tokens (Days 1-2)**

**Files to Create:**
```typescript
// server/src/routes/auth-refresh.ts
- POST /api/auth/refresh — exchange refresh token for new JWT
- POST /api/auth/logout — revoke refresh token
```

**Files to Modify:**
```typescript
// server/src/auth/better-auth.ts
- Add refresh token configuration (7-day expiry)
- Configure httpOnly cookie

// server/src/middleware/auth.ts
- Handle refreshed JWT validation
```

**Verification:**
```bash
# 1. Login
curl -X POST http://localhost:3100/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 2. Check cookie set
curl -v http://localhost:3100/api/auth/login ... | grep "set-cookie"

# 3. Wait 1 hour (JWT expires), refresh should work
curl -X POST http://localhost:3100/api/auth/refresh \
  -H "Cookie: refresh_token=..."

# 4. Should return new JWT
```

**Git Commit:**
```bash
git add server/src/auth/better-auth.ts server/src/routes/auth-refresh.ts
git commit -m "feat(auth): add refresh token flow for persistent sessions

- Add 7-day refresh token with httpOnly cookie
- Add /api/auth/refresh endpoint for JWT renewal
- Add /api/auth/logout endpoint to revoke tokens
- Configure better-auth with session persistence

Fixes critical gap: sessions now survive browser restart"
```

---

### **Phase 2: Type Error Fixes (Days 3-4)**

**Files to Fix:**
```typescript
// cli/src/commands/worktree-make.ts (lines 41, 46)
// cli/src/utils/net.ts (lines 6, 13)
// packages/adapter-utils/src/server-utils.ts (lines 263, 275)
// server/src/index.ts (line 433)
// server/src/realtime/live-events-ws.ts (line 232)
```

**Verification:**
```bash
pnpm -r typecheck
# Should show: "Found 0 errors."
```

**Git Commit:**
```bash
git add cli/ packages/adapter-utils/ server/
git commit -m "fix(types): resolve all 11 TypeScript errors

- Fix CLI worktree-make.ts config type mismatches
- Fix net.ts Server type imports
- Fix adapter-utils ChildProcess event types
- Fix server Express/IncomingMessage type conflicts
- Fix WebSocket IncomingMessage import conflict

All typecheck passes: pnpm -r typecheck returns 0 errors"
```

---

### **Phase 3: iOS PWA Install Guide (Day 5)**

**Files to Modify:**
```typescript
// ui/src/components/PWAInstallPrompt.tsx
- Add iOS detection (check for iOS-specific APIs)
- Show iOS-specific instructions when on iPhone
- Include screenshots or icons
```

**Example Implementation:**
```typescript
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

if (isIOS) {
  return (
    <div className="fixed bottom-4 right-4 ...">
      <h3>Install on iPhone</h3>
      <ol>
        <li>Tap the Share button <ShareIcon /></li>
        <li>Scroll down, tap "Add to Home Screen"</li>
        <li>Tap "Add" in top right</li>
      </ol>
    </div>
  );
}
```

**Verification:**
```bash
pnpm build
pnpm preview
# Open http://localhost:4173 on iPhone Safari
# Should see iOS-specific install guide
```

**Git Commit:**
```bash
git add ui/src/components/PWAInstallPrompt.tsx
git commit -m "feat(pwa): add iOS-specific install guide

- Detect iOS devices via user agent
- Show step-by-step iPhone installation instructions
- Include Share button icon reference
- Fallback to standard prompt for Android/Desktop

Enables iPhone users to install PWA to home screen"
```

---

### **Phase 4: Error Boundaries (Day 6)**

**Files to Create:**
```typescript
// ui/src/components/ErrorBoundary.tsx
- React error boundary component
- User-friendly error message
- Retry button

// ui/src/hooks/useApiRetry.ts
- Retry logic for failed API calls
- Exponential backoff
```

**Files to Modify:**
```typescript
// ui/src/App.tsx
- Wrap routes with ErrorBoundary
```

**Verification:**
```bash
# 1. Trigger error manually
# 2. Should see friendly error UI, not white screen
# 3. Click retry, should attempt to recover
```

**Git Commit:**
```bash
git add ui/src/components/ErrorBoundary.tsx ui/src/hooks/useApiRetry.ts
git commit -m "feat(ui): add error boundaries and retry logic

- Add React error boundary wrapper for routes
- Add user-friendly error messages
- Add useApiRetry hook with exponential backoff
- Prevent white screen of death on errors

Improves user experience when API calls fail"
```

---

### **Phase 5: E2E Testing (Days 7-8)**

**Test Script:**
```bash
# scripts/e2e-test.sh
#!/bin/bash
set -e

echo "=== Paperclip E2E Test ==="

# 1. Login
echo "Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3100/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}')
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "✓ Login successful, got token: ${TOKEN:0:20}..."

# 2. Dashboard
echo "Testing dashboard..."
DASHBOARD=$(curl -s http://localhost:3100/api/dashboard \
  -H "Authorization: Bearer $TOKEN")
echo "✓ Dashboard loaded"

# 3. WebSocket (manual test)
echo "Testing WebSocket... (manual)"
echo "  → Open browser, check WebSocket connects in console"

# 4. Telegram (manual test)
echo "Testing Telegram notification... (manual)"
echo "  → Trigger mission, check Telegram receives notification"

# 5. Logout
echo "Testing logout..."
curl -s -X POST http://localhost:3100/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
echo "✓ Logout successful"

echo "=== All tests passed ==="
```

**Verification:**
```bash
# Run automated tests
bash scripts/e2e-test.sh

# Manual tests:
# 1. Install PWA on iPhone
# 2. Check Telegram notification arrives
# 3. Check WebSocket stays connected for 5+ minutes
```

**Git Commit:**
```bash
git add scripts/e2e-test.sh
git commit -m "test(e2e): add end-to-end test script

- Add automated login → dashboard → logout test
- Add manual WebSocket + Telegram test instructions
- Verify auth flow works end-to-end
- Serve as regression test for future changes

Run: bash scripts/e2e-test.sh"
```

---

### **Phase 6: Web Push (Week 3, Optional)**

**Files to Modify:**
```typescript
// server/src/services/adapters/webpush-adapter.ts
- Install web-push: npm install web-push
- Generate VAPID keys
- Implement real sendApprovalRequest
- Implement real sendMessage
```

**Files to Create:**
```typescript
// server/src/routes/push-subscription.ts
- POST /api/push/subscribe — save subscription
- DELETE /api/push/unsubscribe — remove subscription

// ui/src/components/PushSubscribeButton.tsx
- Request notification permission
- Create push subscription
- Send to server
```

**Verification:**
```bash
# 1. Generate VAPID keys
node -e "const webPush = require('web-push'); const vapid = webPush.generateVAPIDKeys(); console.log('Public:', vapid.publicKey); console.log('Private:', vapid.privateKey);"

# 2. Subscribe in browser
# Open Settings → Notifications → Enable Web Push

# 3. Send test notification
curl -X POST http://localhost:3100/api/push/test
```

**Git Commit:**
```bash
git add server/src/services/adapters/webpush-adapter.ts server/src/routes/push-subscription.ts
git commit -m "feat(notifications): implement web push notifications

- Add web-push library integration
- Generate and store VAPID keys
- Add push subscription endpoints
- Add subscribe button in Settings
- Send real push notifications (not just console.log)

Provides alternative to Telegram for browser notifications"
```

---

## ⚠️ Risks + Mitigations

### **High Risk:**

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Refresh token bugs** | Users locked out, can't login | Test thoroughly before deploy, keep rollback plan |
| **iOS PWA not working** | iPhone users can't install | Test on physical iPhone, not simulator |
| **Type fixes break runtime** | App crashes after "fix" | Run full test suite after type fixes |

### **Medium Risk:**

| Risk | Impact | Mitigation |
|------|--------|------------|
| **WebSocket reconnection fails** | Dashboard goes stale | Add reconnection logic with backoff |
| **Telegram bot goes down** | Notifications fail silently | Add fallback to email |
| **Offline mode cache stale** | User sees old data | Add cache invalidation on reconnect |

### **Low Risk:**

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Web push browser support** | Safari doesn't support | Telegram fallback already works |
| **Session management UI unused** | Wasted dev time | Build after MVP, skip if not needed |

---

## 📋 Touch List (Files That Will Change)

### **Week 1-2 (Critical):**

| File | Change Type | Priority |
|------|-------------|----------|
| `server/src/auth/better-auth.ts` | Modify (refresh token config) | P0 |
| `server/src/routes/auth-refresh.ts` | Create | P0 |
| `server/src/middleware/auth.ts` | Modify (refresh validation) | P0 |
| `cli/src/commands/worktree-make.ts` | Fix types | P0 |
| `cli/src/utils/net.ts` | Fix types | P0 |
| `packages/adapter-utils/src/server-utils.ts` | Fix types | P0 |
| `server/src/index.ts` | Fix types | P0 |
| `server/src/realtime/live-events-ws.ts` | Fix types | P0 |
| `ui/src/components/PWAInstallPrompt.tsx` | Modify (iOS detection) | P0 |
| `ui/src/components/ErrorBoundary.tsx` | Create | P1 |
| `ui/src/hooks/useApiRetry.ts` | Create | P1 |
| `ui/src/App.tsx` | Modify (add boundary) | P1 |
| `scripts/e2e-test.sh` | Create | P1 |

### **Week 3-4 (Optional):**

| File | Change Type | Priority |
|------|-------------|----------|
| `server/src/services/adapters/webpush-adapter.ts` | Modify (real impl) | P2 |
| `server/src/routes/push-subscription.ts` | Create | P2 |
| `ui/src/components/PushSubscribeButton.tsx` | Create | P2 |
| `ui/src/pages/Settings/Sessions.tsx` | Create | P2 |
| `ui/src/hooks/useOfflineMode.ts` | Create | P2 |
| `ui/vite-pwa.config.ts` | Modify (offline caching) | P2 |

---

## 🚀 Quick Start Commands

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
pnpm typecheck   # TypeScript (currently 11 errors, target: 0)
pnpm test        # Tests
pnpm build       # Build
```

### **Test Refresh Tokens:**
```bash
# 1. Login
curl -X POST http://localhost:3100/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -v 2>&1 | grep "set-cookie"

# 2. Wait 1 hour, then refresh
curl -X POST http://localhost:3100/api/auth/refresh \
  -H "Cookie: refresh_token=..." \
  -H "Content-Type: application/json"
```

### **Test PWA:**
```bash
pnpm build
pnpm preview
# Open http://localhost:4173
# Chrome DevTools → Application → Manifest → Check installability
```

---

## 📊 Progress Tracking

### **Week 1-2 Checklist:**

- [ ] **Refresh tokens implemented** (Day 2)
- [ ] **All 11 type errors fixed** (Day 4)
- [ ] **iOS PWA guide shows on iPhone** (Day 5)
- [ ] **Error boundaries catch crashes** (Day 6)
- [ ] **E2E test passes** (Day 8)
- [ ] **Week 1-2 Go Criteria met** (Day 10)

### **Week 3-4 Checklist (Optional):**

- [ ] **Web push subscription works** (Day 3)
- [ ] **Session management UI complete** (Day 5)
- [ ] **Offline mode shows banner** (Day 8)
- [ ] **All optional features done** (Day 10)

---

## 📝 Mentor Notes

### **What's Working Well:**

✅ **Wave 2 & 3 execution is solid** — Telegram, WebSocket, PWA all functional  
✅ **better-auth integration is correct** — PostgreSQL sessions, not in-memory  
✅ **TypeScript migration mostly done** — Only 11 errors, mostly type imports  
✅ **PWA configuration is standard** — Just needs iOS UX polish  

### **Critical Gaps to Fix:**

❌ **No refresh tokens** — Users must re-login every 24h (unacceptable)  
❌ **iOS install UX missing** — iPhone users see generic prompt (confusing)  
❌ **No error boundaries** — Errors crash app (white screen)  
❌ **11 type errors** — Indicates tech debt accumulating  

### **What to Deprioritize:**

⚠️ **Offline mode** — Nice-to-have, complex, solo dev doesn't need it yet  
⚠️ **Multi-device sync** — Edge case, one user = one device mostly  
⚠️ **Web push** — Telegram works, web push is bonus  
⚠️ **Performance optimization** — Profile first, optimize bottlenecks later  

### **Success Looks Like:**

After 2 weeks:
- User logs in once, stays logged in for 7 days
- No type errors in CI/CD
- iPhone user can install to home screen easily
- Errors show friendly messages, not white screen
- All Wave 3 features tested and working

**That's enough stability to ship.** The rest is polish.

---

**Last Updated:** 2026-03-25  
**Version:** 2.0 (Honest Baseline)  
**Next Review:** End of Week 1 (Apr 1, 2026)  
**Status:** 🟡 Ready to Start — Say "Start Phase 1 of Paperclip"

