import { expect, test, type Page } from "@playwright/test";

import { addMember, createProject, createWorkspace, signUpViaApi, uniqueId, uniqueUser } from "./helpers";

/** Board column by heading. Not role-based: the modal panel hides the board from the a11y tree. */
function column(page: Page, name: string) {
  return page.locator("section").filter({ has: page.locator("h2", { hasText: new RegExp(`^${name}$`) }) });
}

function card(page: Page, id: string) {
  return page
    .getByTestId("task-card")
    .filter({ has: page.locator("span.font-mono", { hasText: new RegExp(`^${id}$`) }) });
}

async function addTask(page: Page, columnName: string, title: string) {
  const col = column(page, columnName);
  await col.getByRole("button", { name: "Görev ekle" }).click();
  await col.getByRole("textbox").fill(title);
  await col.getByRole("textbox").press("Enter");
  await col.getByRole("textbox").press("Escape");
  await expect(col.getByTestId("task-card").filter({ hasText: title }).locator("span.font-mono")).not.toHaveText(/…/);
}

async function choose(page: Page, field: string, option: string | RegExp) {
  const panel = page.getByRole("dialog");
  await panel.getByRole("combobox", { name: field }).click();
  await page.getByRole("option", { name: option }).click();
}

/** Resolves when the next successful server action (POST) finishes. */
function nextSave(page: Page) {
  return page.waitForResponse((r) => r.request().method() === "POST" && r.ok());
}

test("panel: düzenleme, panoya yansıma, bana atananlar ve yorumlar", async ({ browser }) => {
  // Long two-user flow with ~15 saves; with a far-away DB (CI) it needs more than the default.
  test.setTimeout(180_000);
  const owner = uniqueUser("Sahip");
  const ownerContext = await browser.newContext();
  const page = await ownerContext.newPage();
  await signUpViaApi(ownerContext, owner);
  const slug = await createWorkspace(page, `Panel ${uniqueId()}`);
  const { member, page: memberPage, context: memberContext } = await addMember(browser, page, slug, "Ekip");
  await page.goto(`/w/${slug}`);
  await createProject(page, "Mobil Uygulama", "MOB");
  await addTask(page, "Yapılacak", "Ödeme ekranı");

  // Click opens the panel via ?task= (shareable).
  await card(page, "MOB-1").click();
  await expect(page).toHaveURL(`/w/${slug}/p/MOB?task=MOB-1`);
  const panel = page.getByRole("dialog");
  await expect(panel.getByLabel("Başlık")).toHaveValue("Ödeme ekranı");

  // Title: inline edit, Enter saves, board card follows.
  let saved = nextSave(page);
  await panel.getByLabel("Başlık").fill("Ödeme ekranı tasarımı");
  await panel.getByLabel("Başlık").press("Enter");
  await saved;
  await expect(card(page, "MOB-1")).toContainText("Ödeme ekranı tasarımı");

  // Status: card moves column immediately.
  await choose(page, "Durum", "Yapılıyor");
  await expect(column(page, "Yapılıyor").getByTestId("task-card")).toHaveCount(1);

  // Assignee, priority, due date, labels.
  saved = nextSave(page);
  await choose(page, "Atanan", member.name);
  await saved;
  await expect(card(page, "MOB-1").getByTitle(member.name)).toBeVisible();
  await choose(page, "Öncelik", "Yüksek");
  await expect(card(page, "MOB-1").getByText("Yüksek")).toBeAttached();

  saved = nextSave(page);
  await panel.getByLabel("Bitiş tarihi").fill("2027-03-15");
  await panel.getByLabel("Bitiş tarihi").press("Enter");
  await saved;
  await expect(card(page, "MOB-1")).toContainText("15 Mar");

  await panel.getByRole("button", { name: /^Etiketler:/ }).click();
  await page.getByLabel("Yeni etiket adı").fill("Backend");
  await page.getByLabel("Yeni etiket adı").press("Enter");
  await expect(page.getByRole("checkbox", { name: "Backend" })).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(card(page, "MOB-1").getByText("Backend")).toBeVisible();

  // Description: Ctrl+Enter saves; Escape inside the field doesn't close the panel.
  saved = nextSave(page);
  await panel.getByLabel("Açıklama").fill("Kart ve havale seçenekleri olacak.");
  await panel.getByLabel("Açıklama").press("Control+Enter");
  await saved;
  await panel.getByLabel("Açıklama").fill("geçici");
  await panel.getByLabel("Açıklama").press("Escape");
  await expect(panel.getByLabel("Açıklama")).toHaveValue("Kart ve havale seçenekleri olacak.");
  await expect(panel).toBeVisible();

  // Comment.
  await panel.getByLabel("Yorum yaz").fill("Tasarım taslağı Figma'da.");
  await panel.getByLabel("Yorum yaz").press("Control+Enter");
  await expect(panel.getByText("Tasarım taslağı Figma'da.")).toBeVisible();

  // Escape closes the panel; the URL goes back.
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(page).toHaveURL(`/w/${slug}/p/MOB`);

  // Everything persisted: open the shared link fresh.
  await page.goto(`/w/${slug}/p/MOB?task=MOB-1`);
  const reopened = page.getByRole("dialog");
  await expect(reopened.getByLabel("Başlık")).toHaveValue("Ödeme ekranı tasarımı");
  await expect(reopened.getByRole("combobox", { name: "Durum" })).toContainText("Yapılıyor");
  await expect(reopened.getByRole("combobox", { name: "Atanan" })).toContainText(member.name);
  await expect(reopened.getByRole("combobox", { name: "Öncelik" })).toContainText("Yüksek");
  await expect(reopened.getByLabel("Bitiş tarihi")).toHaveValue("2027-03-15");
  await expect(reopened.getByLabel("Açıklama")).toHaveValue("Kart ve havale seçenekleri olacak.");
  await expect(reopened.getByRole("button", { name: /^Etiketler: Backend/ })).toBeVisible();

  // --- Member: "Bana atananlar" shows the task; comment permissions. ---
  await memberPage.goto(`/w/${slug}/p/MOB?assignee=me`);
  await expect(card(memberPage, "MOB-1")).toBeVisible();
  await memberPage.goto(`/w/${slug}/p/MOB?assignee=none`);
  await expect(card(memberPage, "MOB-1")).toHaveCount(0);

  await memberPage.goto(`/w/${slug}/p/MOB?task=MOB-1`);
  const memberPanel = memberPage.getByRole("dialog");
  const ownerComment = memberPanel.getByRole("listitem").filter({ hasText: "Tasarım taslağı" });
  await expect(ownerComment).toBeVisible();
  // Not the author: no edit/delete controls, and not the task creator: no delete task.
  await expect(ownerComment.getByRole("button", { name: "Düzenle" })).toHaveCount(0);
  await expect(memberPanel.getByRole("button", { name: "Görevi sil" })).toHaveCount(0);

  // Own comment: add, then edit (and capture that server action request).
  await memberPanel.getByLabel("Yorum yaz").fill("Bugün bakıyorum.");
  await memberPanel.getByRole("button", { name: "Yorum yap" }).click();
  const myCommentId = await memberPanel
    .getByRole("listitem")
    .filter({ hasText: "Bugün bakıyorum." })
    .getAttribute("data-comment-id");
  // Pin by id: in edit mode the text moves into a textarea value.
  const myComment = memberPanel.locator(`[data-comment-id="${myCommentId}"]`);
  await myComment.getByRole("button", { name: "Düzenle" }).click();
  await myComment.getByLabel("Yorumu düzenle").fill("Bugün bitiriyorum.");
  const editRequest = memberPage.waitForRequest((r) => !!r.headers()["next-action"] && !!r.postData()?.includes("Bugün bitiriyorum."));
  await myComment.getByRole("button", { name: "Kaydet" }).click();
  const request = await editRequest;
  await expect(memberPanel.getByText("Bugün bitiriyorum.")).toBeVisible();
  await expect(memberPanel.getByText("(düzenlendi)")).toBeVisible();

  // Server-side rule: replay the same action against the owner's comment as the member.
  const ownerCommentId = await ownerComment.getAttribute("data-comment-id");
  const forged = request.postData()!.replace(myCommentId!, ownerCommentId!).replace("Bugün bitiriyorum.", "Ele geçirildi");
  const response = await memberContext.request.post(request.url(), {
    headers: { "next-action": request.headers()["next-action"], "content-type": request.headers()["content-type"] },
    data: forged,
  });
  expect(await response.text()).toContain("Yalnızca kendi yorumunu değiştirebilirsin.");
  await page.reload();
  await expect(page.getByRole("dialog").getByText("Tasarım taslağı Figma'da.")).toBeVisible();
  await expect(page.getByRole("dialog").getByText("Ele geçirildi")).toHaveCount(0);

  await ownerContext.close();
  await memberContext.close();
});

test("panel: klavyeyle açılır, geri tuşu kapatır, silme ve bulunamayan görev", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signUpViaApi(context, uniqueUser());
  const slug = await createWorkspace(page, `Panel ${uniqueId()}`);
  await createProject(page, "Web", "WEB");
  await addTask(page, "Backlog", "Silinecek görev");

  // Enter on a focused card opens the panel; browser Back closes it.
  await card(page, "WEB-1").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`/w/${slug}/p/WEB?task=WEB-1`);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page).toHaveURL(`/w/${slug}/p/WEB`);

  // Creator can delete; the card disappears and the panel closes.
  await card(page, "WEB-1").click();
  await page.getByRole("dialog").getByRole("button", { name: "Görevi sil" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Görevi sil" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(card(page, "WEB-1")).toHaveCount(0);

  // A deleted / unknown task link shows a not-found panel instead of crashing.
  await page.goto(`/w/${slug}/p/WEB?task=WEB-1`);
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Görev bulunamadı" })).toBeVisible();

  await context.close();
});
