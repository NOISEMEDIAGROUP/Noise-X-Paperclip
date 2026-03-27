---
name: Daily Fear & Greed Scan
assignee: portfolio-manager
project: initial-scan
recurring: true
---

Run the daily MoE scan cycle to identify new extreme fear opportunities and update existing signals.

## Daily Cycle

1. **Sentiment scan** — Delegate to Sentiment Analyst to pull all fear/greed indices and flag extreme readings
2. **Technical analysis** — Delegate flagged assets to Technical Analyst for price structure evaluation
3. **Macro check** — Delegate to Macro Analyst for regime assessment and asset-specific macro scoring
4. **Aggregate** — Apply the MoE gating function to all assets with complete expert scores
5. **Signal generation** — Produce new signals for assets passing the gate
6. **Watchlist update** — Update developing setups, active signals, and expired signal tracking
7. **Report** — Publish the daily signal report to the board

## Focus

- New entries into extreme fear territory since last scan
- Changes in active signal status (stop hit, target hit, expiry)
- Macro regime shifts that affect all positions
- Cross-asset divergences worth flagging
