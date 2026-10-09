import { expect, type BrowserContext, type Page } from "@playwright/test";

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
