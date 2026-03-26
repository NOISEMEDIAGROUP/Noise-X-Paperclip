# Credit Unit Pricing: Warp Oz Credits → USD Conversion

Date: 2026-03-26

## Problem

When adapter type `oz_local` reports costs, the Warp REST API returns `request_usage.inference_cost` denominated in **Warp credits**, not USD. The oz-local adapter places this value into `costUsd` on the adapter result:

```typescript
// packages/adapters/oz-local/src/server/execute.ts
...(costCredits !== null ? { costUsd: costCredits } : {}),
```

The heartbeat service then converts it to cents as `costUsd * 100`:

```typescript
// server/src/services/heartbeat.ts
function normalizeBilledCostCents(costUsd, billingType) {
  return Math.max(0, Math.round(costUsd * 100));
}
```

This causes **1 credit = $1 USD** when the actual value depends on the user's Warp subscription plan.

**Observed impact**: A run using 378.5 credits is recorded as **$378.50** instead of the correct **$1.51** (at $0.004/credit on the TURBO plan).

The incorrect value propagates to:
- `cost_events.cost_cents` — budget enforcement and cost reports
- `agent_runtime_state.total_cost_cents` — agent lifetime cost
- `agents.spent_monthly_cents` / `companies.spent_monthly_cents` — budget utilization
- UI run detail panel (reads `costUsd` from `heartbeat_runs.result_json`)
- All cost reporting pages (summary, by-agent, by-provider, window spend)

## Context: Warp Pricing

Credit unit prices vary by:
- **Plan tier**: Starter, Standard, Turbo, Enterprise
- **Billing period**: monthly vs annual (annual is cheaper per-credit)
- **Overage**: credits beyond the plan's monthly allotment may be priced differently
- **Compute vs inference**: the Warp API returns both `inference_cost` and `compute_cost` — both are in credits

### Current User's Setup

| Dimension | Value |
|---|---|
| Plan | TURBO |
| Billing period | Annual (Aug 24, 2025 → Aug 24, 2026) |
| Annual cost | $480 USD |
| Monthly credits | 10,000 |
| Effective unit price | $480 / (10,000 × 12) = **$0.004/credit** |

### Future Considerations

Other AI providers use similar credit/token billing with per-plan unit prices:
- **Cursor**: subscription tiers with "fast request" credits
- **Windsurf**: credits-based billing
- **OpenRouter**: purchased credits at tiered pricing

The solution should be general enough to handle `(biller, billing_type) → unit_price_usd` for any credit-denominated provider.

## Architecture Decision

### Option A: Convert in the adapter ❌

Add `creditUnitPriceUsd` to adapter config, multiply before setting `costUsd`.

Rejected — adapter config is per-agent, but pricing policy is company-wide and changes over time (plan renewals, upgrades). Duplicating rate across every agent's config is error-prone and doesn't support retroactive correction.

### Option B: Biller unit pricing table ✅

Add a company-scoped `biller_unit_prices` table. The heartbeat service looks up the applicable rate when processing adapter results with credit-denominated costs.

This cleanly separates:
- **Adapter**: reports raw usage in provider-native units
- **Heartbeat service**: converts to USD using configured rates
- **Board operator**: manages pricing rules through the UI (or API)

### Option C: Convert at query time ❌

Store raw credits, apply conversion in reporting queries.

Rejected — budget enforcement must work in real-time USD cents. Deferring conversion would break hard-stop auto-pause.

## Design

### 1. New Table: `biller_unit_prices`

```
biller_unit_prices {
  id              uuid PK
  company_id      uuid FK → companies
  biller          text NOT NULL    -- e.g. "warp"
  billing_type    text NOT NULL    -- e.g. "credits"
  unit_type       text NOT NULL    -- e.g. "credits" (the raw unit label)
  unit_price_usd  numeric(12,8) NOT NULL  -- USD per single unit, e.g. 0.004
  plan_name       text             -- e.g. "TURBO annual"
  effective_from  timestamptz NOT NULL
  effective_to    timestamptz      -- NULL = still active
  notes           text
  created_at      timestamptz
  updated_at      timestamptz
}

UNIQUE (company_id, biller, billing_type, effective_from)
INDEX  (company_id, biller, billing_type, effective_from DESC)
```

For the current user's case:

```
biller: "warp"
billing_type: "credits"
unit_type: "credits"
unit_price_usd: 0.004
plan_name: "TURBO annual"
effective_from: 2025-08-24
effective_to: 2026-08-24
notes: "$480/12mo subscription, 10k credits/mo"
```

#### Why `numeric(12,8)` for unit price?

Credit prices can be very small. At $0.004/credit we need at least 3 decimal places. Using 8 fractional digits handles future micro-priced units without rounding issues. The final USD→cents conversion rounds at the cost event level.

### 2. Adapter Result Changes

Extend `AdapterExecutionResult` to support raw unit reporting:

```typescript
interface AdapterExecutionResult {
  // ... existing fields ...
  costUsd?: number | null;         // existing — USD amount (used by non-credit adapters)
  costRawUnits?: number | null;    // NEW — raw provider units (e.g. Warp credits)
  costRawUnitType?: string | null; // NEW — label for the unit (e.g. "credits")
}
```

The oz-local adapter changes from:

```typescript
...(costCredits !== null ? { costUsd: costCredits } : {}),
```

To:

```typescript
...(costCredits !== null
  ? { costRawUnits: costCredits, costRawUnitType: "credits" }
  : {}),
```

This makes the data flow honest: the adapter reports what it knows (credits), the server handles conversion.

### 3. Cost Event Schema Extension

Add optional raw-unit fields to `cost_events` for audit trail:

```
cost_events {
  // ... existing columns ...
  raw_units       numeric(14,4)  -- e.g. 378.5 credits
  raw_unit_type   text           -- e.g. "credits"
  unit_price_id   uuid FK → biller_unit_prices  -- which pricing rule was applied
}
```

This preserves the original adapter output alongside the converted USD cents, enabling:
- Retroactive recalculation if a pricing rule is corrected
- Clear audit trail of how costCents was derived
- Distinguishing "no cost data" from "zero cost"

### 4. Heartbeat Service Conversion

Modify `updateRuntimeState()` in `server/src/services/heartbeat.ts`:

```typescript
async function resolveAdapterCostCents(
  db: Db,
  companyId: string,
  result: AdapterExecutionResult,
): Promise<{
  costCents: number;
  rawUnits: number | null;
  rawUnitType: string | null;
  unitPriceId: string | null;
}> {
  const billingType = normalizeLedgerBillingType(result.billingType);

  // Path A: Adapter already reports USD (metered_api, subscription_overage, etc.)
  if (result.costUsd != null && result.costRawUnits == null) {
    return {
      costCents: normalizeBilledCostCents(result.costUsd, billingType),
      rawUnits: null,
      rawUnitType: null,
      unitPriceId: null,
    };
  }

  // Path B: Adapter reports raw units — look up conversion rate
  if (result.costRawUnits != null) {
    const biller = resolveLedgerBiller(result);
    const rule = await lookupUnitPrice(db, companyId, biller, billingType);
    if (rule) {
      const usd = result.costRawUnits * rule.unitPriceUsd;
      return {
        costCents: Math.max(0, Math.round(usd * 100)),
        rawUnits: result.costRawUnits,
        rawUnitType: result.costRawUnitType ?? null,
        unitPriceId: rule.id,
      };
    }
    // No pricing rule: log warning, record zero cost but preserve raw units
    logger.warn(
      { companyId, biller, billingType, rawUnits: result.costRawUnits },
      "no biller_unit_prices rule found; cost recorded as 0",
    );
    return {
      costCents: 0,
      rawUnits: result.costRawUnits,
      rawUnitType: result.costRawUnitType ?? null,
      unitPriceId: null,
    };
  }

  // Path C: No cost data
  return { costCents: 0, rawUnits: null, rawUnitType: null, unitPriceId: null };
}
```

#### `lookupUnitPrice()` query

```sql
SELECT id, unit_price_usd
FROM biller_unit_prices
WHERE company_id = $1
  AND biller = $2
  AND billing_type = $3
  AND effective_from <= NOW()
  AND (effective_to IS NULL OR effective_to > NOW())
ORDER BY effective_from DESC
LIMIT 1
```

### 5. Run Detail: Store Converted `costUsd` in `usageJson`

Currently the UI reads `costUsd` from `heartbeat_runs.usage_json` and `result_json`. The heartbeat service should write the **converted** costUsd (not raw credits) into `usageJson` so the run detail page displays correctly without separate lookup logic.

### 6. API Endpoints

#### `POST /api/companies/:companyId/biller-unit-prices`

Board-only. Create a pricing rule.

```json
{
  "biller": "warp",
  "billingType": "credits",
  "unitType": "credits",
  "unitPriceUsd": 0.004,
  "planName": "TURBO annual",
  "effectiveFrom": "2025-08-24T00:00:00Z",
  "effectiveTo": "2026-08-24T00:00:00Z",
  "notes": "$480/12mo subscription, 10k credits/mo"
}
```

#### `GET /api/companies/:companyId/biller-unit-prices`

List active and historical pricing rules.

#### `PATCH /api/companies/:companyId/biller-unit-prices/:id`

Update a pricing rule (e.g. set `effectiveTo` to close it, or correct `unitPriceUsd`).

#### `POST /api/companies/:companyId/biller-unit-prices/:id/recalculate`

Retroactively recalculate `cost_cents` for all `cost_events` that reference this pricing rule. Useful when correcting a unit price.

### 7. UI Changes

#### Settings / Billing page section

Add a "Biller Pricing Rules" card to the company settings or costs page:
- List current rules: biller, billing type, unit price, plan, effective dates
- Create new rule form
- End-date (close) a rule

#### Run detail

No change needed — the run detail already reads `costUsd` from the result, which will now be correctly converted before storage.

#### Costs page

Add a column or tooltip on credit-based rows showing "X credits @ $Y/credit = $Z".

### 8. Data Migration

A one-time script to fix historical cost_events where `biller = 'warp'` and `billing_type = 'credits'`:

```sql
-- After creating biller_unit_prices and adding raw_units columns:
-- Reverse the incorrect conversion: costCents was rawCredits * 100

UPDATE cost_events
SET
  raw_units = cost_cents / 100.0,        -- recover original credit count
  raw_unit_type = 'credits',
  cost_cents = ROUND((cost_cents / 100.0) * 0.004 * 100)  -- credits * $/credit * 100
WHERE biller = 'warp'
  AND billing_type = 'credits'
  AND cost_cents > 0;

-- Also fix agent/company spent_monthly_cents — these need recalculation
-- from the corrected cost_events for the current month
```

The runtime state `total_cost_cents` and `agents.spent_monthly_cents` / `companies.spent_monthly_cents` will also need recalculation.

## Implementation Order

1. **Schema**: Add `biller_unit_prices` table + extend `cost_events` with raw-unit columns
2. **Shared types/validators**: Add `BillerUnitPrice` type, create/update validators
3. **Server**: Add `biller-unit-prices` CRUD routes + `lookupUnitPrice()` service
4. **Adapter result**: Add `costRawUnits` / `costRawUnitType` to `AdapterExecutionResult`
5. **oz-local adapter**: Change `costUsd: credits` → `costRawUnits: credits`
6. **Heartbeat service**: Implement `resolveAdapterCostCents()` with unit price lookup
7. **UI**: Add biller pricing rules management
8. **Data migration**: Fix historical warp cost_events
9. **Seed pricing**: Create the user's TURBO plan rule

## Verification

After implementation:
- Run an oz_local heartbeat → observe correct `$1.xx` costs instead of `$378.xx`
- Check costs page shows correct totals
- Check budget enforcement uses correct USD values
- Confirm historical data is corrected
- `pnpm -r typecheck && pnpm test:run && pnpm build`
