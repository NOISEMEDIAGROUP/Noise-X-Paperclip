# CAL-4 Smoke Suite Notes

Date: 2026-03-09
Agent: QA Tester
Issue: CAL-4

## Smoke Suite Definition (Minimum)

1. Auth smoke
- FECR frontend: `login: maneja error de red con mensaje esperado` (`tests/smoke/critical-flows.smoke.test.tsx`)
- FECR backend: internal billing worker endpoint auth guards (`tests/smoke/test_billing_worker_smoke_unittest.py`)

2. Invoicing smoke
- FECR frontend: onboarding Hacienda integration + issuance submit/poll + reception parse/respond (same smoke file)
- FECR backend: billing public surfaces + webhook guardrails (`tests/smoke/test_billing_live_smoke_unittest.py`)

3. Core dashboard smoke
- FECR frontend: operations dashboard degraded mode warning/no crash (`tests/smoke/critical-flows.smoke.test.tsx`)
- FECR backend: root/health surface smoke (`tests/smoke/test_rest_smoke_unittest.py`)

4. Scheduling smoke
- No explicit scheduling scenario found in current FECR smoke suites (logged as coverage gap under CAL-30 context for migration-level gaps; further scheduling-specific issue should be opened when scheduling module is confirmed in scope).

5. Website migration smoke (active migration repo)
- Wong Next.js build and static route availability over 8 in-scope routes.

## Execution Evidence

### FECR frontend (`dev3.0`)

Command:
- `npm run test:smoke`

Result:
- PASS: `1` file, `5` tests passed.
- Covered smoke scenarios:
  - login error handling
  - onboarding Hacienda validation
  - issuance submit/poll terminal status
  - reception parse + receiver message
  - operations dashboard degraded-mode warning handling

### FECR backend (`dev4`)

Command:
- `.venv/bin/python -m pytest tests/smoke -vv`

Result:
- PASS: `5` passed, `3` skipped.
- Covered smoke scenarios:
  - billing public surfaces
  - billing webhook input guards
  - internal billing worker auth protections
  - internal billing worker with internal auth
  - root/health surfaces
- Skipped scenarios: live-url dependent smoke tests.

### Wong migration website (`dev`)

Commands:
- `npm run build`
- `python3 -m http.server --directory out` + curl route sweep

Result:
- PASS: build succeeded.
- PASS: `8/8` in-scope routes returned `200`:
  - `/`
  - `/dr-sakim-wong/`
  - `/lab/`
  - `/cases/`
  - `/meet-the-team/`
  - `/implants-all-on-5-and-all-in-6/`
  - `/our-installations/`
  - `/the-implantology-science/`

## Failed / Blocking Scenarios Logged as Linked Issues

1. `CAL-29` (High): FECR frontend operations gateway regression (unit failure reproduced twice).
- Repro: `npm run test:unit` -> `355 passed / 2 failed / 357 total`

2. `CAL-30` (Blocker): Wong migration lacks parity/responsive smoke automation (route smoke exists, parity gate automation absent).

## Pass/Fail Matrix

- FECR frontend `dev3.0`: PASS (`test:smoke`), with linked high regression issue `CAL-29`.
- FECR backend `dev4`: PASS (`tests/smoke`), with live-url smoke skipped.
- Wong migration `dev`: PASS (build + route availability), with linked blocker gap issue `CAL-30`.

