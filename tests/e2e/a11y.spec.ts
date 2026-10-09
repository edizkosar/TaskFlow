import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { createProject, createWorkspace, signUpViaApi, uniqueId, uniqueUser } from "./helpers";

/** WCAG 2.1 A/AA checks on the current page. Returns readable violation lines. */
async function violations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`,
  );
}

for (const scheme of ["light", "dark"] as const) {
  test(`erişilebilirlik taraması (${scheme})`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: scheme });
    const page = await context.newPage();

    await page.goto("/login");
    expect(await violations(page), "login").toEqual([]);

    await signUpViaApi(context, uniqueUser());
    const slug = await createWorkspace(page, `Erişim ${uniqueId()}`);
    await createProject(page, "Mobil Uygulama", "MOB");
    await expect(page).toHaveURL(`/w/${slug}/p/MOB`);
    const todo = page.locator("section").filter({ has: page.locator("h2", { hasText: /^Yapılacak$/ }) });
    await todo.getByRole("button", { name: "Görev ekle" }).click();
    await todo.getByRole("textbox").fill("Erişilebilirlik kontrolü");
    await todo.getByRole("textbox").press("Enter");
    await todo.getByRole("textbox").press("Escape");
    await expect(todo.getByTestId("task-card").locator("span.font-mono")).toHaveText("MOB-1");
    expect(await violations(page), "board").toEqual([]);

    await page.goto(`/w/${slug}/p/MOB?task=MOB-1`);
    const panel = page.getByRole("dialog");
    await expect(panel.getByLabel("Başlık")).toBeVisible();
    expect(await violations(page), "task panel").toEqual([]);

    // Give the card every metadata chip (urgent priority, overdue date, label) to check their contrast.
    await panel.getByRole("combobox", { name: "Öncelik" }).click();
    await page.getByRole("option", { name: "Acil" }).click();
    await panel.getByLabel("Bitiş tarihi").fill("2020-01-15");
    await panel.getByLabel("Bitiş tarihi").press("Enter");
    await panel.getByRole("button", { name: /^Etiketler:/ }).click();
    await page.getByLabel("Yeni etiket adı").fill("Tasarım");
    await page.getByLabel("Yeni etiket adı").press("Enter");
    await expect(page.getByRole("checkbox", { name: "Tasarım" })).toBeChecked();
    expect(await violations(page), "label picker").toEqual([]);
    await page.keyboard.press("Escape");
    await page.goto(`/w/${slug}/p/MOB`);
    const chips = todo.getByTestId("task-card");
    await expect(chips.getByText("Tasarım")).toBeVisible();
    await expect(chips.getByText("Acil")).toBeAttached();
    await expect(chips).toContainText("15 Oca");
    expect(await violations(page), "board with chips").toEqual([]);

    await page.goto(`/w/${slug}/settings`);
    expect(await violations(page), "settings").toEqual([]);

    await page.keyboard.press("Control+k");
    await page.getByRole("dialog", { name: "Komut paleti" }).getByRole("combobox").fill("mob");
    await expect(page.getByRole("option", { name: /Mobil Uygulama/ })).toBeVisible();
    expect(await violations(page), "command palette").toEqual([]);

    await context.close();
  });
}
