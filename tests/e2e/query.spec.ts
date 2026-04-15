import { test, expect } from "@playwright/test";

const hasCreds =
  !!process.env.PINECONE_API_KEY && !!process.env.OPENAI_API_KEY;

test.describe("Compliance Copilot UI", () => {
  test.skip(!hasCreds, "Skipping E2E: API creds not set");

  const REFUSAL = "I cannot answer from the available sources.";

  test("submits a query and renders a grounded, cited answer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("textbox").fill(
      "Under Regulation Z 12 CFR 1026.18, what must a creditor disclose about the finance charge and annual percentage rate for closed-end credit?"
    );
    await page.getByRole("button", { name: /submit/i }).click();
    await expect(page.getByText("Thinking…").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Thinking…").first()).not.toBeVisible({ timeout: 30_000 });

    const answer = page.locator("[data-testid='answer']");
    await expect(answer).toBeVisible();

    const answerText = (await answer.innerText()).trim();
    expect(answerText).not.toContain(REFUSAL);
    expect(answerText.length).toBeGreaterThan(80);
    expect(answerText).toMatch(/\[\^\d+\]/);

    await expect(page.getByRole("heading", { name: "Sources" })).toBeVisible();
  });
});
