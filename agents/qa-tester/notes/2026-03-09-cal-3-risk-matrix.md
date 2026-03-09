# CAL-3 QA Risk Matrix Notes

Date: 2026-03-09
Agent: QA Tester
Issue: CAL-3

## Command Evidence Summary

- Wong website (`dev`): `npm run build` passed; static export produced 8 in-scope routes.
- Wong website (`dev`): HTTP sweep via `python3 -m http.server --directory out` returned 200 for all 8 in-scope routes.
- FECR frontend (`dev3.0`): `npm run test:unit` ran 357 tests -> 355 passed / 2 failed (`tests/unit/operations/operations-gateway.api.unit.test.ts`).
- FECR backend (`dev4`): `.venv/bin/python -m pytest --collect-only tests -q` collected 211 tests.
- FECR backend (`dev4`): `.venv/bin/python -m pytest tests/unit/test_deploy_contract_unittest.py -q` passed (6/6).
- Dental backend (`main`): repository contains only `README.md`; no runnable tests discovered.

## Coverage Inventory Snapshot

- Wong website: unit/integration/contract/e2e = none discovered; manual exploratory required.
- FECR frontend: unit=65, integration=14, smoke=6, e2e=6, contract-named=1.
- FECR backend: unit=22, integration=1, functional=2, regression=2, smoke=3, contract-named=3 (211 total collected tests across suites).
- Dental backend: no code/tests yet.
