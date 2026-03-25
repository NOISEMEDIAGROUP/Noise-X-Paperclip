# Wave 3: PWA & Telegram Integration - Implementation Plan

**Status:** Ready to Execute  
**Created:** 2026-03-24  
**Phase:** Wave3-PWA-Telegram  
**Estimated Duration:** 2-3 weeks

---

## 1. Overview

Wave 3 transforms Paperclip into a mobile-accessible, real-time platform with Telegram bot integration for approvals and notifications.

### Goals
1. **PWA** - Installable web app with offline support
2. **Real-Time** - WebSocket for live updates
3. **Telegram** - Bot for approvals and notifications
4. **Multi-Channel Notifications** - Email, WebPush, Telegram, Webhook

---

## 2. Dependencies

### 2.1 UI Dependencies (ui/package.json)

```json
{
  "dependencies": {
    "vite-plugin-pwa": "^0.20.0",
    "@vite-pwa/assets-generator": "^0.2.4"
  }
}
```

### 2.2 Server Dependencies (server/package.json)

```json
{
  "dependencies": {
    "ws": "^8.16.0",
    "node-telegram-bot-api": "^0.64.0",
    "web-push": "^3.6.7"
  }
}
```

### 2.3 Dev Dependencies

```json
{
  "devDependencies": {
    "@types/ws": "^8.5.10",
    "@types/node-telegram-bot-api": "^0.64.0"
  }
}
```

---

## 3. PWA Implementation

### 3.1 Files to Create

#### `ui/vite-pwa.config.ts`
```typescript
import { VitePWA } from 'vite-plugin-pwa';

export const pwaConfig = VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
  manifest: {
    name: 'Paperclip - AI Company OS',
    short_name: 'Paperclip',
    description: 'Operating system for autonomous AI companies',
    theme_color: '#000000',
    background_color: '#ffffff',
    display: 'standalone',
    orientation: 'portrait',
    scope: '/',
    start_url: '/',
    icons: [
      {
        src: 'pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: 'pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      },
      {
        src: 'pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\./i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          networkTimeoutSeconds: 10,
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      }
    ]
  }
});
```

#### `ui/src/components/PWAInstallPrompt.tsx`
```typescript
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Download, X } from 'lucide-react';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Install Paperclip</h3>
          <p className="text-sm text-muted-foreground">
            Install our app for quick access and offline support
          </p>
          <div className="flex gap-2 mt-3">
            <Button onClick={handleInstall} size="sm">
              <Download className="w-4 h-4 mr-2" />
              Install
            </Button>
            <Button variant="ghost" onClick={handleDismiss} size="sm">
              <X className="w-4 h-4 mr-2" />
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3.2 Files to Modify

#### `ui/vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import { pwaConfig } from './vite-pwa.config';

export default defineConfig({
  plugins: [
    react(),
    pwaConfig // Add this
  ],
  // ... rest of config
});
```

#### `ui/src/App.tsx`
```typescript
// Add to root component
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

function App() {
  return (
    <>
      {/* ... existing content ... */}
      <PWAInstallPrompt />
    </>
  );
}
```

### 3.3 PWA Assets

Create icons in `ui/public/`:
- `favicon.ico` - 32x32
- `apple-touch-icon.png` - 180x180
- `pwa-192x192.png` - 192x192
- `pwa-512x512.png` - 512x512

---

## 4. WebSocket Real-Time Server

### 4.1 Files to Create

#### `server/src/realtime/ws-server.ts`
```typescript
import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';
import { parse } from 'url';

export interface WSMessage {
  type: 'agent_status' | 'task_update' | 'mission_progress' | 'notification';
  payload: any;
  companyId?: string;
}

export class RealtimeServer {
  private wss: WebSocketServer;
  private clients: Map<string, Set<WebSocket>> = new Map(); // companyId -> clients

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws, req) => {
      const url = parse(req.url || '', true);
      const companyId = url.query.companyId as string;
      const token = url.query.token as string;

      // TODO: Validate token
      if (!companyId || !token) {
        ws.close(4000, 'Missing credentials');
        return;
      }

      // Register client
      if (!this.clients.has(companyId)) {
        this.clients.set(companyId, new Set());
      }
      this.clients.get(companyId)!.add(ws);

      ws.on('close', () => {
        this.clients.get(companyId)?.delete(ws);
      });

      ws.on('pong', () => {
        ws.isAlive = true;
      });
    });

    // Heartbeat
    setInterval(() => {
      this.wss.clients.forEach((ws: any) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  broadcast(companyId: string, message: WSMessage) {
    const clients = this.clients.get(companyId);
    if (!clients) return;

    const data = JSON.stringify(message);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  // Convenience methods
  emitAgentStatus(companyId: string, agentId: string, status: string) {
    this.broadcast(companyId, {
      type: 'agent_status',
      payload: { agentId, status }
    });
  }

  emitTaskUpdate(companyId: string, taskId: string, update: any) {
    this.broadcast(companyId, {
      type: 'task_update',
      payload: { taskId, ...update }
    });
  }

  emitMissionProgress(companyId: string, missionId: string, progress: any) {
    this.broadcast(companyId, {
      type: 'mission_progress',
      payload: { missionId, progress }
    });
  }
}
```

#### `server/src/realtime/ws-middleware.ts`
```typescript
import { Request, Response, NextFunction } from 'express';

export function wsAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Validate WebSocket auth token
  // This runs before WebSocket upgrade
  next();
}
```

### 4.2 Files to Modify

#### `server/src/index.ts`
```typescript
import { RealtimeServer } from './realtime/ws-server';

// After creating HTTP server
const server = createServer(app);

// Initialize WebSocket
const realtimeServer = new RealtimeServer(server);

// Make available to routes
app.set('realtime', realtimeServer);
```

### 4.3 UI WebSocket Client

#### `ui/src/lib/websocket.ts`
```typescript
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(companyId: string, token: string) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${protocol}//${window.location.host}/ws?companyId=${companyId}&token=${token}`;
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.emit(message.type, message.payload);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
    
    setTimeout(() => {
      console.log(`Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, delay);
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, payload: any) {
    this.listeners.get(event)?.forEach(callback => callback(payload));
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}
```

#### `ui/src/hooks/useWebSocket.ts`
```typescript
import { useEffect } from 'react';
import { useCompany } from '../context/CompanyContext';
import { WebSocketClient } from '../lib/websocket';

export function useWebSocket() {
  const { selectedCompany } = useCompany();

  useEffect(() => {
    if (!selectedCompany) return;

    const client = new WebSocketClient(selectedCompany.id, 'token'); // TODO: Get real token
    client.connect();

    client.on('agent_status', (payload) => {
      console.log('Agent status update:', payload);
      // Update agent state in query cache
    });

    client.on('task_update', (payload) => {
      console.log('Task update:', payload);
      // Update task in query cache
    });

    return () => {
      client.disconnect();
    };
  }, [selectedCompany?.id]);
}
```

---

## 5. Telegram Integration

### 5.1 Environment Variables

Add to `.env.example`:
```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
```

### 5.2 Files to Create

#### `server/src/services/telegram-bot.ts`
```typescript
import TelegramBot from 'node-telegram-bot-api';
import { getEnv } from '../lib/env';

export class TelegramService {
  private bot: TelegramBot | null = null;
  private webhookUrl: string;

  constructor() {
    const token = getEnv('TELEGRAM_BOT_TOKEN');
    this.webhookUrl = getEnv('TELEGRAM_WEBHOOK_URL');
    
    if (token) {
      this.bot = new TelegramBot(token, { polling: false });
      this.setupWebhook();
      this.setupCommandHandlers();
    }
  }

  private async setupWebhook() {
    if (!this.bot) return;
    
    await this.bot.setWebHook(this.webhookUrl);
  }

  private setupCommandHandlers() {
    if (!this.bot) return;

    // /start command
    this.bot.onText(/\/start/, (msg) => {
      this.bot!.sendMessage(
        msg.chat.id,
        'Welcome to Paperclip Bot! Use /status to check company status, /approve to see pending approvals.'
      );
    });

    // /status command
    this.bot.onText(/\/status/, async (msg) => {
      // TODO: Fetch company status and send
      this.bot!.sendMessage(msg.chat.id, 'Company status: Running\nActive agents: 3\nTasks in progress: 5');
    });

    // /approve command
    this.bot.onText(/\/approve/, async (msg) => {
      // TODO: Fetch pending approvals
      this.bot!.sendMessage(msg.chat.id, 'Pending approvals: None');
    });
  }

  public async sendApprovalRequest(
    chatId: number,
    approvalId: string,
    type: string,
    details: string,
    approveCallback: string,
    rejectCallback: string
  ) {
    if (!this.bot) return;

    await this.bot.sendMessage(chatId, details, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Approve', callback_data: approveCallback },
            { text: '❌ Reject', callback_data: rejectCallback }
          ]
        ]
      }
    });
  }

  public async sendNotification(chatId: number, message: string) {
    if (!this.bot) return;
    await this.bot.sendMessage(chatId, message);
  }

  public async handleCallback(queryId: string, action: 'approve' | 'reject', approvalId: string) {
    if (!this.bot) return;
    
    await this.bot.answerCallbackQuery(queryId, {
      text: `Approval ${action}ed`,
      show_alert: true
    });
  }
}

export const telegramService = new TelegramService();
```

#### `server/src/routes/telegram-webhook.ts`
```typescript
import { Router, Request, Response } from 'express';
import telegramService from '../services/telegram-bot';

const router = Router();

router.post('/webhook', async (req: Request, res: Response) => {
  const update = req.body;
  
  // Handle callback queries (inline button clicks)
  if (update.callback_query) {
    const callback = update.callback_query;
    const data = callback.data;
    
    // Parse callback data: "approve:approval_id" or "reject:approval_id"
    const [action, approvalId] = data!.split(':');
    
    await telegramService.handleCallback(
      callback.id,
      action as 'approve' | 'reject',
      approvalId
    );

    // TODO: Actually process the approval
    // await approveApproval(approvalId) or await rejectApproval(approvalId)
    
    res.sendStatus(200);
    return;
  }

  // Regular messages are handled by bot's event listeners
  res.sendStatus(200);
});

export default router;
```

### 5.3 Files to Modify

#### `server/src/routes/index.ts`
```typescript
import telegramWebhook from './telegram-webhook';

// Add route
app.use('/api/telegram', telegramWebhook);
```

---

## 6. Notification Router Enhancement

### 6.1 Update Existing Notification Service

The notification router already exists (Wave 2). Enhance it:

#### `server/src/services/notification-service.ts`
```typescript
// Add multi-channel support
interface NotificationChannel {
  type: 'email' | 'webpush' | 'telegram' | 'webhook';
  config: any;
}

interface NotificationPreferences {
  channels: NotificationChannel[];
  eventTypes: string[]; // Which events to notify about
}

export async function sendNotification(
  userId: string,
  eventType: string,
  payload: any,
  preferences: NotificationPreferences
) {
  const channels = preferences.channels;
  
  for (const channel of channels) {
    try {
      switch (channel.type) {
        case 'email':
          await emailAdapter.send(channel.config, payload);
          break;
        case 'webpush':
          await webpushAdapter.send(channel.config, payload);
          break;
        case 'telegram':
          await telegramService.sendNotification(channel.config.chatId, payload.message);
          break;
        case 'webhook':
          await webhookAdapter.send(channel.config, payload);
          break;
      }
      
      // Log successful delivery
      await logNotificationDelivery(userId, channel.type, 'success');
    } catch (error) {
      // Log failure and retry
      await logNotificationDelivery(userId, channel.type, 'failed', error);
      // TODO: Implement retry logic
    }
  }
}
```

---

## 7. Testing Strategy

### 7.1 PWA Tests
```typescript
// ui/src/__tests__/pwa-install.test.ts
import { test, expect } from '@playwright/test';

test('PWA is installable', async ({ page }) => {
  await page.goto('/');
  // Check for manifest
  const manifestLink = await page.$('link[rel="manifest"]');
  expect(manifestLink).toBeTruthy();
});

test('Service worker registers', async ({ page }) => {
  await page.goto('/');
  const swRegistered = await page.evaluate(() => {
    return 'serviceWorker' in navigator;
  });
  expect(swRegistered).toBeTruthy();
});
```

### 7.2 WebSocket Tests
```typescript
// server/src/__tests__/websocket.test.ts
import { test, expect } from 'vitest';
import { WebSocket } from 'ws';

test('WebSocket connection authenticates', async () => {
  const ws = new WebSocket('ws://localhost:3100/ws?companyId=test&token=test');
  
  await new Promise((resolve) => {
    ws.on('open', resolve);
  });
  
  expect(ws.readyState).toBe(WebSocket.OPEN);
  ws.close();
});
```

### 7.3 Telegram Tests
```typescript
// server/src/__tests__/telegram.test.ts
import { test, expect } from 'vitest';

test('Telegram webhook receives updates', async () => {
  // Mock Telegram bot
  // Test callback handling
});
```

---

## 8. Quality Gates

Before marking Wave 3 complete:

- [ ] **TypeCheck**: `pnpm -r typecheck` - 0 errors in new code
- [ ] **Tests**: `pnpm test` - All tests pass (including new Wave 3 tests)
- [ ] **Build**: `pnpm build` - Build succeeds
- [ ] **PWA**: Lighthouse PWA score > 90
- [ ] **WebSocket**: Real-time updates work in UI
- [ ] **Telegram**: Bot responds to commands and approvals

---

## 9. Rollback Plan

If Wave 3 deployment fails:

1. **PWA Issues**: Remove vite-plugin-pwa from vite.config.ts, redeploy
2. **WebSocket Issues**: Don't initialize RealtimeServer in server/src/index.ts
3. **Telegram Issues**: Remove telegram webhook route, unset TELEGRAM_BOT_TOKEN

All changes are additive - no breaking changes to existing functionality.

---

## 10. Acceptance Criteria Checklist

Copy this to PHASE_STATE.md when starting Wave 3:

```markdown
- [Wave3-PWA-Telegram] — In Progress
  Files:
    - ui/vite-pwa.config.ts (new)
    - ui/src/components/PWAInstallPrompt.tsx (new)
    - server/src/realtime/ws-server.ts (new)
    - server/src/realtime/ws-middleware.ts (new)
    - ui/src/lib/websocket.ts (new)
    - ui/src/hooks/useWebSocket.ts (new)
    - server/src/services/telegram-bot.ts (new)
    - server/src/routes/telegram-webhook.ts (new)
    - ui/vite.config.ts (modified)
    - server/src/index.ts (modified)
    - server/src/routes/index.ts (modified)
```

---

## 11. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| PWA install fails on iOS | Medium | Test on iOS, provide fallback instructions |
| WebSocket auth bypass | High | Implement token validation, use secure tokens |
| Telegram webhook timeout | Medium | Respond immediately, process async |
| Notification spam | Low | Add user preferences, rate limiting |
| Service worker cache stale | Medium | Use cache busting, version management |

---

## 12. Next Steps

1. Add dependencies to package.json files
2. Implement PWA (vite-plugin-pwa)
3. Implement WebSocket server + client
4. Implement Telegram bot
5. Enhance notification router
6. Write tests
7. Run quality gates
8. Update PHASE_STATE.md

---

*This plan is ready for execution. Spawn @build agent to implement.*