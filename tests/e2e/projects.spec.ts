import { expect, test } from "@playwright/test";

import { addMember, createProject, createWorkspace, signUpViaApi, uniqueId, uniqueUser } from "./helpers";

test("yönetici proje oluşturur, düzenler ve siler; üye oluşturamaz", async ({ browser }) => {
  const owner = uniqueUser("Sahip");
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signUpViaApi(ownerContext, owner);
  const slug = await createWorkspace(ownerPage, `Proje Ekibi ${uniqueId()}`);

  // Empty workspace shows the first-project empty state.
  await expect(ownerPage.getByRole("heading", { name: /için ilk proje$/ })).toBeVisible();

  // Key is suggested from the name (Turkish characters folded).
  await ownerPage.getByRole("button", { name: "Yeni proje" }).click();
  await ownerPage.getByRole("dialog").getByLabel("Proje adı").fill("Pazarlama Kampanyası");
  await expect(ownerPage.getByRole("dialog").getByLabel("Kod")).toHaveValue("PK");
  await ownerPage.getByRole("dialog").getByRole("button", { name: "Vazgeç" }).click();

  const key = await createProject(ownerPage, "Mobil Uygulama", "MOB");
  expect(key).toBe("MOB");
  await expect(ownerPage).toHaveURL(`/w/${slug}/p/MOB`);
  await expect(ownerPage.getByRole("heading", { name: "Mobil Uygulama", level: 1 })).toBeVisible();
  for (const column of ["Backlog", "Yapılacak", "Yapılıyor", "Tamamlandı"]) {
    await expect(ownerPage.getByRole("region", { name: column })).toBeVisible();
  }
  await expect(ownerPage.getByRole("link", { name: "Mobil Uygulama" })).toHaveAttribute("aria-current", "page");

  // Workspace root opens the first project.
  await ownerPage.goto(`/w/${slug}`);
  await expect(ownerPage).toHaveURL(`/w/${slug}/p/MOB`);

  // Duplicate key is rejected inline.
  await createProject(ownerPage, "Mobil Web", "MOB");
  await expect(ownerPage.getByRole("dialog").getByText("Bu kod bu workspace'te zaten kullanılıyor.")).toBeVisible();
  await ownerPage.getByRole("dialog").getByRole("button", { name: "Vazgeç" }).click();

  // Edit name and description.
  await ownerPage.getByRole("button", { name: "Proje işlemleri" }).click();
  await ownerPage.getByRole("menuitem", { name: "Düzenle" }).click();
  const dialog = ownerPage.getByRole("dialog");
  await dialog.getByLabel("Proje adı").fill("Mobil Uygulama v2");
  await dialog.getByLabel("Açıklama (isteğe bağlı)").fill("iOS ve Android sürümü");
  await dialog.getByRole("button", { name: "Kaydet" }).click();
  await expect(ownerPage.getByRole("heading", { name: "Mobil Uygulama v2", level: 1 })).toBeVisible();
  await expect(ownerPage.getByText("iOS ve Android sürümü")).toBeVisible();

  // A member sees the project but cannot create, edit or delete.
  const { page: memberPage, context: memberContext } = await addMember(browser, ownerPage, slug);
  await memberPage.goto(`/w/${slug}/p/MOB`);
  await expect(memberPage.getByRole("heading", { name: "Mobil Uygulama v2", level: 1 })).toBeVisible();
  await expect(memberPage.getByRole("button", { name: "Yeni proje" })).toHaveCount(0);
  await expect(memberPage.getByRole("button", { name: "Proje işlemleri" })).toHaveCount(0);

  // Delete (owner) → back to the empty state.
  await ownerPage.goto(`/w/${slug}/p/MOB`);
  await ownerPage.getByRole("button", { name: "Proje işlemleri" }).click();
  await ownerPage.getByRole("menuitem", { name: "Projeyi sil" }).click();
  await ownerPage.getByRole("alertdialog").getByRole("button", { name: "Projeyi sil" }).click();
  await expect(ownerPage).toHaveURL(`/w/${slug}`);
  await expect(ownerPage.getByRole("heading", { name: /için ilk proje$/ })).toBeVisible();

  // The deleted project's URL is gone. (The project page streams behind
  // loading.tsx, so the status is already 200 when notFound() renders.)
  await memberPage.goto(`/w/${slug}/p/MOB`);
  await expect(memberPage.getByRole("heading", { name: "Sayfa bulunamadı" })).toBeVisible();

  await ownerContext.close();
  await memberContext.close();
});

test("tema tercihi sayfa yenilense de korunur", async ({ browser }) => {
  const user = uniqueUser();
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  await signUpViaApi(context, user);
  await createWorkspace(page, `Tema ${uniqueId()}`);

  await page.getByRole("button", { name: new RegExp(user.email) }).click();
  await page.getByRole("menuitemradio", { name: "Koyu" }).click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);

  await context.close();
});
