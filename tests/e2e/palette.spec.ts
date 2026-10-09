import { expect, test, type Page } from "@playwright/test";

import { createProject, createWorkspace, signUpViaApi, uniqueId, uniqueUser } from "./helpers";

function column(page: Page, name: string) {
  return page.locator("section").filter({ has: page.locator("h2", { hasText: new RegExp(`^${name}$`) }) });
}

async function addTask(page: Page, columnName: string, title: string) {
  const col = column(page, columnName);
  await col.getByRole("button", { name: "Görev ekle" }).click();
  await col.getByRole("textbox").fill(title);
  await col.getByRole("textbox").press("Enter");
  await col.getByRole("textbox").press("Escape");
  await expect(col.getByTestId("task-card").filter({ hasText: title }).locator("span.font-mono")).not.toHaveText(/…/);
}

function palette(page: Page) {
  return page.getByRole("dialog", { name: "Komut paleti" });
}

test("komut paleti: Türkçe arama, görev numarası, proje ve tema", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  await signUpViaApi(context, uniqueUser());
  const slug = await createWorkspace(page, `Palet ${uniqueId()}`);
  await createProject(page, "Mobil Uygulama", "MOB");
  await addTask(page, "Backlog", "IŞIK ayarları");
  await addTask(page, "Backlog", "İstanbul ofisi");
  await page.goto(`/w/${slug}`);
  await createProject(page, "Web Sitesi", "WEB");
  await addTask(page, "Yapılacak", "Ödeme sayfası");

  // Ctrl+K opens it; dotless/dotted i variants match either way.
  await page.keyboard.press("Control+k");
  await expect(palette(page)).toBeVisible();
  const input = palette(page).getByRole("combobox");
  await input.fill("ışık");
  await expect(palette(page).getByRole("option", { name: /MOB-1.*IŞIK ayarları/ })).toBeVisible();
  await input.fill("istanbul");
  await expect(palette(page).getByRole("option", { name: /MOB-2.*İstanbul ofisi/ })).toBeVisible();

  // Exact id, from another project: navigates there with the panel open.
  await input.fill("mob-1");
  await palette(page).getByRole("option", { name: /MOB-1/ }).click();
  await expect(page).toHaveURL(`/w/${slug}/p/MOB?task=MOB-1`);
  await expect(page.getByRole("dialog").getByLabel("Başlık")).toHaveValue("IŞIK ayarları");
  // Closing stays on this project (doesn't go Back to WEB).
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(`/w/${slug}/p/MOB`);

  // Projects filter on the client.
  await page.keyboard.press("Control+k");
  await palette(page).getByRole("combobox").fill("web");
  await palette(page).getByRole("option", { name: /Web Sitesi/ }).click();
  await expect(page).toHaveURL(`/w/${slug}/p/WEB`);

  // Commands: theme.
  await page.getByRole("button", { name: /^Ara/ }).click();
  await palette(page).getByRole("combobox").fill("koyu");
  await palette(page).getByRole("option", { name: "Tema: Koyu" }).click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);

  // Nothing found.
  await page.keyboard.press("Control+k");
  await palette(page).getByRole("combobox").fill("zzzz yok");
  await expect(palette(page).getByText("Sonuç yok.")).toBeVisible();

  await context.close();
});

test("C kısayolu hızlı görev eklemeyi açar, yazarken tetiklenmez", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signUpViaApi(context, uniqueUser());
  const slug = await createWorkspace(page, `Kısayol ${uniqueId()}`);
  await createProject(page, "Mobil Uygulama", "MOB");
  await expect(page).toHaveURL(`/w/${slug}/p/MOB`);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // Shortcut listeners attach on hydration.
  await page.waitForLoadState("networkidle");

  await page.locator("body").click({ position: { x: 600, y: 400 } });
  await page.keyboard.press("c");
  const todoInput = column(page, "Yapılacak").getByRole("textbox");
  await expect(todoInput).toBeFocused();
  await page.keyboard.type("Kısayolla eklendi");
  await page.keyboard.press("Enter");
  await expect(column(page, "Yapılacak").getByText("Kısayolla eklendi")).toBeVisible();
  await page.keyboard.press("Escape");

  // Typing "c" in another field doesn't trigger it.
  await column(page, "Backlog").getByRole("button", { name: "Görev ekle" }).click();
  await column(page, "Backlog").getByRole("textbox").fill("ccc");
  await expect(column(page, "Yapılacak").getByRole("textbox")).toHaveCount(0);
  await expect(column(page, "Backlog").getByRole("textbox")).toHaveValue("ccc");

  // The palette's "Yeni görev" does the same.
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k");
  await palette(page).getByRole("combobox").fill("yeni");
  await palette(page).getByRole("option", { name: /Yeni görev/ }).click();
  await expect(column(page, "Yapılacak").getByRole("textbox")).toBeFocused();

  await context.close();
});
