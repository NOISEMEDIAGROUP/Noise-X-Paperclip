# Customer Success Metrics Dashboard Specification

**Owner:** Echo (Customer Success Lead)
**Date:** 2026-03-20
**For:** Analytics Team (Implementation)
**Purpose:** Define exactly what customer success metrics to track and how to measure them

---

## Overview

This document specifies the customer success metrics dashboard that the analytics team needs to implement. It defines:
- **What metrics matter** (for launch success)
- **How to measure them** (data sources, queries, calculations)
- **What targets look like** (success thresholds)
- **How to visualize them** (dashboard layout and views)

**Goal:** Track whether customer success infrastructure is working (preventing support tickets, driving satisfaction, reducing refunds).

---

## Core Success Metrics (Priority 1: Implement First)

These 6 metrics tell you if customer success is working at all.

### 1. Support Email Volume

**What it measures:** How many customers are emailing support each week?

**Why it matters:** High email volume = FAQ/guides failing. Low = self-service working.

**Target:** <20 emails in first 30 days (average <5/week)

**How to measure:**
```
Source: support@diybrand.app inbox
Metric: Count of emails received per week
Calculation: SUM(emails) WHERE date >= [week_start] AND date < [week_end]

Weekly breakdown:
- Week 1: Target 0-4 emails
- Week 2: Target 0-4 emails
- Week 3: Target 0-4 emails
- Week 4: Target 0-4 emails
```

**Dashboard display:**
- Line chart: Trend of weekly email count
- Current week indicator
- Alert if exceeds 5/week

### 2. Average Feedback Rating

**What it measures:** How satisfied are customers with their brand kit? (1-5 star average)

**Why it matters:** Low ratings = product issues or unmet expectations. High = happy customers.

**Target:** 4.5+ stars average

**How to measure:**
```
Source: /api/feedback endpoint (database)
Metric: Average of all rating values
Calculation: AVG(rating) WHERE timestamp >= [start_date]

Breakdown:
- All time average
- Last 7 days average
- Last 30 days average
- By rating (% of 1-star, 2-star, 3-star, 4-star, 5-star)
```

**Query example:**
```sql
SELECT
  AVG(rating) as avg_rating,
  COUNT(*) as total_ratings,
  SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_stars,
  SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_stars
FROM feedback
WHERE created_at >= NOW() - INTERVAL '30 days'
```

**Dashboard display:**
- Large number: Current average (e.g., "4.7 ⭐")
- Sparkline: Trend over past 30 days
- Breakdown pie chart: Distribution of 1-5 stars
- Alert if drops below 4.0

### 3. Feedback Response Rate

**What it measures:** What % of customers fill out the feedback widget?

**Why it matters:** Low rate = customers not seeing widget or not engaging. High = good visibility.

**Target:** >20% of customers rate feedback

**How to measure:**
```
Source: Success page visits + Feedback submissions
Metric: (Feedback submissions / Success page visits) * 100
Calculation: COUNT(feedback) / COUNT(success_page_view) * 100

Daily:
- Success page views from analytics
- Feedback submissions from database
- Calculate response rate
```

**Dashboard display:**
- Percentage indicator
- Trend line: Response rate over time
- Daily breakdown table
- Alert if drops below 15%

### 4. Refund Rate

**What it measures:** What % of customers request refunds?

**Why it matters:** High refund rate = product/expectation mismatch. Should stay <5%.

**Target:** <5% refund requests

**How to measure:**
```
Source: Stripe (refunds) + Manual tracking (email refund requests)
Metric: (Refunds issued / Total purchases) * 100
Calculation: COUNT(refunds WHERE status = 'completed') / COUNT(orders) * 100

Weekly:
- Check Stripe for refunds issued
- Check email for refund requests processed
- Count total orders
- Calculate percentage
```

**Dashboard display:**
- Percentage indicator
- Trend: Weekly refund rate
- Breakdown: Reasons for refunds (if tracked in email)
- Alert if exceeds 5%

### 5. FAQ Page Engagement

**What it measures:** How many visitors search the FAQ? What are they searching for?

**Why it matters:** High engagement = customers finding answers. Low = FAQ needs improvement.

**Target:** >100 FAQ searches in first 30 days (average >25/week)

**How to measure:**
```
Source: Analytics on /faq page
Metric: Count of search submissions
Calculation: COUNT(search_events) WHERE page = '/faq'

Breakdown:
- Daily search count
- Weekly search count
- Top 10 search terms
- Search terms with 0 results (gaps!)
```

**Google Analytics 4 events to track:**
```
Event: faq_search
Parameters:
  - search_term (string)
  - search_result_count (number)
  - timestamp

Event: faq_result_click
Parameters:
  - search_term (string)
  - result_clicked (string)
  - position (number)
```

**Dashboard display:**
- Line chart: Daily/weekly search count
- Top 10 search terms table
- Search terms with 0 results (red alert)
- Alert if weekly searches < 20

### 6. Time-to-First-Logo

**What it measures:** How fast do customers get their brand kit? (minutes from purchase to download)

**Why it matters:** Fast = smooth experience. Slow = friction in questionnaire or design.

**Target:** Median <10 minutes

**How to measure:**
```
Source: Purchase timestamp + Success page timestamp
Metric: Median time between order creation and first export download
Calculation: MEDIAN(export_timestamp - order_timestamp)

Breakdown:
- Median time
- 25th percentile (fastest customers)
- 75th percentile (slowest customers)
- % completing in <5 min
- % completing in <15 min
```

**Dashboard display:**
- Gauge: Median time (target <10 min)
- Histogram: Distribution of completion times
- Percentile breakdown table
- Alert if median exceeds 15 minutes

---

## Secondary Metrics (Priority 2: Implement After Core)

These metrics provide deeper insights once core metrics are working.

### 7. Guide Page Engagement

**What it measures:** How many customers visit the how-to guides?

**Why it matters:** Guide visits = customers seeking help. Should be significant.

**Target:** >50 guide page views in first 30 days

**How to measure:**
```
Source: Analytics on /guides page
Metric: Page views, clicks to individual guides
Calculation: COUNT(page_view) WHERE page = '/guides'

Breakdown:
- Daily visits
- Which guides are most viewed?
- Which guides have longest time-on-page?
- Guide bounce rate
```

**Dashboard display:**
- Line chart: Daily visits
- Bar chart: Views by guide (Getting Started, Questionnaire, Using Logos, etc.)
- Table: Time-on-page per guide
- Alert if <10 visits/week

### 8. Support Email Response Time

**What it measures:** How fast does support respond to customer emails?

**Why it matters:** Fast responses = good customer experience. Slow = frustration.

**Target:** <24 hours (100% of emails answered within 24 hours)

**How to measure:**
```
Source: Email service (Outlook, Gmail) or ticketing system
Metric: Time between email received and first response sent
Calculation: response_sent_timestamp - email_received_timestamp

Breakdown:
- Response time in hours/minutes
- % responding within 4 hours
- % responding within 24 hours
- % responding >24 hours
```

**Dashboard display:**
- Gauge: % of emails answered within 24 hours (target 100%)
- Histogram: Distribution of response times
- Alert if any email unanswered for >24 hours
- Daily breakdown table

### 9. Email Automation Metrics

**What it measures:** How well is the 10-email onboarding sequence performing?

**Why it matters:** Email engagement = onboarding success. Low = sequence needs improvement.

**Metrics to track:**
```
Open rates:
- Welcome email (day 0): Target 50%+
- Tutorial email (day 1): Target 40%+
- Feedback survey (day 7): Target 30%+

Click-through rates:
- Guides link in email: Target 15%+
- FAQ link in email: Target 10%+
- CTA button: Target 10%+

Unsubscribe rate: Target <1%
```

**Dashboard display:**
- Table: Email name, send date, open %, click %
- Line chart: Open rates declining over email sequence (natural)
- Alert if opens drop >50% between emails
- Cohort analysis: Compare cohorts over time

### 10. Feedback Comment Sentiment

**What it measures:** What are customers saying in their feedback comments?

**Why it matters:** Negative comments highlight product issues. Positive = testimonial ideas.

**How to measure:**
```
Source: Feedback comments in database
Metric: Manual categorization or sentiment analysis

Categories:
- Product quality (colors, logo, fonts)
- Process/UX (questionnaire, export, speed)
- Pricing/value
- Feature requests
- Support experience
- Other

Sentiment:
- Positive: "Love this! Perfect colors."
- Neutral: "It's fine."
- Negative: "Doesn't match my brand."
```

**Dashboard display:**
- Comment feed: Last 20 comments, sortable by rating
- Sentiment breakdown pie chart
- Issue frequency table (most common complaints)
- Positive testimonial candidates (5-star + complimentary comment)

---

## Operational Metrics (Priority 3: For Weekly Reviews)

Track these during weekly customer success reviews.

### 11. New FAQ Items Needed

**What it measures:** How many support emails reveal FAQ gaps?

**Why it matters:** FAQ gaps = documentation failures. Track to improve.

**How to measure:**
```
Weekly review:
- Read all support emails from the week
- For each, ask: "Is this answered in FAQ?"
- If NO → Add to "FAQ Gap" list
- If YES but customer didn't find it → FAQ needs improvement

Count:
- Total FAQ gaps identified
- Total FAQ improvements needed
```

**Action:** Echo updates FAQ based on identified gaps

**Dashboard display:**
- Weekly tally of new FAQ items needed
- List of gaps needing implementation
- FAQ update tracker (what's been added)

### 12. Guide Clarity Issues

**What it measures:** Do guides actually help customers, or do they still need support?

**Why it matters:** Guide visitors who email support = guide didn't help. Need to improve.

**How to measure:**
```
Weekly review:
- When customers email support, ask: "Did you read the guides?"
- If YES and still confused → Guide needs clarity improvement
- Track which guides have clarity issues

Count:
- Guides with clarity issues
- Specific steps that are confusing
- Recommended improvements
```

**Action:** Echo updates guides based on feedback

**Dashboard display:**
- Guide clarity issues list
- Updates completed
- Guides with highest clarity issues

### 13. Product Issues Found

**What it measures:** What product bugs are customers discovering?

**Why it matters:** Customer-discovered bugs = quality issues. Should be escalated.

**How to measure:**
```
Weekly review:
- Read all support emails and feedback comments
- Identify bug reports / issues
- Categorize by severity:
  - Critical: Can't export, payment broken
  - High: Bad quality logo, colors wrong
  - Medium: Minor feature issue
  - Low: Nice-to-have improvement

Action: Create GitHub issues for product team
```

**Dashboard display:**
- Bug report list by severity
- Trend: Bugs found per week
- GitHub issue links
- Resolution status

---

## Dashboard Layout Recommendation

### Main View (Executive Summary)

```
Row 1: Key Metrics (gauges)
┌─────────────────┬─────────────────┬─────────────────┐
│ Support Emails  │ Feedback Rating │ Refund Rate     │
│  <5/week (✓)    │  4.7 ⭐ (✓)     │  2.1% (✓)       │
└─────────────────┴─────────────────┴─────────────────┘

Row 2: Engagement Trends (line charts)
┌───────────────────────────────────────────────────┐
│ FAQ Searches per Week (Target: >25)               │
│ ↗ Week 1: 18 | Week 2: 31 | Week 3: 42 | Week 4: 55
└───────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────┐
│ Feedback Response Rate (Target: >20%)             │
│ 18% → 22% → 25% → 28% (↑ improving)              │
└───────────────────────────────────────────────────┘

Row 3: Support & Feedback (tables)
┌─────────────────────────┬─────────────────────────┐
│ Support Email Tally     │ Feedback Comment Feed   │
│ M: 2 | T: 1 | W: 3 ...  │ ⭐⭐⭐⭐⭐ "Perfect!"      │
│ (Trend line)            │ ⭐⭐⭐⭐⭐ "Love it!"       │
│                         │ ⭐⭐⭐ "Colors okay..."   │
└─────────────────────────┴─────────────────────────┘
```

### Detailed View (By Metric)

For each metric, show:
1. Large current value + target
2. Trend sparkline (last 30 days)
3. Breakdown table or chart
4. Alerts/notes section
5. Historical comparison

---

## Data Sources & Integration Points

### Where to Get Data

| Metric | Source | How to Access |
|--------|--------|---------------|
| Support emails | support@diybrand.app | Email provider API or manual export |
| Feedback ratings | PostgreSQL database | Query feedback table, /api/feedback endpoint |
| Refunds | Stripe API | Query refunds via Stripe dashboard or API |
| FAQ searches | Google Analytics 4 | GA4 events (must be implemented) |
| Guide views | Google Analytics 4 | GA4 page_view events |
| Time-to-logo | Order + Analytics database | Join orders with export timestamps |
| Email metrics | Email service (Brevo/Mailchimp) | Email provider analytics API |

### Google Analytics 4 Events to Implement

The frontend team needs to add these events:

```javascript
// FAQ page
gtag('event', 'faq_search', {
  search_term: userSearchInput,
  search_result_count: resultsFound,
  timestamp: new Date()
});

gtag('event', 'faq_result_click', {
  search_term: originalSearch,
  result_title: clickedQuestion,
  position: resultPosition
});

// Guides page
gtag('event', 'guide_view', {
  guide_name: 'Getting Started',
  guide_section: 'Step 3: Download',
  time_on_page: timeSpentSeconds
});

// Success page
gtag('event', 'export_completed', {
  product_tier: 'Basic' | 'Premium',
  export_format: 'zip',
  timestamp: new Date()
});

// Feedback widget
gtag('event', 'feedback_submitted', {
  rating: 1-5,
  has_comment: true|false,
  timestamp: new Date()
});
```

---

## Implementation Checklist

### Week 1: Core Metrics (Priority 1)
- [ ] Set up GA4 events (FAQ search, guide views, export)
- [ ] Create Stripe refunds query
- [ ] Create feedback database query (avg rating)
- [ ] Set up email volume tracking (manual or API)
- [ ] Build dashboard with 6 core metrics
- [ ] Configure alerts (email when thresholds exceeded)

### Week 2: Secondary Metrics (Priority 2)
- [ ] Add email automation metrics
- [ ] Add response time tracking
- [ ] Add sentiment analysis for comments
- [ ] Build secondary metrics view

### Week 3: Operational Metrics (Priority 3)
- [ ] Set up weekly FAQ gap tracking
- [ ] Set up product issue tracking
- [ ] Build operations view

### Week 4: Refinement
- [ ] Review metric accuracy with customer success team
- [ ] Adjust targets based on actual data
- [ ] Document how to interpret metrics
- [ ] Train support team on using dashboard

---

## Success Criteria

The customer success metrics dashboard is successful when:

✅ **All core metrics (1-6) are live and automated**
✅ **Data updates daily (or real-time for key metrics)**
✅ **Alerts trigger when metrics fall below targets**
✅ **Echo (customer success) can explain metric trends**
✅ **Support team uses data to improve processes**
✅ **Product team can see customer issues from feedback**
✅ **Decisions are data-driven, not guesswork**

---

## Who Uses This Dashboard

**Daily viewers:**
- Echo (Customer Success Lead) — Morning check, trend analysis
- Support team lead — Response time tracking, support volume

**Weekly viewers:**
- Echo — All metrics review, gap analysis
- CEO — Overall success metrics
- Product team — Customer feedback and bug reports

**Monthly viewers:**
- All stakeholders — Monthly success review
- Board/investors — Launch success metrics

---

## Questions for Analytics Team

Before implementation, clarify:

1. **Data warehouse:** Where should metrics be stored? (Same DB as feedback API?)
2. **Update frequency:** Real-time, hourly, daily?
3. **Retention:** How long to keep historical data?
4. **Access:** Who has read/write access to dashboard?
5. **Email integration:** API access to support@diybrand.app inbox?
6. **Stripe integration:** API key and query access?
7. **Tool choice:** Metabase, Tableau, Grafana, or custom dashboard?

---

**Questions?** Reach out to @Echo in Paperclip
**Last Updated:** 2026-03-20
**Status:** Ready for Analytics Team Implementation
