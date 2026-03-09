# CAL-5 Release Confidence Scorecard Notes

Date: 2026-03-09
Agent: QA Tester
Issue: CAL-5

## Fresh Command Evidence (This Heartbeat)

### Wong migration website (`dev`)

- `npm run build` -> PASS
  - Next.js static routes generated: `/`, `/dr-sakim-wong`, `/lab`, `/cases`, `/meet-the-team`, `/implants-all-on-5-and-all-in-6`, `/our-installations`, `/the-implantology-science`
- `python3 -m http.server --directory out` + curl sweep -> 8/8 routes `200`
- Test inventory in source paths (`src/app/tests`) -> `0` automated test files found
- Rollback/deploy docs scan in `README.md` + `plans/` -> no rollback evidence found

### FECR frontend (`dev3.0`)

- `npm run test:unit` (run 1) -> FAIL: `355 passed / 2 failed / 357 total`
- `npm run test:unit` (run 2) -> FAIL: same 2 failures reproduced
  - `tests/unit/operations/operations-gateway.api.unit.test.ts`
    - `previewBatchCsv usa fallback dev cuando endpoint falta y falla en prod`
    - `cubre fallback missing para métodos try/catch legacy`
- Rollback signal: stack automation present in `README.md` (`stack-one-click.sh`) but no explicit rollback runbook section found

### FECR backend (`dev4`)

- `.venv/bin/python -m pytest --collect-only tests -q` -> `211 tests collected`
- `.venv/bin/python -m pytest tests/unit/test_deploy_contract_unittest.py -q` -> `6 passed`
- `.venv/bin/python -m pytest tests/smoke -q` -> `5 passed, 3 skipped`
- Rollback signal: explicit rollback references in docs/tests (`docs/compliance/fiscal-pricing.md`, `test_deploy_contract_unittest.py`, REST paths for rollback/restore)

### Dental backend (`main`)

- Repository inventory -> only `README.md`, no runnable code/tests discovered

## Coverage Snapshot Used For Scoring

- Wong website: automated parity/responsive/accessibility coverage absent (manual-only possible currently)
- FECR frontend: strong unit footprint but active regressions in operations gateway
- FECR backend: broad collected suite plus passing smoke sample
- Dental backend: no testable baseline

## Gate Inputs

- Executed test pass rate (this run, excluding skipped):
  - FECR frontend: `355/357`
  - FECR backend sampled execution: `11/11`
  - Combined: `366/368 = 99.46%`
- Critical defects/blockers currently open from QA perspective:
  - FECR frontend regression failures (2 tests, same module)
  - Wong migration lacks automated parity/responsive/a11y release gate coverage
  - Dental backend lacks executable baseline
- Flaky signal:
  - Frontend rerun showed identical failures (no pass/fail oscillation observed in this heartbeat)
- Rollback readiness signal:
  - FECR backend: good
  - FECR frontend: partial
  - Wong + Dental: weak/none
