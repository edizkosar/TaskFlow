# TaskFlow: proje devir belgesi (handoff)

> **Bu belge ne için?** Yeni bir Claude oturumu (ya da yeni bir geliştirici) projeye sıfırdan başladığında, önceki uzun sohbette verilen kararları, nedenlerini ve yaşanan tuzakları kaybetmeden devam edebilsin diye yazıldı. Önce bunu, sonra [`CLAUDE.md`](../CLAUDE.md) (kod kuralları) ve [`docs/PLAN.md`](PLAN.md) (mimari ve faz planı) okunmalı.
>
> Son güncelleme: 2026-10-09, commit `8a164ec` sonrası (README galerisi + bu belge).

---

## 1. Proje ve kullanıcı bağlamı

- **Ne:** Linear tarzı ekip görev yönetimi: workspace, roller, davet, proje, Kanban panosu, görev paneli, yorumlar, komut paleti.
- **Neden:** Kullanıcının **CV / GitHub portföy projesi**. Gerçek bir ekip tarafından kullanılmayacak. Bu yüzden görsel kalite ("premium SaaS", Linear/Vercel estetiği) önemli; ekip özellikleri (e-posta daveti, gerçek zamanlı) öncelikli değil.
- **Kullanıcı:** GitHub `edizkosar`. Sohbet dili **Türkçe**; arayüz de Türkçe. Kod, yorumlar ve commit mesajları İngilizce.
- **Çalışma tarzı (kullanıcının tercihleri):**
  - Riskli ya da geri alınamaz işlerden önce (git yapısı, silme, push, dış servise veri gönderme) **önce göster, onay al**.
  - Her fazın sonunda: lint, typecheck, build, tarayıcı kontrolü, E2E, **tek commit**.
  - Önerilere körü körüne uyma; yanlış ya da riskli bir öneriyi gerekçesiyle düzelt (ör. fractional indexing algoritması, `transition-all`, debounce ile kaydetme önerileri reddedildi/değiştirildi, aşağıda).
  - Gizli değerler (şifre, bağlantı adresi, secret) asla sohbete yazılmaz.
- **Durum:** MVP'nin 5 fazı + CI + iki tasarım geçişi tamam. Canlıya alınmadı (Vercel adımı bekliyor, bkz. §11).

## 2. Ortam ve hesaplar (değer yok, yalnızca nerede olduğu)

| Şey | Nerede / nasıl |
|---|---|
| Proje klasörü | `C:\Users\Ediz-\Desktop\My_Projects\TaskFlow` (Windows 11, PowerShell + Git Bash) |
| Git | Depo kökü proje klasörü, dal `main`. (Başta yanlışlıkla `C:\Users\Ediz-` kökünde boş bir repo vardı; kaldırıldı.) |
| GitHub | `https://github.com/edizkosar/TaskFlow` (**private**). `gh` kurulu: `C:\Program Files\GitHub CLI\gh.exe` (bazı terminallerde PATH'te değil, tam yolla çağır). `gh auth setup-git` yapıldı (global git credential helper). |
| Veritabanı | **Neon** Postgres, Frankfurt (`eu-central-1`). Branch'ler: `main` (dev verisi, `.env.local`) ve `test` (E2E, `.env.test.local` + CI secret'ları). Collation `C.UTF-8`. |
| `.env.local` | `DATABASE_URL` (pooled), `DIRECT_URL` (direct), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:3000`. Gitignore'da. |
| `.env.test.local` | Aynı anahtarlar, Neon `test` branch'i. Playwright config bunu okur. |
| GitHub secrets | `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET` (test branch'i). `gh secret set` ile, değerler yazdırılmadan eklendi. |
| Dev deneme hesabı | `faz0-manual@taskflow.test`; şifre yerel, gitignore'daki `dev-accounts.local.md` dosyasında. Kullanıcının kendi hesabı da dev DB'de var. |
| Dev server | `npm run dev` → :3000 (`.claude/launch.json` adı `taskflow-dev`). |
| Bilinen uyarı | pg "SSL modes … verify-full" uyarısı: `.env.local`'da `sslmode=verify-full` yapılırsa kaybolur (kullanıcıya söylendi, kendisi yapacak). |

## 3. Teknoloji ve sürümler (sabitlenmiş olanlar önemli)

- **Next.js 16.3.8** (App Router, Turbopack, `proxy.ts` = eski middleware), **React 19.2.8**, TypeScript 5, **Tailwind CSS 4**.
- **shadcn/ui `base-nova`** stili: Radix değil **Base UI** (`@base-ui/react`); `asChild` yok, `render` prop'u var; `cn` yardımcı fonksiyonu `cn` paketinden gelir (shadcn'in kendi paketi, güvenli). Bileşen eklemek: `npx shadcn@4.21.4 add <ad>`; üzerine yazma sorarsa **hayır** (Türkçeleştirilmiş `dialog.tsx`, `sheet.tsx`, `sidebar.tsx` vb. var).
- **Prisma 7.10.0** (sabit; npm `latest` etiketi 8.0 RC gösteriyor!) + `@prisma/adapter-pg`. Client `src/generated/prisma`'ya üretilir (gitignore). Config `prisma.config.ts` (`.env.local`'ı yükler, migration için `DIRECT_URL`).
- **Better Auth 1.7.7** (e-posta/şifre + organization eklentisi = workspace). CLI paketi artık `auth` (eski `@better-auth/cli` değil).
- **@dnd-kit/core 6.3.1 + sortable 10.0.0** (yeni `@dnd-kit/react` 0.x kullanılmadı).
- **fractional-indexing 4.0.0**, **zod 4**, **next-themes**, **sonner**, **cmdk** (palet), **lucide-react** (tek ikon ailesi).
- Test: **@playwright/test 1.63.0** (Edge kanalı), **@axe-core/playwright 4.13.0**.

## 4. Klasör haritası (neyin nerede olduğu)

```
src/app/(auth)/login|signup        giriş/kayıt (AuthCard + cam efektli AuthStage)
src/app/(app)/page.tsx             aktif/ilk workspace'e yönlendirir, yoksa /onboarding
src/app/(app)/onboarding           ilk workspace
src/app/(app)/invite/[id]          davet kabul/ret, yanlış hesap uyarısı
src/app/(app)/w/[slug]/layout.tsx  sidebar + komut paleti + skip link
src/app/(app)/w/[slug]/page.tsx    ilk projeye yönlendirir, yoksa boş durum
src/app/(app)/w/[slug]/p/[key]     proje panosu + ?task= paneli (+ loading.tsx)
src/app/(app)/w/[slug]/settings    üyeler, davetler, roller
src/app/api/auth/[...all]          Better Auth handler
src/app/api/w/[slug]/search        GET görev araması (komut paleti)
src/proxy.ts                       yalnızca oturum çerezi kontrolü + ?next= yönlendirmesi
src/server/access.ts               requireSession, requireMember(slug, minRole) → üye değilse 404
src/server/queries.ts              okuma yardımcıları (server-only, yetki kontrolü YOK)
src/server/workspaces.ts|projects.ts|tasks.ts   "use server" mutasyonlar
src/server/task-dto.ts             Prisma select + DTO dönüşümü (BoardTask, TaskDetail)
src/components/board/*             pano: container (dnd), column, card, quick add, filter bar,
                                   optimistic-store, priority-icon, status-icon
src/components/task/*              panel: shell (Sheet, URL'den açılır), body (sunucu), content,
                                   label-picker, comments, use-task-save
src/components/app-sidebar/*       sidebar, workspace switcher, user menu
src/components/command-palette.tsx Ctrl/Cmd+K
src/components/brand.tsx           logo, AuthStage, glassCard
src/lib/*                          roles, slug, project-key, task-status/types, labels,
                                   board-filters, task-url, search, shortcuts, auth(-client|-errors), db
tests/e2e/*                        auth, workspace, projects, board, task-panel, palette, a11y
tests/screenshots/demo.spec.ts     README görüntüleri (npm run screenshots)
docs/PLAN.md                       mimari + fazlar + riskler;  docs/screenshots/*.png
.github/workflows/ci.yml           CI
.agents/skills, .claude/skills     ajan skill'leri (aşağıda)
```

## 5. Veri modeli (özet; ayrıntı `prisma/schema.prisma`)

- Better Auth tabloları: `user, session, account, verification, organization (=workspace), member (role: owner|admin|member), invitation`.
- Uygulama: `Project(organizationId, name, key unique/org, description, taskCounter)`, `Task(projectId, number unique/proje, title, description, status enum, priority enum, position TEXT COLLATE "C", assigneeId?, creatorId?, dueDate DATE?)`, `Label(organizationId, name unique/org, color)`, `TaskLabel(taskId, labelId)`, `Comment(taskId, authorId, body, editedAt?)`.
- Uygulama modelleri `schema.prisma`'nın **altında elle yazılı**. `npm run auth:generate` dosyanın tamamının üzerine yazar; çalıştırılırsa uygulama modellerini geri ekle.
- `task.position` için `COLLATE "C"` migration SQL'ine **elle** eklendi (Prisma bunu ifade edemiyor ama drift olarak da görmüyor; kontrol edildi).
- Migration'lar: `init_auth`, `add_project`, `add_tasks_labels`, `add_comments`.

## 6. Mimari kararlar ve nedenleri

1. **Yetki sunucuda.** Her mutasyon `requireMember(slug, minRole)` ile başlar ve sorguları `organizationId` ile kapsar. Üye olmayana 404 (workspace varlığı sızmasın). Better Auth'un kendi kuralları (owner'ı admin değiştiremez, son owner ayrılamaz) arayüzde `src/lib/roles.ts` ile aynalanır.
2. **Okuma fonksiyonları asla `"use server"` dosyasında değil** (oradaki her export dışarıdan çağrılabilir bir endpoint olur) → `queries.ts`.
3. **Sıralama:** `fractional-indexing` + `COLLATE "C"` + `position, id` ile sıralama. İstemci taşımada **komşu id'leri** gönderir, pozisyonu **sunucu** hesaplar (eski/sahte değere güvenmez; tutarsızsa sütun sonuna koyar). Kullanıcının önerdiği "orta nokta harfi / sona karakter ekle" algoritması reddedildi (a–b arası yok, anahtarlar uzar, Postgres collation JS'den farklı sıralar).
4. **İyimser güncelleme:** `src/components/board/optimistic-store.ts`: bileşen dışı modül deposu. Değişiklik `from → to` yamaları olarak tutulur ve **yalnızca sunucu hâlâ `from`'u gösteriyorsa** uygulanır (eski RSC yanıtı geri saramaz; başka kullanıcının değişikliği kazanır). Panel ve pano aynı depoyu kullanır (paneldeki değişiklik kartta anında). Hata → `reject` + toast. `boardStore.track()` kayıt sürerken `beforeunload` uyarısı verir. Sürükleme önizlemesi bileşen state'i; uçuştaki yeni görevler ayrı `pending` listesi (geçici kartlar sürüklenemez). `useOptimistic` kullanılmadı (geçiş bitince geri zıplıyor).
5. **URL = arayüz durumu:** filtreler `?assignee=me|none|<id>&label=<id>` (`router.replace`), panel `?task=MOB-12` (`router.push`; uygulama içinden açıldıysa kapatma = geri, paylaşılan linkse param silinir). Global store yok.
6. **Panel:** kabuk istemcide URL'den anında açılır, gövde sunucuda `Suspense` ile akar. Bedeli: `?task` değişince sayfa sunucu bileşeni ve pano sorgusu yeniden çalışır (MVP için kabul).
7. **Kayıt stratejisi (satır içi düzenleme):** tuş başına/debounce **değil**; blur, başlıkta Enter, açıklamada Ctrl+Enter, tarihte Enter/blur. Neden: her kayıt `revalidatePath` ile tam sayfa render'ı + Server Action kuyruğu → debounce = onlarca render + yarış. Değişmeyen değer gönderilmez, Esc geri alır.
8. **Okuma istekleri Route Handler (GET), Server Action değil:** Next Server Action'ları **tek tek kuyruğa alır**; arama gibi okumalar paralel ve iptal edilebilir olmalı (`AbortController`, 200 ms debounce).
9. **Türkçe arama:** DB `C.UTF-8` İ↔i eşler ama I↔ı eşlemez (ölçüldü). İki taraf da `ı→i` katlanır: istemcide `foldForSearch`, SQL'de `translate(lower(title),'ı','i')` (`$queryRaw`, parametreli, `%`/`_` kaçışlı).
10. **Kısayollar:** `Ctrl/Cmd+K` palet; `C` Yapılacak sütununda hızlı ekleme; yazı alanında ya da açık dialog varken (`[role=dialog][data-open]`) çalışmaz. Kartta Enter paneli açar, Space sürüklemeyi başlatır.
11. **Rate limit** production'da açık; yalnızca E2E sunucusunda `E2E_DISABLE_RATE_LIMIT=1`.
12. **Üye çıkarılınca** görevleri atanmamış olur (Better Auth `afterRemoveMember` kancası).

## 7. Tasarım sistemi (iki tasarım geçişinin sonucu)

- Tokenlar `src/app/globals.css` (oklch). Soğuk nötr gri (hue 265), **tek vurgu: kobalt `#2563eb`** (`oklch(0.546 0.215 262.9)`), radius `0.5rem`, Geist + Geist Mono. Saf beyaz/siyah yok.
- Koyu tema: zemin `0.185`, kart `0.22`, sidebar `0.14` (alanlar çizgiyle değil **ton farkıyla** ayrılır; ayırıcılar `border-border/30` / `dark:border-white/5`). Kobalt dolgu + **beyaz yazı** her iki temada.
- **Kontrast kuralları (axe ile doğrulandı):** `#2563eb` metin olarak açık kobalt zeminde ve koyu zeminde AA'yı geçmez → açık temada `text-blue-700`, koyu temada `text-blue-300/400`. Gecikmiş tarih: `text-red-700 dark:text-red-400`. Durum ikonları: Yapılacak `slate-500`, Yapılıyor `amber-600/400`, Tamamlandı `emerald-600/400`.
- Kart: silik ring + yumuşak dağılan gölge (koyu: üst iç ışık), hover'da `-translate-y-0.5`, sürüklenen kart hafif yatık. Üstte `MOB-12` (mono, 11px, kalın, büyük harf), başlık, etiket çipleri (büyük harf), **alt satır** (`text-[11px] text-muted-foreground`): `PriorityIcon` (Linear tarzı 3 çubuk; acil = turuncu "!" karosu; yok = tire) · tarih · yorum sayısı · sağda yuvarlak avatar (atanmamışsa kesikli daire).
- Pano: silik nokta deseni, yarı saydam halkalı sütunlar, sayaç hapları, sürüklerken kobalt vurgu, boş durum ikonları `size-4 strokeWidth={1} opacity-40`.
- Panel: cam efektli `Sheet` (`backdrop-blur-xl`), 300 ms ease-out sağdan kayma (Base UI `data-starting-style`; `animate-in` ile karıştırma, çakışır), sticky cam başlık, özellikler kart içinde küçük büyük harfli etiketlerle, hayalet select'ler, balon yorumlar.
- Sidebar: aktif öğe kobalt tint + sol 3px çubuk (`data-active:` varyantı), degrade workspace rozeti, proje rozeti renkleri koddan türetilir.
- Giriş/onboarding/davet: `AuthStage` (üstten kobalt ışıma + maskeli ızgara) + `glassCard` + `Brand` logosu.
- Hareket: `transition-all` **kullanılmaz** (web-design-guidelines); yalnızca `transform/box-shadow/renk`. `prefers-reduced-motion` global olarak animasyonları kapatır. Arayüz metinlerinde uzun tire (—) yok; Türkçe cümle düzeni (Title Case değil).
- `design-taste-frontend` skill'i landing page odaklı; dashboard'da seçici uygulandı.

## 8. Test ve CI

- `npm run test:e2e` → Playwright `edge` projesi, **production build** :3100 üzerinde (Next aynı projede ikinci `next dev`'e izin vermiyor). `.env.test.local` varsa onu kullanır. 18 test: auth, workspace/roller, projeler, pano (fare + klavye + dar ekran + geri alma), görev paneli (sahte Server Action isteğiyle yorum yetkisi testi dahil), palet + kısayollar, **axe WCAG 2.1 AA** (açık/koyu; giriş, pano, panel, ayarlar, palet, çipli kart).
- `npm run screenshots` → `screenshots` projesi, test DB'de demo workspace kurar, `docs/screenshots/*.png` üretir (CI'da çalışmaz).
- CI (`.github/workflows/ci.yml`): push/PR → `npm ci`, lint, typecheck, `prisma migrate deploy` (test DB), Edge kurulumu, E2E; hata olursa Playwright raporu artifact. CI runner ABD'de, DB Frankfurt'ta → **yavaş** (E2E ~5-9 dk, her görev kaydı ~3,5 sn). Bu yüzden testlerde 60 sn test / 10 sn expect zaman aşımı, uzun panel testine 180 sn.

## 9. Bilinen tuzaklar (hepsi yaşandı, tekrar yaşanmasın)

- **`prisma init` projede çalıştırma:** skill dosyaları yazar ve `skills-lock.json`'ı bozar.
- **Prisma client değişince** dev server'ı yeniden başlat (client `globalThis`'te önbellekli).
- **Turbopack dev önbelleği bozulursa** (sayfa iskelet ekranda kalır, konsolda eski "X is not defined" hataları): dev server'ı durdur, `.next/dev` klasörünü sil, yeniden başlat. Production build etkilenmez.
- **dnd-kit:**
  - Handler'lar eski render'dan çağrılabilir → veriyi `live.current` ref'inden oku.
  - `closestCorners` uzun boş sütunlarda yanlış hedefler → kendi collision (önce sütun, sonra en yakın kart).
  - `sortableKeyboardCoordinates` sola giderken kartın kendi sütununu aday sayar → kendi koordinat fonksiyonumuz (Sol/Sağ = sütun, Yukarı/Aşağı = komşu slot; `keyboardTarget` ref'i).
  - Klavye sensörü hedef ekran dışındaysa taşımak yerine kaydırır → hedef önce `scrollIntoView` ile görünür yapılır.
  - `li` öğesine `role=button` verilirse liste semantiği bozulur → `li > div[role=button]`.
- **Base UI:** açık popup'lar `data-open` taşır; kapanma animasyonundaki dialog DOM'da kalır.
- **Modal panel** arkadaki panoyu erişilebilirlik ağacından gizler → testte panel açıkken pano için `getByRole` değil DOM seçici kullan.
- **Next streaming:** `loading.tsx` olan sayfada `notFound()` HTTP 200 döner (içerik doğru 404 sayfası).
- **`router.push` URL'yi içerik gelmeden değiştirir** → testlerde URL değil yeni sayfanın içeriğini (ör. h1) bekle.
- **Test yarışları:** iyimser kartlar `MOB-…` gösterir; sonraki adımdan önce gerçek numarayı bekle. Reload'dan önce kaydın POST yanıtını bekle. Playwright tuşlara çok hızlı basar; klavye sürüklemede `aria-pressed` + iki animasyon karesi bekle (`keyboardMove`).
- **Bash aracı:** içinde `'` (kesme işareti) geçen uzun heredoc'lar ayrıştırılamayabilir → dosyaları Write/Edit ile yaz. Node `String.replace` değiştirme metninde `$\`` / `$'` özel anlam taşır (bir test dosyası böyle bozuldu) → `split().join()` kullan.
- Değişkenli `rm` komutları güvenlik kontrolüne takılır → `"${VAR:?}"` biçimi.

## 10. Agent skill'leri ve araçlar

- `.agents/skills/design-taste-frontend`, `.agents/skills/web-design-guidelines` (kaynak; `skills-lock.json` ile sabit). `.claude/skills/` altındaki aynı adlı klasörler **Windows junction** (gitignore'da; yeni klonda yeniden oluşturulmalı, komut `CLAUDE.md`'de).
- `.claude/skills/playwright-cli` (git'te) + `.playwright/cli.config.json` (Edge). Global `@playwright/cli` 0.1.22 kurulu.
- `web-design-guidelines` incelemesi Faz 5'te yapıldı; tüm bulgular kapatıldı.

## 11. Açık işler / sıradaki adımlar

1. **Canlıya alma (Vercel):** Neon'da `production` branch'i + `prisma migrate deploy`; Vercel env değişkenleri (yeni `BETTER_AUTH_SECRET`, gerçek `BETTER_AUTH_URL`); **bölge `fra1`** (DB ile aynı bölge, yoksa her kayıt saniyeler sürer). Dışa açık adım → kontrol listesi + kullanıcı onayı.
2. **CV görünürlüğü:** depo şu an private; README'deki CI rozeti ve görseller ancak public olunca herkese görünür. Public yapmadan önce geçmişte sır olmadığı tekrar taranmalı (en son tarama temizdi).
3. Demo verisi/seed betiği yok (screenshots betiği test DB'de demo kurar; canlı demo için ayrı seed + demo hesabı düşünülebilir).
4. MVP sonrası (CV için opsiyonel): davet e-postası (Resend), şifre sıfırlama, workspace yeniden adlandırma/silme, üyenin ayrılması, liste/takvim görünümü, gerçek zamanlı güncelleme, `pg_trgm` arama indeksi (binlerce görevde).
5. Küçükler: `npm audit` (yalnızca eslint-config-next zincirinde, dev), `sslmode=verify-full`.

## 12. Yeni oturumda hızlı başlangıç

```bash
git pull
npm ci
npm run dev            # http://localhost:3000
npm run lint && npm run typecheck
npm run test:e2e       # .env.test.local gerekir
```

Değişiklik yaparken: `CLAUDE.md` kurallarına uy, UI değiştiyse axe testleri yeşil kalmalı, her anlamlı adım tek commit + push (CI'ı izle; flaky çıkarsa nedenini bul, tekrar denemeye güvenme).
