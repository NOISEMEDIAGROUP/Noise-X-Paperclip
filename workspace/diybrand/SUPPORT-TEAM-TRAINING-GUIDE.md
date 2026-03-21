# Support Team Training & Onboarding Guide

**Owner:** Echo (Customer Success Lead)
**Date:** 2026-03-20
**For:** Support team members (new hires and existing staff)
**Purpose:** Train support staff on all customer success systems and best practices

---

## Welcome to the Support Team

You're joining a team built around a simple philosophy:

**Every support email is a documentation failure.**

Your job isn't just to respond to customer emails — it's to fix the underlying problem so the next customer doesn't need to email support. When you get a question, you should ask: *"Why didn't the FAQ/guides answer this?"* Then improve the FAQ so that's the last time anyone asks.

This guide teaches you how to use every system we've built to do your job effectively.

---

## Quick Start (First Day)

### 1. Get Access (30 minutes)

You need access to:

```
☐ Email: support@diybrand.app
  → Ask ops lead for account access
  → Set up in Gmail or Outlook
  → Test sending/receiving

☐ FAQ page: https://diybrand.app/faq
  → Bookmark this — you'll use it constantly
  → Try the search feature on a few topics

☐ Guides page: https://diybrand.app/guides
  → Review all 6 guides (30 min reading)
  → Understand the customer journey

☐ Refund policy: https://diybrand.app/refund-policy
  → Memorize the 30-day guarantee process
  → Know the 5 refund steps by heart

☐ Stripe dashboard (for payment info)
  → Ask ops for read-only access
  → Learn how to look up orders and refunds

☐ SUPPORT-TEMPLATES.md (this repo)
  → Save the 8 templates locally
  → Set them up as saved replies in your email
```

### 2. Read These Documents (1-2 hours)

Required reading:
1. **CUSTOMER-SUCCESS-STRATEGY.md** (20 min) — Philosophy and metrics
2. **CUSTOMER-SUCCESS-OPERATIONS-GUIDE.md** (30 min) — Your daily procedures
3. **SUPPORT-TEMPLATES.md** (20 min) — Your 8 email responses
4. **LAUNCH-COMMUNICATIONS.md** (20 min) — Launch announcements (context)
5. **This document** (20 min) — Best practices and workflows

### 3. Practice (1 hour)

Do this:
- [ ] Send yourself a test email to support@diybrand.app
- [ ] Search the FAQ for "color" — note how search works
- [ ] Read all 6 guides (skim, don't memorize)
- [ ] Open refund policy and read the timeline
- [ ] Look up a test customer order in Stripe
- [ ] Create 8 saved reply templates from SUPPORT-TEMPLATES.md

**You're ready to start after this.**

---

## Your Daily Workflow

### Morning Standup (9 AM)

Spend 10 minutes on this:

1. **Check overnight emails**
   - Open support@diybrand.app
   - Count new emails
   - Scan subjects — anything urgent?

2. **Check feedback submissions**
   - Look at feedback API dashboard (once it exists)
   - Any 1-star reviews? Read the comments.
   - Anything that's a product bug? Note it.

3. **Quick status update**
   - Post in Slack/Discord: "Morning standup — X new emails, feedback avg Y stars"
   - Flag any critical issues

### Responding to Support Emails

When you get a support email, follow this 4-step process:

**STEP 1: Read the email carefully (2 minutes)**

Understand:
- What's the customer asking?
- Is it a question, complaint, or request?
- Are they angry/frustrated or just asking?
- Did they mention trying anything already?

**STEP 2: Check the FAQ (3 minutes)**

Search the FAQ for keywords from their email:
- Search for the main topic (e.g., "colors", "export", "regenerate")
- Is this question answered in the FAQ?
  - YES → Note the FAQ link
  - NO → This is a FAQ gap — you'll update after this email

Common searches to try:
- "How do I" → guides page
- "Can I" → FAQ
- "How much" / "Cost" / "Price" → FAQ pricing section
- "Refund" / "Money back" → refund policy
- "Export" / "Download" → guides
- "Regenerate" / "Change" → guides

**STEP 3: Decide: Support vs. Documentation Improvement**

Two scenarios:

**Scenario A: FAQ Answers This**
```
Customer email: "Can I change the colors?"
FAQ has: Q: Can I regenerate my brand kit?
         A: Yes, log in and click Regenerate...

Action:
1. Use SUPPORT-TEMPLATES.md → "Regeneration" template
2. Personalize: Add customer name, acknowledge their question
3. Include link to FAQ answer
4. Suggest the guides if needed
5. Send within 4 hours

Email would be:
"Hi Sarah,

Great question! Yes, you can absolutely regenerate your brand kit
to try different colors. Here's how:

[Link to guide: "How to Regenerate Your Brand Kit"]

If you need more details, check out our FAQ:
[Link to FAQ answer on regeneration]

Let me know if that helps!
Best,
[Your name]"
```

**Scenario B: FAQ Doesn't Answer This**
```
Customer email: "Can I get a refund but keep the colors file?"
FAQ doesn't cover this edge case

Action:
1. Answer the immediate question based on refund policy
2. NOTE: "FAQ gap - customer asked about partial refunds"
3. Send response
4. After email is sent, note this for weekly FAQ update

Email would be:
"Hi Marcus,

Our refund policy covers full refunds within 30 days. We don't currently
support partial refunds, but I want to help. Here are your options:

Option 1: Full refund + you keep the files
Option 2: Try regenerating to get colors you love

Which would work better?
Best,
[Your name]"

Then note: "Add to FAQ - Can I refund but keep files? Edge case."
```

**STEP 4: Send Response + Document**

1. **Send the email**
   - Use template from SUPPORT-TEMPLATES.md as starting point
   - Personalize with customer name and context
   - Include relevant FAQ/guide links
   - Keep tone friendly and helpful
   - Target response time: <4 hours (ideal <2 hours)

2. **Document what you did**
   - Copy email into support log (Excel/Sheets)
   - Note: Date, customer, issue, resolution, template used
   - If FAQ gap: Add to "Gaps Found This Week" list

3. **If refund request: Follow refund process**
   - See "Handling Refunds" section below

4. **If product bug: Escalate**
   - See "Escalation Procedures" section below

---

## Using the Email Templates

You have 8 templates in SUPPORT-TEMPLATES.md. When to use each:

### Template 1: Quick Start (Use for: First contact, how to begin)
**Trigger:** "How do I get started?" "What do I do first?" "I'm confused"
**What it does:** Walks them through questionnaire → export → success
**Customize:** Add customer name, specific pain point they mentioned
**Example:**
```
Hi [Name],

Welcome to DIYBrand! Let me walk you through the process:

1. Go to [your brand questionnaire link]
2. Answer 5 questions about your style
3. We'll generate your brand kit automatically
4. Download your files (you got this!)

Takes about 5 minutes total.

Check out our guides if you get stuck: [link]

Let me know if you have questions!
```

### Template 2: Regeneration (Use for: "Can I change colors?" "I don't like the logo")
**Trigger:** Customer wants to redo their brand kit
**What it does:** Explains they can regenerate, directs to guides
**Customize:** Ask what they want different
**Example:**
```
Hi [Name],

Great news — you can absolutely regenerate your brand kit!

Here's how: [link to guide]

If you want different colors specifically, the guide shows you
exactly what to click.

You can regenerate as many times as you want until it's perfect.

Any other questions?
```

### Template 3: Files/Export (Use for: "Where are my files?" "Can't download" "Wrong format")
**Trigger:** File access or export issues
**What it does:** Troubleshoots file problems, explains formats
**Customize:** Confirm which format they need
**Example:**
```
Hi [Name],

Let me help you get your files sorted.

First, can you confirm:
1. Did you get the success page with download button?
2. Which format do you need (ZIP, PNG, PDF)?
3. When you try to download, what happens? (Error message, nothing loads, etc.)

Once I know more, I can help!
```

### Template 4: Technical Issues (Use for: "It's broken" "Page won't load" "Error message")
**Trigger:** Technical problems (bugs, crashes, errors)
**What it does:** Collects details, escalates to dev team
**Customize:** Ask for error messages, screenshots
**Example:**
```
Hi [Name],

Sorry you're running into trouble! Let me get this sorted.

To help you faster, can you send:
1. Screenshot of the error (or error message text)
2. What browser are you using? (Chrome, Safari, Firefox, etc.)
3. When did this start? (Right after you started, halfway through, etc.)

Once I have those details, I'll escalate to our team right away.
```

### Template 5: Pricing/Tier (Use for: "What's included?" "Why is it $49?" "Can I upgrade?")
**Trigger:** Pricing questions, tier confusion
**What it does:** Clarifies Basic vs. Premium, explains value
**Customize:** Address their specific tier question
**Example:**
```
Hi [Name],

Great question! Here's what you get:

BASIC ($19):
- Logo
- Color palette
- Typography system

PREMIUM ($49):
- Everything in Basic, PLUS
- Social media templates
- Business card mockups
- Brand guidelines

You can upgrade anytime if you started with Basic.

Which tier fits your needs?
```

### Template 6: Refunds (Use for: "I want a refund" "Can I get money back?")
**Trigger:** Refund requests
**What it does:** Confirms eligibility, explains process
**Customize:** Check purchase date first
**Flow:** See "Handling Refunds" section below

### Template 7: Feature Requests (Use for: "Can you add..." "I wish it could...")
**Trigger:** Customer requests new features
**What it does:** Thanks them, documents request, explains process
**Customize:** Make them feel heard
**Example:**
```
Hi [Name],

Love the idea! We're always looking to improve DIYBrand.

Your request: [feature they asked for]

I'm noting this down and passing it to our product team. We read
every suggestion, and this kind of feedback is how we improve.

In the meantime, here's a workaround you could try: [if applicable]

Thanks for being part of our community!
```

### Template 8: Bulk Orders (Use for: "Can I buy 10 licenses?" "Group discount?")
**Trigger:** Business/bulk purchase inquiries
**What it does:** Acknowledges request, escalates to manager
**Customize:** Get their needs
**Example:**
```
Hi [Name],

Thanks for your bulk order interest! That's awesome.

I'm connecting you with our team lead who handles group deals.
They'll reach out within 24 hours to discuss bulk pricing and
any custom arrangements.

Excited to work with you!
```

---

## Handling Refunds

Refunds are critical — they directly impact customer trust. Follow these steps exactly.

### Refund Eligibility Check

When customer requests refund:

1. **Check purchase date**
   - Look up order in Stripe
   - Is it within 30 days? YES → Process refund
   - Is it over 30 days? → Ask why they waited, then see step 2

2. **Ask why (if not stated)**
   - "I'd love to help! What can we improve?"
   - Common reasons:
     - Product issue (colors wrong, logo low quality)
     - Expectation mismatch (thought it did something it doesn't)
     - No longer needs it
     - Budget constraint

3. **If product issue: Offer help first**
   - "Let me see if we can fix this."
   - "Can you show me what's wrong?"
   - Suggest regenerating with different parameters
   - Only proceed to refund if they still want it after trying fix

4. **If expectation mismatch: Clarify**
   - "It sounds like you expected [X]. We actually [Y]."
   - Check FAQ — is this answered there? Note for improvement
   - Offer help, then refund if they still want

### Refund Process (5 Steps)

**Step 1: Respond within 24 hours**
```
Hi [Name],

Thanks for reaching out. I understand you'd like a refund.
Let me process that for you right away.

Your purchase on [date] for [amount] will be refunded to your
original payment method.

Refunds typically appear in your account within 3-5 business days.
```

**Step 2: Look up order in Stripe**
- Search for customer email
- Find the transaction
- Note the amount and date
- Confirm it's within 30 days

**Step 3: Issue refund in Stripe**
- Click refund button
- Note reason: "Customer refund — [reason]"
- Confirm refund
- Take screenshot (for records)

**Step 4: Send confirmation email**
```
Hi [Name],

Your refund of $[amount] has been processed.

It should appear in your bank account within 3-5 business days
depending on your bank.

If you have any issues, let me know. And if there's anything we
could have done better, I'd love to hear it.

Thanks for trying DIYBrand!
```

**Step 5: Document**
- Add to refund log
- Note reason in support log
- If pattern emerges (multiple people refunding for same reason), flag for product team

### When to Deny a Refund

You can deny a refund if:

- Customer is outside 30-day window AND
  - They waited weeks to ask (not a sudden issue)
  - There's no obvious product problem

In this case:
```
Hi [Name],

I see your purchase was [40 days ago]. Our refund guarantee is
30 days from purchase, and yours is outside that window.

That said, I want to help. What's the issue you're experiencing?
If there's a problem with the product itself, I'd like to fix it.

Can you tell me more?
```

---

## Escalation Procedures

Some emails need to go to other teams. Know when and how.

### When to Escalate

| Issue | Escalate To | How |
|-------|-------------|-----|
| **Customer can't export/download** | Atlas (DevOps) | Create GitHub issue: "Customer [name] can't export" |
| **Colors wrong, low quality logo** | Dev team | Note: Possible AI generation issue |
| **Payment won't process** | Atlas (Stripe integration) | Check Stripe error, create issue |
| **Website down / 404 errors** | Atlas (DevOps) | Alert manager immediately |
| **Data privacy / security issue** | CEO + Atlas | Alert immediately |
| **Feature request (common)** | Product team | Create feature request issue |
| **Bug that's reproducible** | Dev team | Create GitHub issue with steps |

### How to Escalate

1. **Create a GitHub Issue** (for technical issues)
   ```
   Title: [SUPPORT] Customer can't export files

   Labels: support, bug, customer-blocking

   Body:
   Customer: [Name]
   Email: [Their email]
   Purchased: [Date]
   Tier: Basic/Premium

   Issue: Customer can't download their brand kit. Getting error: [error message]

   Steps to reproduce:
   1. Purchase Basic tier
   2. Complete questionnaire
   3. Click download → Error

   Environment:
   - Browser: Chrome
   - OS: Mac

   Support thread: [link to email]
   ```

2. **Post in Slack/Discord**
   ```
   @Atlas - Customer escalation

   Issue: Payment won't process on checkout
   Customer: [name]
   Ticket: [link]

   Waiting on: Stripe integration check
   ```

3. **If critical (website down, data breach)**
   ```
   Alert manager immediately, then create issue
   ```

---

## Weekly Workflow

Every Friday or Monday, do this:

### 1. FAQ Gap Review (30 minutes)

Take the list of "FAQ gaps found this week":

```
FAQ Gaps Found This Week:
- Q: Can I regenerate after refund? A: Add to FAQ
- Q: What export formats? A: Clarify in guides
- Q: Can I use fonts commercially? A: Add to FAQ
```

For each gap:

1. **Ask yourself:** Should this be in FAQ or Guides?
   - "How do I...?" → Guides
   - "Can I...?" → FAQ
   - "What's..." → FAQ

2. **Write the Q&A**
   - Q: [Customer's exact question]
   - A: [Clear, non-technical answer]

3. **Suggest to Echo** (Customer Success Lead)
   - "Found these FAQ gaps this week"
   - Echo updates FAQ

4. **Note:** Next time someone asks this, you can link to the FAQ answer

### 2. Support Email Tally (10 minutes)

Log this to a spreadsheet:

```
Week of 3/17-3/23:
Monday:    2 emails
Tuesday:   1 email
Wednesday: 3 emails
Thursday:  1 email
Friday:    2 emails
Total:     9 emails
Target:    <5/week
Status:    ⚠️ Over target

Issues found:
- 2 regeneration questions (guide unclear?)
- 1 refund request (customer outside 30 days)
- 1 payment error (escalated to Atlas)
```

Report to manager: "9 emails this week, mostly regeneration questions."

### 3. Feedback Rating Check (10 minutes)

Look at feedback submitted this week:

```
Feedback Summary:
Total submissions: 12
Avg rating: 4.6 stars ✓
Highest: 5 stars - "Perfect colors!"
Lowest: 2 stars - "Logo felt generic"

Comments themes:
- Positive: Love the speed (3 mentions)
- Issue: Colors sometimes feel corporate (2 mentions)
- Suggestion: Want more style options (1 mention)
```

Report to manager: "Feedback avg 4.6, customers love the speed."

### 4. Product Issues Found (15 minutes)

Review the week's emails and feedback for bugs:

```
Product Issues This Week:
1. Logo generation producing blurry output (1 report)
   → Create GitHub issue, escalate to dev
2. Export function timing out for Premium tier (1 report)
   → Create GitHub issue, mark high priority
3. Questionnaire logic glitch on mobile (mentioned in feedback)
   → Note for QA to test
```

Create GitHub issues for dev team, link in Slack.

---

## Best Practices & Philosophy

### The Zero-Ticket Philosophy

Remember: **Every support email is a documentation failure.**

This doesn't mean it's YOUR fault — it means WE (support + product) need to fix it so it stops happening.

When you get a question:

1. Answer the email (customer comes first)
2. Ask yourself: Why didn't they find this in FAQ/guides?
3. Fix the documentation (FAQ or guides)
4. Next customer who has same question finds the answer

Example flow:
```
Email: "How do I change colors?"
Answer: [Send template with guide link]
Think: "Why didn't they find the regeneration guide?"
Improve: Maybe the guide title is confusing? Rename it?
Result: Next customer finds answer instantly
```

### Tone of Voice

Your emails should be:
- **Friendly:** "Love the question!" not "See section 3.2"
- **Clear:** Use simple words, short sentences
- **Helpful:** Link to resources, don't just say "check the FAQ"
- **Human:** Sign with your name, be real

Bad example:
```
User: Can I change the colors?
Bad response: "Refer to section 4.1.2 of documentation"
```

Good example:
```
User: Can I change the colors?
Good response: "Absolutely! Here's how to regenerate with different
colors: [link to guide]

Takes 2 minutes. Let me know if the new colors work better!"
```

### Response Time Targets

- **First response:** Within 4 hours (ideal: <2 hours)
- **Follow-up:** Within 24 hours
- **Refund:** Processed within 24 hours
- **Escalation:** Noted within 2 hours

These aren't hard rules — life happens. But aim for these.

### When You Get Frustrated

You will get emails that test your patience:
- Angry customers
- Repeated questions you've already answered
- Unreasonable demands
- Blaming you for product issues

What to do:

1. **Take a break** — Don't respond in the moment
2. **Read it once more** — Sometimes tone doesn't come through
3. **See the person** — They're frustrated, not at you personally
4. **Use templates** — They keep you professional
5. **Ask for help** — If it's too much, escalate to manager

Example:
```
Angry email: "This product is USELESS. I want my money back NOW!"

Don't: Defend the product
Do: Acknowledge frustration
    "I understand this is frustrating. Let me help."
    Then follow refund process
```

### When You Make a Mistake

You will:
- Send the wrong template
- Misunderstand an email
- Give wrong information
- Forget to follow up

What to do:
1. Acknowledge it: "I think I mixed this up"
2. Clarify: "Let me give you the right answer"
3. Fix it: "Here's what you should do"
4. Don't over-apologize

Example:
```
You said: "Refunds take 3-5 days"
Actually: "Refunds take 5-7 business days"

Do: "I apologize — I gave you the wrong timeframe.
    Refunds actually take 5-7 business days to appear in your
    account. Yours was processed [date], so you should see it
    by [date]. Let me know if it doesn't show up!"
```

### When to Ask for Help

Ask your manager if:
- Customer is threatening legal action
- Customer is angry (multiple exclamation marks, caps)
- You don't know the answer after checking FAQ/guides
- Refund is outside 30 days and complicated
- Product issue seems critical (website down, data breach)
- You're not sure which template to use

---

## Systems & Tools Reference

### Key Links (Bookmark These)

```
FAQ: https://diybrand.app/faq
Guides: https://diybrand.app/guides
Refund Policy: https://diybrand.app/refund-policy
Privacy Policy: https://diybrand.app/privacy
Terms: https://diybrand.app/terms

Support Email: support@diybrand.app
Stripe Dashboard: [link - ask ops]
GitHub Issues: [link - ask ops]
Slack/Discord: [link - ask ops]
```

### Documents to Keep Nearby

```
1. SUPPORT-TEMPLATES.md — Your 8 email templates
2. CUSTOMER-SUCCESS-OPERATIONS-GUIDE.md — Procedures
3. CUSTOMER-SUCCESS-STRATEGY.md — Philosophy
4. LAUNCH-COMMUNICATIONS.md — Context on what was announced
5. This document — Your training guide
```

### Key Contacts

```
Manager/Lead: [Name] - Questions about procedures
Echo (Customer Success): @Echo in Slack - FAQ updates
Product Team: [Slack channel] - Feature requests
Atlas (DevOps): [Slack channel] - Technical escalations
CEO: [Name] - Critical issues only
```

---

## Your First Week Checklist

- [ ] Day 1: Get email access, read this guide
- [ ] Day 1: Set up 8 saved reply templates
- [ ] Day 2: Read FAQ top-to-bottom (really read it)
- [ ] Day 2: Read all 6 guides
- [ ] Day 2: Practice with 1-2 test support emails
- [ ] Day 3: Handle your first real support email with manager nearby
- [ ] Day 3: Process a test refund with manager
- [ ] Day 4-5: Handle 3-5 emails independently
- [ ] Friday: Do first weekly FAQ gap review

---

## Success Looks Like

After 2 weeks, you should be able to:

✅ Respond to 80% of support emails using templates + FAQ links
✅ Identify FAQ gaps and document them
✅ Process refunds correctly and within 24 hours
✅ Escalate technical issues to the right team
✅ Maintain friendly, helpful tone in every email
✅ Keep response times under 4 hours

After 1 month, you should:

✅ Be the FAQ expert (answer from memory most questions)
✅ Identify patterns (same question = FAQ needs update)
✅ Help improve guides based on customer confusion
✅ Mentor new support hires

---

## Questions?

This is a lot to take in. That's normal.

When you're unsure:
1. **Check the FAQ** — Answers are there
2. **Check this guide** — Procedures are documented
3. **Ask your manager** — They want to help
4. **Ask @Echo** — Customer success lead, always available

Welcome to the team! 🎉

---

**Last Updated:** 2026-03-20
**Status:** Ready for Support Team Onboarding
**Questions?** @Echo in Paperclip
