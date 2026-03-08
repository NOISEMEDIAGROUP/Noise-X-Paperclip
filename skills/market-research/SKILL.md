---
name: market-research
description: >
  Conduct structured market research including competitive analysis, customer
  sentiment tracking, trend identification, and feature gap analysis. Use when
  assigned research tasks that require gathering recent intelligence from web
  sources, social media, forums, and news.
---

# Market Research Skill

You are a market research analyst. When assigned research tasks, follow this methodology to gather structured, sourced intelligence and deliver actionable findings.

## When to Use

- Competitive analysis (what are competitors doing?)
- Customer sentiment tracking (what are users saying?)
- Industry trend identification (what's changing?)
- Feature gap analysis (what's missing in a product vs. market?)
- Market sizing and positioning research

## Research Procedure

### Step 1: Define Scope

Before searching, clarify:

- **Question**: What specific question are you answering?
- **Time window**: Default to last 30 days unless the task specifies otherwise
- **Target**: Company, product, market segment, or technology
- **Depth**: Quick pulse check vs. deep competitive teardown

Post a comment on your task confirming scope before proceeding:

```md
## Research Scope

- **Question**: [restate the research question]
- **Time window**: Last 30 days
- **Sources**: [list planned sources]
- **Expected output**: [summary / competitive matrix / sentiment report]
```

### Step 2: Gather Data

Search these sources in priority order. Use whatever web search or browsing capability your runtime provides. Skip sources that aren't relevant to the question.

| Source | Best for | Search strategy |
|--------|----------|-----------------|
| **Reddit** | Customer sentiment, complaints, feature requests, unfiltered opinions | Search `site:reddit.com [topic]` or subreddit-specific queries |
| **X/Twitter** | Real-time reactions, influencer takes, product launches | Search `[topic] since:YYYY-MM-DD` for recent posts |
| **Hacker News** | Developer/technical community sentiment, startup opinions | Search `site:news.ycombinator.com [topic]` |
| **YouTube** | Product reviews, competitor demos, tutorials | Search for recent uploads, check view counts for signal strength |
| **Web/News** | Press coverage, announcements, funding, partnerships | Search news sites, company blogs, press releases |
| **GitHub** | Open source activity, developer adoption, issue sentiment | Check stars, recent issues, contributor activity |
| **Product Hunt** | New product launches, feature comparisons | Search for recent launches in the category |

**Efficiency tips** (to manage token budget):

- Start broad, then narrow. One good search query beats five vague ones.
- Capture key quotes and links as you go - don't re-search.
- If a source has no relevant results, note "no signal" and move on.
- Stop when you have 3-5 substantive findings per source. Diminishing returns hit fast.

### Step 3: Analyze and Synthesize

Organize findings into these sections:

1. **Executive Summary** - 3-5 bullet points answering the original question
2. **Key Findings** - Grouped by theme (not by source). Each finding should have:
   - The insight
   - Supporting evidence (quote or data point)
   - Source link
   - Confidence level (high/medium/low based on corroboration)
3. **Competitive Landscape** (if applicable) - How competitors are positioned relative to the research question
4. **Risks and Opportunities** - What should the company watch out for or capitalize on?
5. **Recommendations** - 2-3 concrete next steps based on findings

### Step 4: Report

Post findings as a comment on your assigned task using this format:

```md
## Market Research: [Topic]

**Period**: [date range]
**Analyst**: [your agent name]

### Executive Summary

- [Key finding 1]
- [Key finding 2]
- [Key finding 3]

### Key Findings

#### [Theme 1]

[Insight with supporting evidence]

> "[Direct quote from source]" - [Source name](link)

**Confidence**: High | Corroborated across [N] sources

#### [Theme 2]

[...]

### Competitive Landscape

| Company | Position | Recent moves | Sentiment |
|---------|----------|-------------|-----------|
| [name]  | [...]    | [...]       | [+/-/~]   |

### Risks and Opportunities

- **Risk**: [...]
- **Opportunity**: [...]

### Recommendations

1. [Concrete action item]
2. [Concrete action item]

### Sources

- [Source 1](url) - [brief description of what was found]
- [Source 2](url) - [...]
```

### Step 5: Update Task Status

After posting findings:

- If research is complete and answers the question: mark task `done`
- If follow-up research is needed: leave task `in_progress` with a comment noting what's pending
- If blocked (e.g., need access to a paid data source): mark `blocked` with explanation

## Multi-Heartbeat Research

Large research tasks may span multiple heartbeats. To handle this:

1. **First heartbeat**: Define scope, start gathering. Post a progress comment listing what's been searched and what's remaining.
2. **Subsequent heartbeats**: Continue gathering from remaining sources. Update the progress comment.
3. **Final heartbeat**: Synthesize and post the full report.

Track progress in comments so you (and your manager) can see what's done:

```md
## Research Progress

- [x] Reddit - 4 relevant threads found
- [x] X/Twitter - monitoring #topic hashtag
- [ ] Hacker News - pending
- [ ] YouTube - pending
- [x] Web/News - 2 articles found

**Next heartbeat**: finish HN and YouTube, then synthesize.
```

## Quality Bar

Before marking research as done:

- Every finding has a source link
- Executive summary directly answers the original question
- Recommendations are concrete and actionable (not "consider doing X")
- No unsourced claims or speculation presented as fact
- Confidence levels are honest (low confidence is fine - flag it)
