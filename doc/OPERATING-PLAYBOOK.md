# Operating Playbook

Status: canonical operating model for a lean, Alibaba-first Paperclip company.

This file defines the default company template you should run in Paperclip today.
It is opinionated by design. The goal is not to model every org chart; the goal is
to standardize one setup that is practical, reliable, and easy to supervise.

Paperclip should currently be operated as a controlled autonomous company:

- work opens through the CEO
- planning is delegated to the C-suite
- PM dispatches execution
- specialists execute against assigned issues
- QA verifies
- Release/Ops prepares rollout
- the board intervenes only at checkpoints

Use this playbook together with:

- `doc/AGENT-ROLE-TEMPLATES.md`
- `doc/MODEL-ROUTING-PROFILES.md`

## 1) Default Company Template

Paperclip's default operating company is a lean 8-role team:

1. CEO
2. CTO
3. CPO
4. CSO
5. PM
6. Builder Engineer
7. QA Engineer
8. Release/Ops

This is the required starting team for reliable operation.

Do not start with a large org chart. Dedicated Frontend, Backend, Designer, DevOps,
or Security IC roles are phase-2 expansion roles after the lean template is stable.

Why this is the default:

- it keeps ownership clear
- it reduces assignment ambiguity
- it makes reviews and escalations legible
- it matches Paperclip's current assignee-based execution model

## 2) Primary Workflow

The canonical workflow is:

`Board/User -> CEO -> CTO/CPO/CSO -> PM -> Specialists -> QA/Ops -> Board`

Interpretation:

- the board sets direction
- the CEO owns intake, prioritization, and final internal synthesis
- the CTO, CPO, and CSO shape the plan in their own lanes
- the PM converts the approved plan into executable issues
- the Builder Engineer executes the implementation work
- QA validates behavior and evidence
- Release/Ops packages and prepares rollout
- the board approves only at defined checkpoints

## 3) CEO-First Intake Flow

This is the required default way to start a project or major initiative.

1. You give the CEO a project issue or goal.
2. The CEO clarifies desired outcome, constraints, and success criteria.
3. The CEO requests planning from:
   - CTO for architecture, sequencing, and execution strategy
   - CPO for scope, UX, acceptance criteria, and user impact
   - CSO for security, compliance, and risk gates
4. The CEO consolidates those inputs into one execution plan.
5. The PM decomposes that plan into execution issues with owners, touch lists, and done criteria.
6. The Builder Engineer executes assigned work.
7. QA verifies the outcome against acceptance criteria and evidence.
8. Release/Ops prepares rollout notes, checks, and rollback steps.
9. You approve only at board checkpoints.

This is the default path because it keeps one intake point and one coherent plan.

## 4) Direct C-Suite Interaction

You may still talk directly to CTO, CPO, or CSO during execution.

That is useful when:

- you want a technical opinion from CTO
- you want product or UX refinement from CPO
- you want a security or risk call from CSO

These are lane-specific interventions. They do not replace the CEO-first intake path.
If the intervention changes scope, priority, or company direction, route it back through
the CEO so the operating plan stays coherent.

## 5) Role Of The Board Operator

You are the board operator, not the day-to-day task coordinator.

You are responsible for:

- setting company goals and project priorities
- providing missing business context
- answering escalations
- approving risky, destructive, or release-critical actions
- accepting or rejecting final outcomes

You are not expected to:

- manually decompose normal execution work
- assign every engineer task yourself
- supervise each heartbeat
- replace CTO, CPO, or CSO lane decisions during normal flow

Board checkpoints should stay explicit. The board should intervene when:

- the CEO needs a strategic tradeoff decision
- the CTO or CSO escalates material technical or security risk
- the PM reports a blocker that changes timeline or scope
- Release/Ops requests approval for a production-affecting release
- QA reports a repeated failure pattern or unresolved acceptance gap

## 6) Interaction Guide

Use this default interaction pattern:

- Talk to `CEO` for new initiatives, reprioritization, company direction, and project kickoff.
- Talk to `CTO` for technical planning, architecture, execution sequencing, or engineering risk.
- Talk to `CPO` for product framing, UX direction, and acceptance-quality questions.
- Talk to `CSO` for security, compliance, privacy, and risk decisions.
- Talk to `PM` only when execution tracking or sequencing needs correction.

Operational rule:

- if the conversation changes company direction, go to CEO
- if the conversation changes execution mechanics inside a lane, go to the relevant C-suite owner

## 7) Responsibility Map

### CEO

- Owns intake, prioritization, and final internal plan approval.
- Does not implement or verify code.

### CTO

- Owns technical decomposition, architecture, sequencing, and execution risk management.
- Does not bypass PM for routine issue dispatch once the plan is approved.

### CPO

- Owns product scope, user journey quality, acceptance criteria, and UX tradeoffs.
- Does not own engineering rollout decisions.

### CSO

- Owns risk review, security gates, data sensitivity, and approval requirements for risky work.
- Does not take over product prioritization.

### PM

- Owns issue decomposition, owner assignment, tracking, and handoff quality.
- Does not redefine company strategy.

### Builder Engineer

- Owns implementation on assigned issues.
- Must stay inside touch list and report evidence, blockers, and residual risk.

### QA Engineer

- Owns verification, regression detection, and acceptance confirmation.
- Must reject incomplete evidence and return issues with reproducible diagnostics.

### Release/Ops

- Owns release packaging, rollout readiness, rollback preparation, and environment checks.
- Must not push destructive or production-affecting changes without approval.

## 8) Operating Rules

These rules are non-negotiable for this company template:

- every issue has exactly one active owner
- every issue must have acceptance criteria before execution
- every completed issue must carry evidence
- no destructive action happens without explicit approval
- no silent scope change is acceptable
- no secret should be guessed, fabricated, or written into plaintext config
- QA is the default verification gate before release preparation
- release approval belongs to the board, not the implementation role

## 9) Paperclip Setup Guidance

Configure the company in this order:

1. Create the 8 default agents.
2. Assign reporting lines:
   - CTO, CPO, CSO, and PM report to CEO
   - Builder Engineer reports to CTO
   - QA Engineer reports to PM
   - Release/Ops reports to CTO or CEO, depending on how centralized you want release approval prep
3. Set Alibaba Cloud as the primary provider for compatible process agents.
4. Apply role-specific model routing from `doc/MODEL-ROUTING-PROFILES.md`.
5. Apply role prompts from `doc/AGENT-ROLE-TEMPLATES.md`.
6. Enable heartbeat only after prompts, models, and runtime config are all validated.
7. Run one canary project before broadening to more work.

## 10) How A Project Starts

When you want to create or run a project:

1. Open the project or goal issue with the CEO.
2. The CEO translates it into an execution objective.
3. The CEO requests planning from CTO, CPO, and CSO.
4. The CEO confirms the final plan.
5. PM creates the work breakdown.
6. Specialists execute and move work through verification.
7. QA confirms the work is actually done.
8. Release/Ops prepares rollout.
9. You approve, reject, or redirect at the board checkpoint.

Your job is not to manually orchestrate every handoff. Your job is to keep the company
pointed at the right objective and make the decisions that require human authority.

## 11) Definition Of Operational Success

This company is being run correctly when:

- new work reliably starts through the CEO
- planning is consolidated before execution begins
- PM-created issues have owners, touch lists, and done criteria
- the Builder Engineer only executes assigned work
- QA verifies before release prep
- Release/Ops packages with a rollback path
- the board is involved at checkpoints, not in every heartbeat

## 12) Limits Of This Playbook

This playbook is optimized for controlled operating use, not unrestricted autonomous scale.

Treat this company model as:

- suitable for real pilot work
- suitable for small-to-medium delivery flow
- suitable for one project or a small number of active projects

Do not treat it as proof that Paperclip should run a large autonomous org without supervision.
Expand only after the lean 8-role template is stable, observable, and producing reliable outcomes.
