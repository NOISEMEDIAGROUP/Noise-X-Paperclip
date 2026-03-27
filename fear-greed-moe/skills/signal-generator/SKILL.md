---
name: signal-generator
description: Aggregate expert scores using MoE gating function and produce structured trade signals with entry, stop-loss, and take-profit levels
allowed-tools:
  - Read
  - Bash
---

# Signal Generator

The gating function of the Mixture of Experts system. Aggregates scores from Sentiment, Technical, and Macro analysts to produce final trade signals.

## Gating Function

### Input
Three expert scores per asset, each on a -10 to +10 scale:
- Sentiment score (weight: 30%)
- Technical score (weight: 40%)
- Macro score (weight: 30%)

### Gate Conditions (ALL must pass)

```
1. AGREEMENT:  At least 2 of 3 experts score > +3
2. CONVICTION: Weighted composite > +4.0
3. NO VETO:    No expert scores below -5
```

### Composite Calculation

```
composite = (sentiment * 0.30) + (technical * 0.40) + (macro * 0.30)
```

### Signal Strength Classification

```
composite >= +7.0  →  STRONG BUY   (high conviction, full position)
composite >= +5.5  →  BUY          (good conviction, standard position)
composite >= +4.0  →  LEAN BUY     (moderate conviction, reduced position)
composite <  +4.0  →  NO SIGNAL    (insufficient conviction)
```

## Signal Output Format

```
═══════════════════════════════════════
SIGNAL: [STRONG BUY / BUY / LEAN BUY]
Asset:  [TICKER]
Class:  [Crypto / Equity / Commodity]
Date:   [YYYY-MM-DD]
═══════════════════════════════════════

TRADE PLAN
  Entry zone:     $XX,XXX — $XX,XXX
  Stop-loss:      $XX,XXX  (−X.X%)
  Take-profit 1:  $XX,XXX  (+X.X%) — exit 50%
  Take-profit 2:  $XX,XXX  (+X.X%) — exit remaining
  Risk/Reward:    1:X.X
  Timeframe:      [Swing 3-14d / Position 2-8w]

EXPERT CONSENSUS
  Sentiment:  [+X] — [one-line reasoning]
  Technical:  [+X] — [one-line reasoning]
  Macro:      [+X] — [one-line reasoning]
  ─────────────────────────
  Composite:  [+X.X] ([classification])

THESIS
  [2-3 sentences: why this trade, what makes it compelling]

INVALIDATION
  [What would kill this trade — specific price level or event]
═══════════════════════════════════════
```

## Watchlist Format

For assets approaching but not yet triggering:

```
WATCHLIST — [DATE]

DEVELOPING SETUPS:
  [ASSET] — Sentiment: [+X], awaiting technical confirmation
  [ASSET] — Technical setup forming, macro headwind (score: [+X])

ACTIVE SIGNALS:
  [ASSET] — Entry: $XX,XXX, Current: $XX,XXX, P&L: +X.X%

EXPIRED SIGNALS (last 30 days):
  [ASSET] — Result: [WIN/LOSS], R achieved: [X.X R]
```

## Performance Tracking

Every signal must be tracked to completion:
- Entry filled? At what price?
- Stop hit or target hit?
- Actual R:R achieved
- Time in trade
- Running win rate and average R
