import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export function uniqueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function uniqueUser(label = "E2E") {
  const id = uniqueId();
  return {
    name: `${label} Kullanıcı`,
    email: `e2e-${id}@taskflow.test`,
    password: `e2e-pass-${id}`,
  };
}

/** Signs up through the API; the session cookie lands in the context. */
export async function signUpViaApi(context: BrowserContext, user: ReturnType<typeof uniqueUser>) {
  const res = await context.request.post("/api/auth/sign-up/email", {
    data: { name: user.name, email: user.email, password: user.password },
  });
  expect(res.ok()).toBeTruthy();
}

/** Creates a workspace through the onboarding UI and returns its slug. */
export async function createWorkspace(page: Page, name: string) {
  await page.goto("/onboarding");
  await page.getByLabel("Workspace adı").fill(name);
  const slug = await page.getByLabel("Adres").inputValue();
  await page.getByRole("button", { name: "Workspace oluştur" }).click();
  await expect(page).toHaveURL(`/w/${slug}`);
  return slug;
}

/**
 * Invites a new user from the owner's settings page and accepts as them.
 * Returns the new member's page (signed in, in its own context).
 */
export async function addMember(browser: Browser, ownerPage: Page, slug: string, label = "Üye") {
  const member = uniqueUser(label);
  await ownerPage.goto(`/w/${slug}/settings`);
  await ownerPage.getByLabel("E-posta").fill(member.email);
  await ownerPage.getByRole("button", { name: "Davet et" }).click();
  const link = new URL((await ownerPage.getByRole("status").locator("code").textContent())!.trim());

  const context = await browser.newContext();
  const page = await context.newPage();
  await signUpViaApi(context, member);
  await page.goto(link.pathname);
  await page.getByRole("button", { name: "Daveti kabul et" }).click();
  await expect(page).toHaveURL(new RegExp(`/w/${slug}`));
  return { member, page, context };
}

/** Creates a project through the dialog (sidebar "+" or empty-state button). */
export async function createProject(page: Page, name: string, key?: string) {
  await page.getByRole("button", { name: "Yeni proje" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Proje adı").fill(name);
  if (key) await dialog.getByLabel("Kod").fill(key);
  const finalKey = await dialog.getByLabel("Kod").inputValue();
  await dialog.getByRole("button", { name: "Proje oluştur" }).click();
  // Wait for the new board's content (the URL changes before it renders), unless the
  // create failed and the dialog shows an error (e.g. duplicate key).
  const error = dialog.locator("[data-slot=field-error]");
  const heading = page.getByRole("heading", { level: 1, name, exact: true });
  await expect(error.or(heading)).toBeVisible();
  if (await heading.isVisible()) await expect(page).toHaveURL(new RegExp(`/p/${finalKey}$`));
  return finalKey;
}
