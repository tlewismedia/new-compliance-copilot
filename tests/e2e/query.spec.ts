import { test, expect } from "@playwright/test";

const hasCreds =
  !!process.env.PINECONE_API_KEY && !!process.env.OPENAI_API_KEY;

test.describe("Compliance Copilot UI", () => {
  test.skip(!hasCreds, "Skipping E2E: API creds not set");

  const REFUSAL = "I cannot answer from the available sources.";

  test("submits a query and renders a grounded, cited answer", async ({
    page,
  }) => {
    await page.goto("/");

    // Empty-state: citations placeholder should be visible before the query.
    await expect(page.locator("[data-testid='citations-empty']")).toBeVisible();

    await page.getByRole("textbox").fill(
      "Under Regulation Z 12 CFR 1026.18, what must a creditor disclose about the finance charge and annual percentage rate for closed-end credit?",
    );
    await page.getByRole("button", { name: /^ask$/i }).click();

    await expect(page.getByText("Thinking…").first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Thinking…").first()).not.toBeVisible({
      timeout: 30_000,
    });

    const answer = page.locator("[data-testid='answer']");
    await expect(answer).toBeVisible();

    const answerText = (await answer.innerText()).trim();
    expect(answerText).not.toContain(REFUSAL);
    expect(answerText.length).toBeGreaterThan(80);
    // Inline marker numbers from the answer renderer (CitationChip).
    expect(answerText).toMatch(/\d/);

    // Citations panel must populate with at least one card.
    const citations = page.locator("[data-testid='citations']");
    await expect(citations).toBeVisible();
    await expect(citations.locator("article")).not.toHaveCount(0);

    // Trace section must render once the answer is back.
    await expect(page.locator("[data-testid='trace']")).toBeVisible();
  });

  test("renders an empty citations placeholder and focused question on first paint", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("[data-testid='citations-empty']")).toBeVisible();
    await expect(page.locator("[data-testid='question-card']")).toBeVisible();
    // Trace should be hidden until a result exists.
    await expect(page.locator("[data-testid='trace']")).toHaveCount(0);
  });

  test("stacks citations below main column on narrow viewports", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 800, height: 1100 });
    await page.goto("/");
    const citationsEmpty = page.locator("[data-testid='citations-empty']");
    const question = page.locator("[data-testid='question-card']");
    await expect(citationsEmpty).toBeVisible();
    await expect(question).toBeVisible();

    const qBox = await question.boundingBox();
    const cBox = await citationsEmpty.boundingBox();
    expect(qBox).not.toBeNull();
    expect(cBox).not.toBeNull();
    if (qBox && cBox) {
      // Citations stack below the question card on narrow viewports.
      expect(cBox.y).toBeGreaterThan(qBox.y);
    }
  });
});
