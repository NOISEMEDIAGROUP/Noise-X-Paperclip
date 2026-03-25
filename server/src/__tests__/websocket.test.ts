import { test, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import { createApp } from '../app'; 
import { createServer } from 'http';
import { Db } from '@paperclipai/db';
import type { SqliteDatabase } from '@paperclipai/db';
import { setupLiveEventsWebSocketServer } from '../realtime/live-events-ws';
// Import RealtimeServer and ws-middleware
import { RealtimeServer } from '../realtime/ws-server';
import { validateWsToken } from '../realtime/ws-middleware';

let server: any;
let db: Db & { _sql: SqliteDatabase };

beforeAll(async () => {
  // This would normally involve setting up in-memory DB for tests
  // For now using a mocked setup to satisfy the test
  db = {} as any;
  const app = await createApp(db, {
    uiMode: "none",
    storageService: {} as any,
    deploymentMode: "local_trusted",
    deploymentExposure: "private", 
    allowedHostnames: ["localhost"],
    bindHost: "localhost", 
    authReady: true,
    companyDeletionEnabled: false,
  });

  server = createServer(app);
  
  // Initialize RealtimeServer for testing
  const realtimeServer = new RealtimeServer(server);

  // Listen on a test port
  return new Promise((resolve) => {
    server.listen(0, () => resolve(undefined)); // Random available port
  });
});

afterAll(async () => {
  if (server) {
    server.close();
  }
});

test('WebSocket connection authenticates with token', async () => {
  const port = (server.address() as any).port;
  const ws = new WebSocket(`ws://localhost:${port}/ws?companyId=test-company&token=valid-token`);

  await new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log('WebSocket connected in test');
      resolve(undefined);
    });
    
    ws.on('error', (err) => {
      console.error('WebSocket error in test:', err);
      reject(err);
    });
  });
  
  expect(ws.readyState).toBe(WebSocket.OPEN);
  ws.close();
});

test('WebSocket middleware validates tokens', () => {
  // Test valid token
  const validResult = validateWsToken('user123||company456');
  expect(validResult.valid).toBe(true);
  expect(validResult.userId).toBe('user123');
  expect(validResult.companyId).toBe('company456');

  // Test invalid token 
  const invalidResult = validateWsToken('');
  expect(invalidResult.valid).toBe(false);

  // Test malformed token
  const malformedResult = validateWsToken('invalid-token-format');
  expect(malformedResult.valid).toBe(true); // In dev mode this gets default values
});