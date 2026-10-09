import { expect, test } from "@playwright/test";

import { uniqueUser } from "./helpers";

test("korumalı sayfa oturum yoksa girişe yönlendirir ve next parametresini korur", async ({ page }) => {
  await page.goto("/w/demo?task=MOB-1");
  await expect(page).toHaveURL(/\/login\?next=%2Fw%2Fdemo%3Ftask%3DMOB-1$/);
  await expect(page.getByRole("heading", { name: "Giriş yap" })).toBeVisible();
});

test("kayıt ol → giriş yap → çıkış yap akışı", async ({ page }) => {
  const user = uniqueUser();

  // A new user without a workspace lands on onboarding.
  await page.goto("/signup");
  await page.getByLabel("Ad soyad").fill(user.name);
  await page.getByLabel("E-posta").fill(user.email);
  await page.getByLabel("Şifre").fill(user.password);
  await page.getByRole("button", { name: "Hesap oluştur" }).click();
  await expect(page).toHaveURL("/onboarding");
  await expect(page.getByRole("heading", { name: "İlk workspace'ini oluştur" })).toBeVisible();

  // Signed-in users are bounced away from auth pages.
  await page.goto("/login");
  await expect(page).toHaveURL("/onboarding");

  // Sign out from onboarding (no sidebar yet).
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page).toHaveURL("/login");

  // Wrong password shows an error.
  await page.getByLabel("E-posta").fill(user.email);
  await page.getByLabel("Şifre").fill("definitely-wrong");
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page.locator("[data-slot=field-error]")).toHaveText("E-posta veya şifre hatalı.");

  // Correct password signs back in.
  await page.getByLabel("Şifre").fill(user.password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL("/onboarding");
});

test("aynı e-posta ile ikinci kayıt reddedilir", async ({ page, request }) => {
  const user = uniqueUser();
  const res = await request.post("/api/auth/sign-up/email", {
    data: { name: user.name, email: user.email, password: user.password },
  });
  expect(res.ok()).toBeTruthy();

  await page.goto("/signup");
  await page.getByLabel("Ad soyad").fill(user.name);
  await page.getByLabel("E-posta").fill(user.email);
  await page.getByLabel("Şifre").fill(user.password);
  await page.getByRole("button", { name: "Hesap oluştur" }).click();
  await expect(page.locator("[data-slot=field-error]")).toHaveText("Bu e-posta ile kayıtlı bir hesap zaten var.");
});
