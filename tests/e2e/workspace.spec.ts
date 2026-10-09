import { expect, test } from "@playwright/test";

import { createWorkspace, signUpViaApi, uniqueId, uniqueUser } from "./helpers";

test("A workspace oluşturur, B'yi davet eder; B linkle katılır ve rol yetkileri doğru", async ({ browser }) => {
  const owner = uniqueUser("Sahip");
  const invitee = uniqueUser("Davetli");

  // --- A: create workspace and invite B as member ---
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signUpViaApi(ownerContext, owner);
  const slug = await createWorkspace(ownerPage, `Test Ekip ${uniqueId()}`);

  await ownerPage.getByRole("link", { name: "Ayarlar" }).click();
  await expect(ownerPage).toHaveURL(`/w/${slug}/settings`);
  await ownerPage.getByLabel("E-posta").fill(invitee.email);
  await ownerPage.getByRole("button", { name: "Davet et" }).click();
  const linkText = ownerPage.getByRole("status").locator("code");
  await expect(linkText).toContainText("/invite/");
  const inviteUrl = new URL((await linkText.textContent())!.trim());

  // --- B: open the link signed out → login → sign up → back on the invite ---
  const inviteeContext = await browser.newContext();
  const inviteePage = await inviteeContext.newPage();
  await inviteePage.goto(inviteUrl.pathname);
  await expect(inviteePage).toHaveURL(/\/login\?next=%2Finvite%2F/);
  await inviteePage.getByRole("link", { name: "Kayıt ol" }).click();
  await expect(inviteePage).toHaveURL(/\/signup\?next=%2Finvite%2F/);
  await inviteePage.getByLabel("Ad soyad").fill(invitee.name);
  await inviteePage.getByLabel("E-posta").fill(invitee.email);
  await inviteePage.getByLabel("Şifre").fill(invitee.password);
  await inviteePage.getByRole("button", { name: "Hesap oluştur" }).click();
  await expect(inviteePage).toHaveURL(inviteUrl.pathname);
  await expect(inviteePage.getByText("seni Üye olarak davet etti")).toBeVisible();
  await inviteePage.getByRole("button", { name: "Daveti kabul et" }).click();
  await expect(inviteePage).toHaveURL(`/w/${slug}`);

  // --- B as member: can see members but cannot invite or manage ---
  await inviteePage.goto(`/w/${slug}/settings`);
  await expect(inviteePage.getByRole("heading", { name: /Üyeler/ })).toBeVisible();
  await expect(inviteePage.getByText(owner.email)).toBeVisible();
  await expect(inviteePage.getByRole("button", { name: "Davet et" })).toHaveCount(0);
  await expect(inviteePage.getByRole("combobox")).toHaveCount(0);

  // --- A promotes B to admin ---
  await ownerPage.reload();
  await expect(ownerPage.getByText("Bekleyen davet yok.")).toBeVisible();
  await ownerPage.getByRole("combobox", { name: `${invitee.name} rolü` }).click();
  await ownerPage.getByRole("option", { name: "Yönetici" }).click();
  await expect(ownerPage.getByText(`${invitee.name} artık Yönetici`)).toBeVisible();

  // --- B as admin: can invite, but cannot manage the owner ---
  await inviteePage.reload();
  await expect(inviteePage.getByRole("button", { name: "Davet et" })).toBeVisible();
  await expect(inviteePage.getByRole("combobox", { name: `${owner.name} rolü` })).toHaveCount(0);

  await ownerContext.close();
  await inviteeContext.close();
});

test("üye olmayan kullanıcı workspace'i göremez (404)", async ({ browser }) => {
  const owner = uniqueUser("Sahip");
  const outsider = uniqueUser("Yabancı");

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signUpViaApi(ownerContext, owner);
  const slug = await createWorkspace(ownerPage, `Gizli Ekip ${uniqueId()}`);

  const outsiderContext = await browser.newContext();
  const outsiderPage = await outsiderContext.newPage();
  await signUpViaApi(outsiderContext, outsider);
  const res = await outsiderPage.goto(`/w/${slug}/settings`);
  expect(res?.status()).toBe(404);

  await ownerContext.close();
  await outsiderContext.close();
});

test("davet başka bir e-postaya aitse kabul edilemez", async ({ browser }) => {
  const owner = uniqueUser("Sahip");
  const other = uniqueUser("Başka");

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signUpViaApi(ownerContext, owner);
  const slug = await createWorkspace(ownerPage, `Ekip ${uniqueId()}`);
  await ownerPage.goto(`/w/${slug}/settings`);
  await ownerPage.getByLabel("E-posta").fill(`baskasi-${uniqueId()}@taskflow.test`);
  await ownerPage.getByRole("button", { name: "Davet et" }).click();
  const link = new URL((await ownerPage.getByRole("status").locator("code").textContent())!.trim());

  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await signUpViaApi(otherContext, other);
  await otherPage.goto(link.pathname);
  await expect(otherPage.getByText("adresine gönderilmiş")).toBeVisible();
  await expect(otherPage.getByRole("button", { name: "Daveti kabul et" })).toHaveCount(0);
  await expect(otherPage.getByRole("button", { name: "Başka hesapla giriş yap" })).toBeVisible();

  await ownerContext.close();
  await otherContext.close();
});
