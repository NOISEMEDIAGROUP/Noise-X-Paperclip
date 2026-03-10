import { test, expect } from "@playwright/test";

/**
 * E2E: Onboarding wizard flow (skip_llm mode).
 *
 * Walks through the 4-step OnboardingWizard:
 *   Step 1 — Name your company
 *   Step 2 — Create your first agent (adapter selection + config)
 *   Step 3 — Give it something to do (task creation)
 *   Step 4 — Ready to launch (summary + open issue)
 *
 * By default this runs in skip_llm mode: we do NOT assert that an LLM
 * heartbeat fires. Set PAPERCLIP_E2E_SKIP_LLM=false to enable LLM-dependent
 * assertions (requires a valid ANTHROPIC_API_KEY).
 */

const SKIP_LLM = process.env.PAPERCLIP_E2E_SKIP_LLM !== "false";

const COMPANY_NAME = `E2E-Test-${Date.now()}`;
const AGENT_NAME = "CEO";
const TASK_TITLE = "E2E test task";

test.describe("Onboarding wizard", () => {
  test("completes full wizard flow", async ({ page }) => {
    // Make E2E resilient to UI i18n: force English before any app code runs.
    await page.addInitScript(() => {
      try {
        localStorage.setItem("paperclip-language", "en");
        // If i18next's default key is present from prior runs, remove it to
        // avoid fighting with our app-specific key.
        localStorage.removeItem("i18nextLng");
      } catch {
        // Ignore storage errors (e.g. in very restricted browser contexts).
      }
    });

    // Navigate to root — should auto-open onboarding when no companies exist
    await page.goto("/");

    // If the wizard didn't auto-open (company already exists), click the button
    const wizardHeading = page.locator("h3", { hasText: "Name your company" });
    const newCompanyBtn = page.getByRole("button", { name: "New Company" });

    // Some states show the wizard directly; others show a "New Company" entry
    // point. Avoid strict-mode issues by waiting for one path explicitly.
    try {
      await wizardHeading.waitFor({ state: "visible", timeout: 15_000 });
    } catch {
      await newCompanyBtn.waitFor({ state: "visible", timeout: 15_000 });
      await newCompanyBtn.click();
      await wizardHeading.waitFor({ state: "visible", timeout: 15_000 });
    }

    // -----------------------------------------------------------
    // Step 1: Name your company
    // -----------------------------------------------------------
    await expect(wizardHeading).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=Step 1 of 4")).toBeVisible();

    const companyNameInput = page.locator('input[placeholder="Acme Corp"]');
    await companyNameInput.fill(COMPANY_NAME);

    // Click Next
    const nextButton = page.getByRole("button", { name: "Next" });
    await nextButton.click();

    // -----------------------------------------------------------
    // Step 2: Create your first agent
    // -----------------------------------------------------------
    await expect(
      page.locator("h3", { hasText: "Create your first agent" })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=Step 2 of 4")).toBeVisible();

    // Agent name should default to "CEO"
    const agentNameInput = page.locator('input[placeholder="CEO"]');
    await expect(agentNameInput).toHaveValue(AGENT_NAME);

    // Claude Code adapter should be selected by default
    await expect(
      page.locator("button", { hasText: "Claude Code" }).locator("..")
    ).toBeVisible();

    // Select the process adapter to avoid requiring a third-party CLI/tool to be installed.
    // Use an aria-label based selector so the accessible name doesn't change when the UI
    // card's description text changes.
    const shellProcessBtn = page.locator('button[aria-label="Shell Process"]');
    await expect(shellProcessBtn).toBeVisible();
    await shellProcessBtn.click();

    // Fill in process adapter fields
    await expect(
      page.locator('input[placeholder="e.g. node, python"]')
    ).toBeVisible();
    await page.locator('input[placeholder="e.g. node, python"]').fill("echo");
    await page.locator('input[placeholder="e.g. script.js, --flag"]').fill("hello");

    // Click Next (process adapter skips environment test)
    await page.getByRole("button", { name: "Next" }).click();

    // -----------------------------------------------------------
    // Step 3: Give it something to do
    // -----------------------------------------------------------
    await expect(
      page.locator("h3", { hasText: "Give it something to do" })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=Step 3 of 4")).toBeVisible();

    // Clear default title and set our test title
    const taskTitleInput = page.locator(
      'input[placeholder="e.g. Research competitor pricing"]'
    );
    await taskTitleInput.clear();
    await taskTitleInput.fill(TASK_TITLE);

    // Click Next
    await page.getByRole("button", { name: "Next" }).click();

    // -----------------------------------------------------------
    // Step 4: Ready to launch
    // -----------------------------------------------------------
    await expect(
      page.locator("h3", { hasText: "Ready to launch" })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=Step 4 of 4")).toBeVisible();

    // Verify summary displays our created entities
    await expect(page.locator("text=" + COMPANY_NAME)).toBeVisible();
    await expect(page.locator("text=" + AGENT_NAME)).toBeVisible();
    await expect(page.locator("text=" + TASK_TITLE)).toBeVisible();

    // Click "Open Issue"
    await page.getByRole("button", { name: "Open Issue" }).click();

    // Depending on the UI path, "Open Issue" may land on the issue page or the
    // company dashboard. Either is fine as long as the resources were created.
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toMatch(/\/(issues\/|dashboard)/);

    // -----------------------------------------------------------
    // Verify via API that entities were created
    // -----------------------------------------------------------
    const baseUrl = page.url().split("/").slice(0, 3).join("/");

    // List companies and find ours
    const companiesRes = await page.request.get(`${baseUrl}/api/companies`);
    expect(companiesRes.ok()).toBe(true);
    const companies = await companiesRes.json();
    const company = companies.find(
      (c: { name: string }) => c.name === COMPANY_NAME
    );
    expect(company).toBeTruthy();

    // List agents for our company
    const agentsRes = await page.request.get(
      `${baseUrl}/api/companies/${company.id}/agents`
    );
    expect(agentsRes.ok()).toBe(true);
    const agents = await agentsRes.json();
    const ceoAgent = agents.find(
      (a: { name: string }) => a.name === AGENT_NAME
    );
    expect(ceoAgent).toBeTruthy();
    expect(ceoAgent.role).toBe("ceo");
    expect(ceoAgent.adapterType).toBe("process");

    // List issues for our company
    const issuesRes = await page.request.get(
      `${baseUrl}/api/companies/${company.id}/issues`
    );
    expect(issuesRes.ok()).toBe(true);
    const issues = await issuesRes.json();
    const task = issues.find(
      (i: { title: string }) => i.title === TASK_TITLE
    );
    expect(task).toBeTruthy();
    expect(task.assigneeAgentId).toBe(ceoAgent.id);

    if (!SKIP_LLM) {
      // LLM-dependent: wait for the heartbeat to transition the issue
      await expect(async () => {
        const res = await page.request.get(
          `${baseUrl}/api/issues/${task.id}`
        );
        const issue = await res.json();
        expect(["in_progress", "done"]).toContain(issue.status);
      }).toPass({ timeout: 120_000, intervals: [5_000] });
    }
  });
});
