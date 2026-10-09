// README screenshots: builds a demo workspace in the TEST database and captures
// light/dark screenshots into docs/screenshots. Run with: npm run screenshots
import { expect, test, type Page } from "@playwright/test";

import { addMember, createProject, signUpViaApi, uniqueId } from "../e2e/helpers";

const OUT = "docs/screenshots";

function column(page: Page, name: string) {
  return page.locator("section").filter({ has: page.locator("h2", { hasText: new RegExp(`^${name}$`) }) });
}

async function add(page: Page, col: string, titles: string[]) {
  const c = column(page, col);
  await c.getByRole("button", { name: "Görev ekle" }).click();
  for (const t of titles) {
    await c.getByRole("textbox").fill(t);
    await c.getByRole("textbox").press("Enter");
    await expect(c.getByText(t)).toBeVisible();
  }
  await c.getByRole("textbox").press("Escape");
  await expect(c.getByTestId("task-card").locator("span.font-mono", { hasText: "…" })).toHaveCount(0, { timeout: 30_000 });
}

async function edit(page: Page, slug: string, id: string, opts: { priority?: string; assignee?: string; due?: string; labels?: string[]; comment?: string }) {
  await page.goto(`/w/${slug}/p/MOB?task=${id}`);
  const panel = page.getByRole("dialog");
  await expect(panel.getByLabel("Başlık")).toBeVisible();
  const pick = async (field: string, option: string) => {
    await panel.getByRole("combobox", { name: field }).click();
    await page.getByRole("option", { name: new RegExp(`^${option}`) }).click();
    await page.waitForLoadState("networkidle");
  };
  if (opts.priority) await pick("Öncelik", opts.priority);
  if (opts.assignee) await pick("Atanan", opts.assignee);
  if (opts.due) {
    await panel.getByLabel("Bitiş tarihi").fill(opts.due);
    await panel.getByLabel("Bitiş tarihi").press("Enter");
    await page.waitForLoadState("networkidle");
  }
  for (const label of opts.labels ?? []) {
    await panel.getByRole("button", { name: /^Etiketler:/ }).click();
    const existing = page.getByRole("checkbox", { name: label });
    if (await existing.count()) await existing.click();
    else {
      await page.getByLabel("Yeni etiket adı").fill(label);
      await page.getByLabel("Yeni etiket adı").press("Enter");
    }
    await expect(page.getByRole("checkbox", { name: label })).toBeChecked();
    await page.keyboard.press("Escape");
    await page.waitForLoadState("networkidle");
  }
  if (opts.comment) {
    await panel.getByLabel("Yorum yaz").fill(opts.comment);
    await panel.getByLabel("Yorum yaz").press("Control+Enter");
    await expect(panel.getByText(opts.comment)).toBeVisible();
  }
}

test("demo screenshots", async ({ browser }) => {
  test.setTimeout(600_000);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
  const page = await context.newPage();
  const short = uniqueId().slice(-6);
  const owner = { name: "Elif Yıldız", email: `elif.${short}@atlas.dev`, password: `demo-${uniqueId()}` };
  await signUpViaApi(context, owner);
  await page.goto("/onboarding");
  await page.getByLabel("Workspace adı").fill("Atlas Ürün");
  await page.getByLabel("Adres").fill(`atlas-${short}`);
  const slug = `atlas-${short}`;
  await page.getByRole("button", { name: "Workspace oluştur" }).click();
  await expect(page).toHaveURL(`/w/${slug}`);
  const { context: c2 } = await addMember(browser, page, slug, "Mert");
  await c2.close();
  await page.goto(`/w/${slug}`);
  await createProject(page, "Mobil Uygulama", "MOB");

  await add(page, "Backlog", ["Karanlık mod ikon seti", "Push bildirim metinleri"]);
  await add(page, "Yapılacak", ["Ödeme ekranı tasarımı", "Onboarding akışı v2", "Analitik olaylarını tanımla"]);
  await add(page, "Yapılıyor", ["Apple Pay entegrasyonu", "Çevrimdışı senkronizasyon"]);
  await add(page, "Tamamlandı", ["Giriş ekranı", "Crash raporlama"]);

  await edit(page, slug, "MOB-3", { priority: "Yüksek", assignee: "Elif", due: "2026-10-20", labels: ["Tasarım"], comment: "Figma taslağı hazır." });
  await edit(page, slug, "MOB-4", { priority: "Orta", assignee: "Mert", labels: ["UX"] });
  await edit(page, slug, "MOB-5", { priority: "Düşük", labels: ["Analitik"] });
  await edit(page, slug, "MOB-6", { priority: "Acil", assignee: "Elif", due: "2026-10-05", labels: ["Backend"], comment: "Sandbox anahtarları geldi." });
  await edit(page, slug, "MOB-7", { priority: "Yüksek", assignee: "Mert", labels: ["Backend"] });
  await edit(page, slug, "MOB-1", { labels: ["Tasarım"] });
  await edit(page, slug, "MOB-8", { assignee: "Elif" });

  await page.goto(`/w/${slug}/p/MOB`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${OUT}/board-light.png` });
  await page.goto(`/w/${slug}/p/MOB?task=MOB-6`);
  await expect(page.getByRole("dialog").getByLabel("Başlık")).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/panel-light.png` });

  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`/w/${slug}/p/MOB`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${OUT}/board-dark.png` });
  await page.goto(`/w/${slug}/p/MOB?task=MOB-6`);
  await expect(page.getByRole("dialog").getByLabel("Başlık")).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/panel-dark.png` });
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k");
  await page.getByRole("dialog", { name: "Komut paleti" }).getByRole("combobox").fill("öde");
  await expect(page.getByRole("option", { name: /MOB-3/ })).toBeVisible();
  await page.screenshot({ path: `${OUT}/palette-dark.png` });

  await context.close();
  const auth = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
  const authPage = await auth.newPage();
  await authPage.goto("/login");
  await authPage.screenshot({ path: `${OUT}/login-dark.png` });
  await auth.close();
});
