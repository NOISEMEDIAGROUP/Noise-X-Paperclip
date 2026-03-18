# DIYBrand.app Product Roadmap
**Date:** 2026-03-18
**PM:** Sage
**Version:** 1.0

---

## Executive Summary

Based on comprehensive audits (Growth, Design, QA), I've identified **$14.99 pricing clarity** and **conversion optimization** as the highest ROI opportunities. Performance is below target but not currently blocking users. Design system gaps are manageable technical debt.

**Strategic Focus:** Convert visitors → paid customers. Every feature must drive conversion or retention.

---

## Prioritization Framework

| Priority | Definition | Examples |
|----------|------------|----------|
| **P0** | Blocking revenue/launch | Pricing confusion, payment bugs |
| **P1** | High impact, low effort | Copy improvements, meta tags |
| **P2** | High impact, medium effort | Performance optimization, testimonial upgrades |
| **P3** | Medium impact | Design system improvements |
| **P4** | Low impact/polish | Animation tweaks, scrollbar theming |

---

## Sprint 1: Launch Blockers & Quick Wins (Week 1)
**Goal:** Resolve pricing confusion, capture low-hanging conversion wins

### P0 - Critical
| Task | What | Why | How | Effort | Owner |
|------|------|-----|-----|--------|-------|
| **Pricing Clarification** | Confirm actual pricing ($14.99 or $19/$49 tiers) and update all surfaces | Blocking conversion - conflicting prices destroy trust | 1. Stakeholder alignment<br>2. Update codebase<br>3. Update meta tags<br>4. Update JSON-LD schema | S | CEO + Dev |

### P1 - High Impact Quick Wins
| Task | What | Why | How | Effort | Owner |
|------|------|-----|-----|--------|-------|
| **Hero Headline Rewrite** | Replace "Your brand. Built by AI. In minutes." with benefit-focused copy | Generic headline doesn't differentiate us | Use Option A from Growth Audit:<br>"Professional brand identity in 10 minutes, not 10 weeks." | XS | Copywriter + Designer |
| **Meta Tags Optimization** | Update title, description, OG tags with USPs | +15% CTR, +20% organic traffic projected | Implement all meta changes from Growth Audit | S | Dev |
| **CTA Copy Improvement** | Replace "Build My Brand" with "Get My Brand Kit" or "Start (10-min questionnaire)" | More specific, less generic | Update primary CTA across landing page | XS | Copywriter |
| **Surface Pricing in Hero** | Add "$14.99 one-time" to hero section | Pricing buried 3/4 down page hurts conversion | Add pricing callout near headline + CTA | S | Designer + Dev |

**Expected Impact:** +10-15% conversion rate, +15% organic CTR

---

## Sprint 2: Social Proof & Trust Signals (Week 2)
**Goal:** Build credibility, reduce purchase friction

### P1 - High Impact
| Task | What | Why | How | Effort | Owner |
|------|------|-----|-----|--------|-------|
| **Testimonial Upgrade** | Add profile images, full names, specifics, verification badges | Generic testimonials feel fake - hurts trust | 1. Source real customer data<br>2. Get permission + photos<br>3. Rewrite with specifics (timelines, cost comparisons) | M | Marketing + Designer |
| **Money-Back Guarantee** | Add explicit 30-day refund guarantee copy | Reduces purchase anxiety | Add guarantee section near pricing tiers | XS | Copywriter |
| **Price Comparison Callout** | Show DIYBrand vs Canva/Adobe costs | Positions $14.99 as steal, not cheap | Add comparison table below pricing | S | Designer |

### P2 - Medium Impact
| Task | What | Why | How | Effort | Owner |
|------|------|-----|-----|--------|-------|
| **Feature Copy Rewrite** | Rewrite all 6 features benefit-first instead of feature-first | Current copy explains "what" not "why it matters" | Use rewrite examples from Growth Audit | M | Copywriter |

**Expected Impact:** +12% conversion rate, +5% time-on-page

---

## Sprint 3: Performance Optimization (Weeks 3-4)
**Goal:** Hit 85+ Lighthouse performance target

### P2 - High Impact, Medium Effort
| Task | What | Why | How | Effort | Owner |
|------|------|-----|-----|--------|-------|
| **JavaScript Profiling** | Identify slow JS execution | Performance score 64-65, target 85+ | Chrome DevTools profiling → fix bottlenecks | M | Dev |
| **Code Splitting** | Lazy-load non-critical JavaScript | Reduce initial bundle size | Next.js dynamic imports for wizard, success page | M | Dev |
| **Image Optimization** | Convert to WebP, optimize delivery | Faster LCP, better mobile performance | Next.js Image component + WebP conversion | S | Dev |
| **Prefers-Reduced-Motion** | Disable animations for accessibility | Better a11y + performance for low-end devices | CSS media query for all animations | S | Designer + Dev |

**Expected Impact:** Lighthouse score 65 → 85+, better mobile UX, improved accessibility

---

## Sprint 4: Design System Maturity (Weeks 5-6)
**Goal:** Reduce technical debt, enable faster iteration

### P3 - Medium Impact
| Task | What | Why | How | Effort | Owner |
|------|------|-----|-----|--------|-------|
| **Component Library Doc** | Document all reusable components with variants | No single source of truth for design patterns | Create `DESIGN-SYSTEM.md` with component inventory | M | Designer |
| **Standardize Spacing** | Replace hardcoded px values with Tailwind scale | Inconsistent spacing hurts polish | Audit all components, replace with `gap-4`, `p-6` etc | M | Dev |
| **Reusable Spinner Component** | Create Spinner component with size variants | Multiple inconsistent spinner implementations | Centralize spinner logic with props | S | Dev |
| **Button Component** | Create Button.tsx with size/variant props | No clear button hierarchy | Document primary, secondary, ghost, tertiary | S | Designer + Dev |

**Expected Impact:** Faster dev velocity, better consistency, easier onboarding for new devs

---

## Backlog: Future Enhancements

### Short-term (Month 2)
- **Video testimonials** (user-generated content showing kits in use)
- **Competitor comparison page** (dedicated landing page vs Canva, Adobe, Looka)
- **A/B test headline variations** (3 options from Growth Audit)
- **UGC gallery** (customer brand kits showcase)
- **Form validation icon indicators** (visual hierarchy for errors)

### Long-term (Month 3+)
- **Storybook/showcase page** (live component gallery at /design-guide)
- **Design tokens system** (extract CSS vars to dedicated tokens file)
- **Semantic color system** (success/error/warning/info variants)
- **Empty state patterns** (no saved sessions, API errors, etc)
- **Mobile nav/header** (sticky header with logo + CTA)

---

## Success Metrics (Track Post-Launch)

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| **Landing → Questionnaire CTR** | TBD | +15% | Google Analytics |
| **Questionnaire → Payment conversion** | TBD | +10% | Stripe analytics |
| **Avg. time on page** | TBD | +25% | Google Analytics |
| **Organic CTR** | TBD | +15% | Search Console |
| **Lighthouse Performance** | 64-65 | 85+ | Lighthouse CI |
| **Form abandonment rate** | TBD | -20% | Funnel analysis |
| **Testimonial engagement** | TBD | +10% scroll depth | Hotjar/Analytics |

---

## Decision Log

### Open Questions
1. **Pricing model:** Confirm $14.99 one-time or $19/$49 tiers? (Blocking Sprint 1)
2. **Refund policy:** 7, 14, or 30 days? (Needed for Sprint 2)
3. **Early access status:** Is $14.99 locked forever or promotional? (Copy messaging dependency)
4. **"Designed in Sweden":** Should we emphasize this as credibility signal? Where?

### Decisions Made
- **Focus on conversion first, performance second** (rationale: perf not blocking users, but poor copy is losing conversions)
- **Sprint 1 prioritizes quick wins** (low effort, high impact changes before bigger lifts)
- **Design system work deferred to Sprint 4** (technical debt, not revenue driver)

---

## Competitive Intelligence

### Tracked Competitors
- **Looka** - $20 one-time, similar positioning
- **Brandmark** - $25-65 tiers, AI-powered
- **Tailor Brands** - $10.99/mo subscription (our differentiator: no subscriptions)
- **Logo Diffusion** - $10-40, Stable Diffusion based
- **Canva Logo Maker** - $120/yr Canva Pro (locked to Canva)

### Our Advantages
1. ✅ **One-time payment** (no subscriptions = biggest differentiator)
2. ✅ **Own all files** (vs Canva lock-in)
3. ✅ **$14.99 price point** (cheaper than Looka, Brandmark)
4. ✅ **Beautiful design** (neon aesthetic stands out)
5. ✅ **Simple UX** (no feature bloat)

### Gaps to Address
- ⚠️ **Social proof** (competitors have 10K+ reviews, we have 6 testimonials)
- ⚠️ **Brand recognition** (new entrant, no SEO history)
- ⚠️ **Feature parity** (competitors have templates, mockups, business card design)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Pricing confusion loses customers | HIGH | HIGH | P0 priority in Sprint 1 |
| Performance hurts mobile conversions | MEDIUM | MEDIUM | Address in Sprint 3, monitor bounce rate |
| Neon aesthetic polarizes users | LOW | MEDIUM | A/B test "professional" variant later |
| Generic copy doesn't convert | HIGH | HIGH | Rewrite in Sprint 1+2 |
| Competitor undercuts pricing | LOW | HIGH | Lock in early adopters at $14.99 forever |

---

## Next Actions (This Week)

### Immediate (Today)
- [ ] **CEO:** Confirm final pricing ($14.99 or $19/$49)
- [ ] **Sage (me):** Share this roadmap with team for feedback
- [ ] **CEO:** Approve Sprint 1 scope

### Short-term (This Week)
- [ ] **Marketing:** Source real customer testimonials (names, photos, permission)
- [ ] **Designer:** Mockup hero headline options (3 variants from Growth Audit)
- [ ] **Dev:** Update meta tags per Growth Audit recommendations
- [ ] **QA:** Set up Lighthouse CI for continuous monitoring

---

## Notes

- This roadmap assumes **post-MVP, pre-launch** state (early access)
- All efforts are t-shirt sized: XS (<2h), S (<1 day), M (2-3 days), L (1 week), XL (2+ weeks)
- Sprint 1-2 focus on **conversion optimization** (cheapest way to grow revenue)
- Sprint 3-4 focus on **technical quality** (required for scale, not blocking launch)
- Backlog items can be pulled forward if dependencies resolve early

---

**End of Roadmap**
