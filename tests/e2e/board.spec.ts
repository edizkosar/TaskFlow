import { expect, test, type Locator, type Page } from "@playwright/test";

import { createProject, createWorkspace, signUpViaApi, uniqueId, uniqueUser } from "./helpers";

function column(page: Page, name: string) {
  return page.getByRole("region", { name });
}

/** Task ids (e.g. "MOB-2") in a column, top to bottom. */
async function idsIn(page: Page, name: string) {
  return column(page, name).getByTestId("task-card").locator("span.font-mono").allInnerTexts();
}

async function addTasks(page: Page, columnName: string, titles: string[]) {
  const col = column(page, columnName);
  await col.getByRole("button", { name: "Görev ekle" }).click();
  const input = col.getByRole("textbox");
  for (const title of titles) {
    await input.fill(title);
    await input.press("Enter");
    await expect(col.getByText(title)).toBeVisible();
  }
  await input.press("Escape");
}

function card(page: Page, id: string): Locator {
  return page.getByTestId("task-card").filter({ has: page.locator("span.font-mono", { hasText: new RegExp(`^${id}$`) }) });
}

/** Waits two animation frames so dnd-kit can measure and recompute collisions. */
async function frames(page: Page) {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/**
 * Keyboard drag: Space to pick up, arrow keys, Space to drop. Waits between keys
 * like a person would; dnd-kit ignores arrows before it has measured drop targets.
 */
async function keyboardMove(page: Page, id: string, keys: string[]) {
  const target = card(page, id);
  await target.focus();
  await page.keyboard.press("Space");
  await expect(target).toHaveAttribute("aria-pressed", "true");
  await frames(page);
  for (const key of keys) {
    await page.keyboard.press(key);
    await frames(page);
  }
  await page.keyboard.press("Space");
}

async function setUpBoard(browser: import("@playwright/test").Browser) {
  const user = uniqueUser();
  const context = await browser.newContext();
  const page = await context.newPage();
  await signUpViaApi(context, user);
  const slug = await createWorkspace(page, `Pano ${uniqueId()}`);
  await createProject(page, "Mobil Uygulama", "MOB");
  await expect(page).toHaveURL(`/w/${slug}/p/MOB`);
  return { page, context, slug };
}

test("görev ekleme, sürükle-bırak ve klavyeyle taşıma kalıcı", async ({ browser }) => {
  const { page, context } = await setUpBoard(browser);

  await addTasks(page, "Yapılacak", ["Giriş ekranı", "Bildirim izinleri", "Çevrimdışı mod"]);
  await expect.poll(() => idsIn(page, "Yapılacak")).toEqual(["MOB-1", "MOB-2", "MOB-3"]);
  await expect(column(page, "Yapılacak").getByLabel("3 görev")).toBeVisible();

  // Mouse: MOB-3 → empty Backlog column.
  const from = await card(page, "MOB-3").boundingBox();
  const to = await column(page, "Backlog").getByText("Görev yok").boundingBox();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(from!.x + from!.width / 2 - 20, from!.y + 10, { steps: 5 });
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect.poll(() => idsIn(page, "Backlog")).toEqual(["MOB-3"]);

  // Keyboard: MOB-1 → next column (Yapılıyor).
  await keyboardMove(page, "MOB-1", ["ArrowRight"]);
  await expect.poll(() => idsIn(page, "Yapılıyor")).toEqual(["MOB-1"]);

  // Keyboard reorder within a column: MOB-1 back to Yapılacak, then below MOB-2 → above it.
  await keyboardMove(page, "MOB-1", ["ArrowLeft"]);
  await expect.poll(() => idsIn(page, "Yapılacak")).toContain("MOB-1");
  const order = await idsIn(page, "Yapılacak");
  const target = order[0] === "MOB-1" ? "ArrowDown" : "ArrowUp";
  await keyboardMove(page, "MOB-1", [target]);
  await expect.poll(() => idsIn(page, "Yapılacak")).toEqual(order[0] === "MOB-1" ? ["MOB-2", "MOB-1"] : ["MOB-1", "MOB-2"]);
  const finalOrder = await idsIn(page, "Yapılacak");

  // Multi-step keyboard move within a column: top card down two slots.
  await addTasks(page, "Tamamlandı", ["Bir", "İki", "Üç"]);
  await expect.poll(() => idsIn(page, "Tamamlandı")).toEqual(["MOB-4", "MOB-5", "MOB-6"]);
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.ok());
  await keyboardMove(page, "MOB-4", ["ArrowDown", "ArrowDown"]);
  await expect.poll(() => idsIn(page, "Tamamlandı")).toEqual(["MOB-5", "MOB-6", "MOB-4"]);
  // The UI updates optimistically; wait for the save before reloading.
  await saved;

  // Everything survives a reload (positions persisted server-side).
  await page.reload();
  await expect.poll(() => idsIn(page, "Backlog")).toEqual(["MOB-3"]);
  await expect.poll(() => idsIn(page, "Yapılacak")).toEqual(finalOrder);
  await expect.poll(() => idsIn(page, "Yapılıyor")).toEqual([]);
  await expect.poll(() => idsIn(page, "Tamamlandı")).toEqual(["MOB-5", "MOB-6", "MOB-4"]);

  await context.close();
});

test("filtreler URL'de tutulur ve paylaşılabilir", async ({ browser }) => {
  const { page, context, slug } = await setUpBoard(browser);
  await addTasks(page, "Backlog", ["Atanmamış görev"]);

  await page.getByRole("combobox", { name: "Atanan kişiye göre filtrele" }).click();
  await page.getByRole("option", { name: "Bana atananlar" }).click();
  await expect(page).toHaveURL(`/w/${slug}/p/MOB?assignee=me`);
  await expect(column(page, "Backlog").getByText("Filtreye uyan görev yok")).toBeVisible();

  // Same URL opened fresh shows the same filtered view.
  await page.goto(`/w/${slug}/p/MOB?assignee=none`);
  await expect(card(page, "MOB-1")).toBeVisible();
  await page.goto(`/w/${slug}/p/MOB?assignee=me`);
  await expect(card(page, "MOB-1")).toHaveCount(0);

  await page.getByRole("button", { name: "Filtreleri temizle" }).click();
  await expect(page).toHaveURL(`/w/${slug}/p/MOB`);
  await expect(card(page, "MOB-1")).toBeVisible();

  await context.close();
});

test("sunucu taşımayı reddederse kart eski yerine döner", async ({ browser }) => {
  const { page, context, slug } = await setUpBoard(browser);
  await addTasks(page, "Yapılacak", ["Silinecek görev"]);

  // Delete the project from a second tab; the first tab's board is now stale.
  const other = await context.newPage();
  await other.goto(`/w/${slug}/p/MOB`);
  await other.getByRole("button", { name: "Proje işlemleri" }).click();
  await other.getByRole("menuitem", { name: "Projeyi sil" }).click();
  await other.getByRole("alertdialog").getByRole("button", { name: "Projeyi sil" }).click();
  await expect(other).toHaveURL(`/w/${slug}`);

  await keyboardMove(page, "MOB-1", ["ArrowRight"]);
  await expect(page.getByText("Görev bulunamadı.")).toBeVisible();
  await expect.poll(() => idsIn(page, "Yapılacak")).toEqual(["MOB-1"]);

  await context.close();
});
