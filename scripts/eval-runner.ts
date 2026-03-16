#!/usr/bin/env bun

/**
 * Skill eval runner. Tests trigger accuracy and output quality.
 *
 * Usage:
 *   bun run scripts/eval-runner.ts <skill-path>
 *   bun run scripts/eval-runner.ts skills/agent-building/autonomous-agent/SKILL.md
 *   bun run scripts/eval-runner.ts --all              # Run all skills
 *   bun run scripts/eval-runner.ts --compare <skill>  # Compare latest vs previous
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { join, dirname, basename } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SkillMeta {
  name: string;
  description: string;
}

interface TriggerTest {
  id: string;
  prompt: string;
  expected: "TRIGGER" | "NO_TRIGGER";
}

interface OutputTest {
  id: string;
  scenario: string;
  assertion: string;
}

interface TestSuite {
  triggerTests: TriggerTest[];
  noFireTests: TriggerTest[];
  outputTests: OutputTest[];
}

interface TestResult {
  id: string;
  prompt?: string;
  scenario?: string;
  expected?: string;
  pass: boolean;
  score?: number;
  reason: string;
}

interface ScoreGroup {
  pass: number;
  fail: number;
  total: number;
  pct: number;
}

interface EvalResult {
  skill: string;
  date: string;
  version: string;
  scores: {
    trigger: ScoreGroup;
    noFire: ScoreGroup;
    output: ScoreGroup;
  };
  overall: number;
  failures: TestResult[];
  duration_ms: number;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function parseSkillMeta(content: string): SkillMeta {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    throw new Error("No frontmatter found in SKILL.md");
  }
  const fm = frontmatterMatch[1];
  const nameMatch = fm.match(/^name:\s*(.+)$/m);
  const descMatch = fm.match(/^description:\s*([\s\S]*?)(?=\n\w|$)/m);
  return {
    name: nameMatch ? nameMatch[1].trim() : "unknown",
    description: descMatch ? descMatch[1].replace(/\n\s+/g, " ").trim() : "",
  };
}

function parseTestCases(content: string): TestSuite {
  const triggerTests: TriggerTest[] = [];
  const noFireTests: TriggerTest[] = [];
  const outputTests: OutputTest[] = [];

  const lines = content.split("\n");
  let section: "trigger" | "nofire" | "output" | "boundary" | null = null;
  let currentOutputScenario = "trigger scenario";

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect section headers (various formats used across skills)
    // Check no-fire BEFORE trigger — "No-Trigger Tests" also contains "Trigger Tests"
    if (/(no[-\s]?(fire|trigger)\s*tests?)/i.test(trimmed) && trimmed.startsWith("#")) {
      section = "nofire";
      continue;
    }
    if (/^#+\s*(trigger\s*tests?)/i.test(trimmed)) {
      section = "trigger";
      continue;
    }
    if (/output\s*(tests?|assertions?)/i.test(trimmed) && trimmed.startsWith("#")) {
      section = "output";
      continue;
    }
    if (/boundary\s*cases?/i.test(trimmed) && trimmed.startsWith("#")) {
      section = "boundary";
      continue;
    }

    // Capture sub-header scenario labels in output section (e.g. "**T1 — Worktree setup:**")
    if (section === "output" && /^\*\*[^*]+\*\*/.test(trimmed)) {
      currentOutputScenario = trimmed.replace(/\*\*/g, "").replace(/:$/, "").trim();
      continue;
    }

    // Handle checklist-format output assertions (e.g. "- [ ] Some assertion")
    if (section === "output" && /^-\s*\[[ x]\]/.test(trimmed)) {
      const assertion = trimmed.replace(/^-\s*\[[ x]\]\s*/, "").trim();
      if (assertion.length > 0) {
        const id = `O${outputTests.length + 1}`;
        outputTests.push({ id, scenario: currentOutputScenario || "trigger scenario", assertion });
      }
      continue;
    }

    // Skip table headers and separator rows
    if (trimmed.startsWith("|") && (trimmed.includes("---") || trimmed.toLowerCase().includes("prompt") || trimmed.toLowerCase().includes("scenario"))) {
      continue;
    }

    // Parse table rows
    if (!trimmed.startsWith("|")) continue;

    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (cells.length < 2) continue;

    if (section === "trigger") {
      // Columns: # | Prompt | Expected [| Confidence/Assertion]
      // Expected values: "TRIGGER", "YES", "HIGH", "MEDIUM", or negatives "NO", "NO TRIGGER"
      if (cells.length >= 3) {
        const id = cells[0];
        const prompt = cells[1].replace(/^"|"$/g, "");
        const expectedRaw = cells[2].toUpperCase();
        const isTrigger =
          expectedRaw.includes("TRIGGER") ||
          expectedRaw === "YES" ||
          expectedRaw.includes("HIGH") ||
          expectedRaw.includes("MEDIUM");
        const isNoTrigger =
          (expectedRaw.includes("NO") && !expectedRaw.includes("HIGH")) ||
          expectedRaw.includes("FIRE") ||
          expectedRaw === "NO";
        const expected: "TRIGGER" | "NO_TRIGGER" = isTrigger && !isNoTrigger ? "TRIGGER" : "NO_TRIGGER";
        if (prompt && id && !id.toLowerCase().includes("#")) {
          triggerTests.push({ id, prompt, expected });
        }
      }
    } else if (section === "nofire") {
      // Columns: # | Prompt | Expected [| Reason]
      if (cells.length >= 3) {
        const id = cells[0];
        const prompt = cells[1].replace(/^"|"$/g, "");
        if (prompt && id && !id.toLowerCase().includes("#")) {
          noFireTests.push({ id, prompt, expected: "NO_TRIGGER" });
        }
      }
    } else if (section === "output") {
      // Columns: # | Scenario/Test Case | Assertion/Expected Output
      if (cells.length >= 3) {
        const id = cells[0];
        const scenario = cells[1];
        const assertion = cells[2];
        if (scenario && id && !id.toLowerCase().includes("#")) {
          outputTests.push({ id, scenario, assertion });
        }
      }
    } else if (section === "boundary") {
      // Boundary cases: treat TRIGGER rows as trigger tests, NO FIRE as no-fire
      if (cells.length >= 3) {
        const id = cells[0];
        const prompt = cells[1].replace(/^"|"$/g, "");
        const expectedRaw = cells[2].toUpperCase();
        if (prompt && id && !id.toLowerCase().includes("#")) {
          if (expectedRaw.includes("TRIGGER") && !expectedRaw.includes("NO")) {
            triggerTests.push({ id: `B-${id}`, prompt, expected: "TRIGGER" });
          } else if (expectedRaw.includes("NO") || expectedRaw.includes("FIRE")) {
            noFireTests.push({ id: `B-${id}`, prompt, expected: "NO_TRIGGER" });
          }
          // MAY FIRE = skip (ambiguous, don't count either way)
        }
      }
    }
  }

  return { triggerTests, noFireTests, outputTests };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Keyword overlap between two strings.
 * Returns a value 0.0–1.0.
 */
function keywordOverlap(a: string, b: string): number {
  const stopwords = new Set([
    "a", "an", "the", "is", "in", "of", "for", "to", "and", "or", "how",
    "do", "i", "my", "me", "this", "that", "with", "want", "set", "up",
    "can", "what", "help", "get", "make", "use", "it", "its", "by",
  ]);

  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopwords.has(w));

  const wordsA = new Set(tokenize(a));
  const wordsB = new Set(tokenize(b));
  const intersection = [...wordsA].filter((w) => wordsB.has(w));

  if (wordsA.size === 0) return 0;
  return intersection.length / wordsA.size;
}

/**
 * Score a trigger test: does the skill description suggest it would fire?
 * Returns pass=true if confidence ≥ 60 and description clearly covers the intent.
 */
function scoreTriggerTest(test: TriggerTest, description: string): TestResult {
  const promptLower = test.prompt.toLowerCase();

  // --- Extract structured sections from description ---

  // NOT-for clause (after "NOT for:" to end of string or next sentence)
  const notForMatch = description.match(/NOT\s+for:\s*([^.]+(?:\.[^T])?)/i);
  const notForText = notForMatch ? notForMatch[1].toLowerCase() : "";

  // Trigger phrases (between "Triggers on:" and "NOT for:")
  const triggersSection = description.split(/NOT\s+for:/i)[0];
  const triggersMatch = triggersSection.match(/Triggers?\s+on:\s*([\s\S]+)/i);
  const triggerPhrases = triggersMatch
    ? triggersMatch[1]
        .split(/[,"]+/)
        .map((t) => t.trim().replace(/^"|"$/g, "").toLowerCase())
        .filter((t) => t.length > 3)
    : [];

  // --- Check explicit trigger phrases ---
  const exactTriggerMatch = triggerPhrases.some((phrase) =>
    promptLower.includes(phrase)
  );

  // --- Check explicit NOT-for exclusions ---
  // Generic terms that appear in nearly all Claude Code skill prompts — skip for exclusion matching
  const exclusionStopwords = new Set([
    "a", "an", "the", "for", "of", "and", "or", "to", "in",
    "claude", "code", "set", "setup", "configure", "config", "how", "what",
    "use", "using", "with", "build", "create", "make",
  ]);
  const excludedPhrases = notForText
    .split(/[,;]|\bor\b/)
    .map((t) => t.trim().replace(/[^a-z0-9\s-]/g, "").trim())
    .filter((t) => t.length > 3);
  const isExcluded = excludedPhrases.some((phrase) => {
    const phraseWords = phrase
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !exclusionStopwords.has(w));
    if (phraseWords.length === 0) return false;
    const matchingWords = phraseWords.filter((w) => promptLower.includes(w));
    // Need: 2+ words matching from phrase, OR one very specific word (8+ chars)
    // This prevents single common words like "mcp" triggering exclusion across unrelated prompts
    const hasVerySpecificMatch = matchingWords.some((w) => w.length >= 8);
    const hasDoubleMatch = matchingWords.length >= 2;
    return hasVerySpecificMatch || hasDoubleMatch;
  });

  // --- Keyword overlap against the full description ---
  const overlap = keywordOverlap(promptLower, description.toLowerCase());

  // --- Compute confidence ---
  let confidence: number;
  if (isExcluded) {
    confidence = 15;
  } else if (exactTriggerMatch) {
    confidence = 92;
  } else if (overlap >= 0.6) {
    // High overlap but no explicit trigger phrase — cautious score
    confidence = 65;
  } else if (overlap >= 0.35) {
    confidence = 55;
  } else if (overlap >= 0.2) {
    confidence = 40;
  } else {
    confidence = 20;
  }

  const wouldFire = confidence >= 60;
  const expectedFire = test.expected === "TRIGGER";
  const pass = wouldFire === expectedFire;

  let reason: string;
  if (isExcluded) {
    reason = `Prompt matches NOT-for exclusion (confidence ${confidence})`;
  } else if (exactTriggerMatch) {
    reason = `Exact trigger phrase match (confidence ${confidence})`;
  } else {
    reason = `Keyword overlap ${(overlap * 100).toFixed(0)}% (confidence ${confidence})`;
  }

  return {
    id: test.id,
    prompt: test.prompt,
    expected: test.expected,
    pass,
    score: confidence,
    reason,
  };
}

/**
 * Score an output test: does the skill content cover the assertion?
 * Heuristic: keyword overlap between skill content and the assertion.
 */
function scoreOutputTest(test: OutputTest, skillContent: string): TestResult {
  const contentLower = skillContent.toLowerCase();
  const assertionLower = test.assertion.toLowerCase();
  const scenarioLower = test.scenario.toLowerCase();

  // Extract key terms from assertion
  const assertionOverlap = keywordOverlap(assertionLower, contentLower);
  const scenarioOverlap = keywordOverlap(scenarioLower, contentLower);

  // Check for explicit reference to sub-files (treat as covered)
  const referencesSubFile =
    contentLower.includes("references/") || contentLower.includes("see `references");

  // Combine signals
  const combinedScore = (assertionOverlap * 0.6 + scenarioOverlap * 0.4) * 10;
  const adjustedScore = referencesSubFile ? Math.min(combinedScore + 1.5, 10) : combinedScore;

  // Completeness, accuracy, actionability — all derived from content coverage
  const completeness = Math.min(Math.round(adjustedScore), 10);
  const accuracy = Math.min(Math.round(adjustedScore * 0.9 + 1), 10);
  const actionability = contentLower.includes("```")
    ? Math.min(Math.round(adjustedScore * 0.8 + 1.5), 10)
    : Math.min(Math.round(adjustedScore * 0.7), 10);

  const avg = (completeness + accuracy + actionability) / 3;
  const pass = avg >= 7.0;

  return {
    id: test.id,
    scenario: test.scenario,
    pass,
    score: Math.round(avg * 10) / 10,
    reason: pass
      ? `Coverage score ${avg.toFixed(1)}/10`
      : `Low coverage: assertion overlap ${(assertionOverlap * 100).toFixed(0)}%, score ${avg.toFixed(1)}/10`,
  };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

function findTestCasesPath(skillPath: string): string | null {
  const skillDir = dirname(skillPath);
  const candidates = [
    join(skillDir, "references", "test-cases.md"),
    join(skillDir, "references", "test.md"),
    join(skillDir, "test-cases.md"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

function scoreGroup(results: TestResult[]): ScoreGroup {
  const pass = results.filter((r) => r.pass).length;
  const total = results.length;
  return {
    pass,
    fail: total - pass,
    total,
    pct: total === 0 ? 100 : Math.round((pass / total) * 100),
  };
}

/**
 * Load the full skill package: SKILL.md + all reference files + all workflow files.
 * This gives output scoring access to the complete content, not just the router.
 */
function loadFullSkillContent(skillPath: string): string {
  const skillDir = dirname(skillPath);
  let content = readFileSync(skillPath, "utf-8");

  // Append reference files
  const refsDir = join(skillDir, "references");
  if (existsSync(refsDir)) {
    const refFiles = readdirSync(refsDir)
      .filter((f: string) => f.endsWith(".md") && !f.startsWith("test-"))
      .sort();
    for (const refFile of refFiles) {
      content += `\n\n${readFileSync(join(refsDir, refFile), "utf-8")}`;
    }
  }

  // Append workflow files
  const workflowsDir = join(skillDir, "Workflows");
  if (existsSync(workflowsDir)) {
    const wfFiles = readdirSync(workflowsDir)
      .filter((f: string) => f.endsWith(".md"))
      .sort();
    for (const wfFile of wfFiles) {
      content += `\n\n${readFileSync(join(workflowsDir, wfFile), "utf-8")}`;
    }
  }

  return content;
}

function runEval(skillPath: string): EvalResult {
  const start = Date.now();

  const fullSkillPath = skillPath.startsWith("/")
    ? skillPath
    : join(process.cwd(), skillPath);

  if (!existsSync(fullSkillPath)) {
    throw new Error(`Skill file not found: ${fullSkillPath}`);
  }

  const skillContent = readFileSync(fullSkillPath, "utf-8");
  const fullContent = loadFullSkillContent(fullSkillPath);
  const meta = parseSkillMeta(skillContent);

  const testCasesPath = findTestCasesPath(fullSkillPath);
  if (!testCasesPath) {
    throw new Error(`No test-cases.md found for skill: ${fullSkillPath}`);
  }

  const testContent = readFileSync(testCasesPath, "utf-8");
  const suite = parseTestCases(testContent);

  // Score all tests
  const triggerResults: TestResult[] = suite.triggerTests.map((t) =>
    scoreTriggerTest(t, meta.description)
  );
  const noFireResults: TestResult[] = suite.noFireTests.map((t) =>
    scoreTriggerTest(t, meta.description)
  );
  // Output tests score against full skill package (SKILL.md + references + workflows)
  const outputResults: TestResult[] = suite.outputTests.map((t) =>
    scoreOutputTest(t, fullContent)
  );

  const triggerScore = scoreGroup(triggerResults);
  const noFireScore = scoreGroup(noFireResults);
  const outputScore = scoreGroup(outputResults);

  const totalTests = triggerScore.total + noFireScore.total + outputScore.total;
  const totalPass = triggerScore.pass + noFireScore.pass + outputScore.pass;
  const overall = totalTests === 0 ? 100 : Math.round((totalPass / totalTests) * 100);

  const failures = [
    ...triggerResults.filter((r) => !r.pass),
    ...noFireResults.filter((r) => !r.pass),
    ...outputResults.filter((r) => !r.pass),
  ];

  return {
    skill: meta.name,
    date: new Date().toISOString().slice(0, 10),
    version: "1.0.0",
    scores: {
      trigger: triggerScore,
      noFire: noFireScore,
      output: outputScore,
    },
    overall,
    failures,
    duration_ms: Date.now() - start,
  };
}

function saveResult(result: EvalResult, repoRoot: string): string {
  const dir = join(repoRoot, "skills", "evals", "results", result.skill);
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, `${result.date}.json`);
  writeFileSync(filePath, JSON.stringify(result, null, 2));
  return filePath;
}

function printResult(result: EvalResult): void {
  const { scores, overall, failures, skill, date } = result;
  console.log(`\n== ${skill} (${date}) ==`);
  console.log(`  Trigger:  ${scores.trigger.pass}/${scores.trigger.total} (${scores.trigger.pct}%)`);
  console.log(`  No-fire:  ${scores.noFire.pass}/${scores.noFire.total} (${scores.noFire.pct}%)`);
  console.log(`  Output:   ${scores.output.pass}/${scores.output.total} (${scores.output.pct}%)`);
  console.log(`  Overall:  ${overall}%`);
  if (failures.length > 0) {
    console.log(`\n  Failures:`);
    for (const f of failures) {
      const desc = f.prompt ?? f.scenario ?? "";
      console.log(`    [${f.id}] ${desc.slice(0, 60)} — ${f.reason}`);
    }
  }
  console.log(`  Done in ${result.duration_ms}ms\n`);
}

// ---------------------------------------------------------------------------
// Compare mode
// ---------------------------------------------------------------------------

function compare(skillName: string, repoRoot: string): void {
  const dir = join(repoRoot, "skills", "evals", "results", skillName);
  if (!existsSync(dir)) {
    console.error(`No results found for skill: ${skillName}`);
    process.exit(1);
  }

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();

  if (files.length < 2) {
    console.log(`Only ${files.length} result(s) found for ${skillName}. Need at least 2 to compare.`);
    return;
  }

  const current: EvalResult = JSON.parse(readFileSync(join(dir, files[0]), "utf-8"));
  const previous: EvalResult = JSON.parse(readFileSync(join(dir, files[1]), "utf-8"));

  const delta = (curr: number, prev: number): string => {
    const diff = curr - prev;
    if (diff === 0) return "(=)";
    return diff > 0 ? `(+${diff}%)` : `(${diff}%)`;
  };

  console.log(`\n${skillName}: v${previous.version} (${previous.date}) → v${current.version} (${current.date})`);
  console.log(`  Trigger:  ${previous.scores.trigger.pct}% → ${current.scores.trigger.pct}% ${delta(current.scores.trigger.pct, previous.scores.trigger.pct)}`);
  console.log(`  No-fire:  ${previous.scores.noFire.pct}% → ${current.scores.noFire.pct}% ${delta(current.scores.noFire.pct, previous.scores.noFire.pct)}`);
  console.log(`  Output:   ${previous.scores.output.pct}% → ${current.scores.output.pct}% ${delta(current.scores.output.pct, previous.scores.output.pct)}`);
  console.log(`  Overall:  ${previous.overall}% → ${current.overall}% ${delta(current.overall, previous.overall)}`);

  const prevFailIds = new Set(previous.failures.map((f) => f.id));
  const currFailIds = new Set(current.failures.map((f) => f.id));

  const fixed = previous.failures.filter((f) => !currFailIds.has(f.id));
  const regressed = current.failures.filter((f) => !prevFailIds.has(f.id));

  if (fixed.length > 0) {
    console.log(`\n  Fixed:`);
    for (const f of fixed) {
      const desc = f.prompt ?? f.scenario ?? "";
      console.log(`    [${f.id}] ${desc.slice(0, 70)}`);
    }
  }
  if (regressed.length > 0) {
    console.log(`\n  Regressions:`);
    for (const f of regressed) {
      const desc = f.prompt ?? f.scenario ?? "";
      console.log(`    [${f.id}] ${desc.slice(0, 70)} — ${f.reason}`);
    }
  }
  if (fixed.length === 0 && regressed.length === 0) {
    console.log(`\n  No regressions. No new fixes.`);
  }
  console.log();
}

// ---------------------------------------------------------------------------
// All-skills mode
// ---------------------------------------------------------------------------

function findAllSkills(repoRoot: string): string[] {
  const base = join(repoRoot, "skills", "agent-building");
  if (!existsSync(base)) return [];
  return readdirSync(base)
    .map((name) => join(base, name, "SKILL.md"))
    .filter((p) => existsSync(p));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const repoRoot = process.cwd();

if (args.length === 0) {
  console.log(`Usage:
  bun run scripts/eval-runner.ts <skill-path>
  bun run scripts/eval-runner.ts --all
  bun run scripts/eval-runner.ts --compare <skill-name>`);
  process.exit(0);
}

if (args[0] === "--compare") {
  const skillName = args[1];
  if (!skillName) {
    console.error("Usage: eval-runner.ts --compare <skill-name>");
    process.exit(1);
  }
  compare(skillName, repoRoot);
} else if (args[0] === "--all") {
  const skills = findAllSkills(repoRoot);
  if (skills.length === 0) {
    console.error("No skills found in skills/agent-building/");
    process.exit(1);
  }
  console.log(`Running evals for ${skills.length} skills...`);
  let passed = 0;
  let failed = 0;
  for (const skillPath of skills) {
    try {
      const result = runEval(skillPath);
      const savedPath = saveResult(result, repoRoot);
      printResult(result);
      if (result.overall >= 80) passed++;
      else failed++;
    } catch (err) {
      const skillName = basename(dirname(skillPath));
      console.warn(`  SKIP ${skillName}: ${(err as Error).message}`);
    }
  }
  console.log(`Summary: ${passed} passed (≥80%), ${failed} below threshold\n`);
} else {
  // Single skill mode
  const skillPath = args[0];
  try {
    const result = runEval(skillPath);
    const savedPath = saveResult(result, repoRoot);
    printResult(result);
    console.log(`Results saved: ${savedPath}`);
    process.exit(result.overall >= 80 ? 0 : 1);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}
