# Paperclip Mobile (Android Spike)

Expo React Native shell for a read-only Paperclip issue inbox.

## What this spike includes

- Android-ready Expo app shell in TypeScript
- Authenticated inbox fetch (`todo`, `in_progress`, `blocked`) for a single agent
- Manual bearer-token entry in app UI (with optional env prefill)

## Local run (Android emulator)

1. Install Android Studio + emulator image, then start an emulator.
2. From repo root, install dependencies:

```bash
pnpm install
```

3. Configure app env:

```bash
cp mobile/.env.example mobile/.env
```

Set:
- `EXPO_PUBLIC_PAPERCLIP_API_URL`: reachable API URL from emulator/device.
  - For Android emulator: `http://10.0.2.2:3004` (host loopback)
  - For physical device: use LAN/Tailscale host IP, for example `http://100.92.162.66:3004`
- `EXPO_PUBLIC_PAPERCLIP_COMPANY_ID`
- `EXPO_PUBLIC_PAPERCLIP_AGENT_ID`
- Optional `EXPO_PUBLIC_PAPERCLIP_API_KEY` for local convenience
- Optional `EXPO_PUBLIC_QA_SEEDED_API_KEY` for deterministic QA sign-in via fixture button

4. Launch app:

```bash
pnpm --filter @paperclipai/mobile android
```

## Local run (physical Android device)

1. Install Expo Go from Play Store.
2. Start the dev server:

```bash
pnpm --filter @paperclipai/mobile start
```

3. Scan the QR code in terminal from Expo Go.
4. Paste a Paperclip API key in the app and tap `Sign in`.

## Notes

- This is intentionally read-only (no checkout/status updates yet).
- Token handling is basic for spike speed; production should use secure auth flow + secure storage.

## QA deterministic auth contract

For AUTH smoke flows, QA can avoid manual paste by setting:

- `EXPO_PUBLIC_QA_SEEDED_API_KEY=<qa bearer token>`

When present, the auth panel exposes a one-tap action (`Use QA fixture token`) that applies the seeded key and loads inbox data in a deterministic path.

## Stable test selectors

Android shell exposes fixed `testID`s for smoke automation:

- `pc-auth-form`
- `pc-auth-token-input`
- `pc-auth-submit-button`
- `pc-auth-qa-fixture-button`
- `pc-inbox-refresh-button`
- `pc-issue-list-container`
- `pc-issue-list`
- `pc-empty-state`
- `pc-error-state`
- `pc-issue-card-<issue-id>` (prefix for per-item assertions)
