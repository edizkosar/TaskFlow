# TaskFlow: proje devir belgesi (handoff)

> **Bu belge ne için?** Yeni bir Claude oturumu (ya da yeni bir geliştirici) projeye sıfırdan başladığında, önceki uzun sohbette verilen kararları, nedenlerini ve yaşanan tuzakları kaybetmeden devam edebilsin diye yazıldı. Önce bunu, sonra [`CLAUDE.md`](../CLAUDE.md) (kod kuralları) ve [`docs/PLAN.md`](PLAN.md) (mimari ve faz planı) okunmalı.
>
> Son güncelleme: 2026-10-09; son kod commit'i `b47fb24` (README galerisi, ekran görüntüsü üretici, bu belge). Proje burada bilerek durduruldu; devam planı §11'de.

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
| GitHub | `https://github.com/edizkosar/TaskFlow` (**public** since 2026-10-10; açıklama + topic'ler eklendi). `gh` kurulu: `C:\Program Files\GitHub CLI\gh.exe` (bazı terminallerde PATH'te değil, tam yolla çağır). `gh auth setup-git` yapıldı (global git credential helper). |
| Veritabanı | **Neon** Postgres, Frankfurt (`eu-central-1`). Branch'ler: `production` (Neon'un varsayılan branch adı; **adına rağmen dev verisi**, `.env.local`), `test` (E2E, `.env.test.local` + CI secret'ları) ve `live` (canlı site, `.env.vercel`). `test` ve `live`'da son kullanma tarihi kaldırıldı. Collation `C.UTF-8`. |
| Canlı site | **https://task-flow-lovat-tau.vercel.app** (Vercel Hobby, proje `task-flow`, hesap `ediz-kosar`, GitHub'dan otomatik deploy). Bölge `vercel.json` ile `fra1`. Vercel env (Production): `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET` (yalnızca canlıya özel), `BETTER_AUTH_URL`. Değerlerin yerel kopyası gitignore'daki `.env.vercel` (Next.js bu dosyayı yüklemez). |
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

**Bırakıldığı an (2026-10-09):** kod `main`'de ve GitHub'da (son kod commit'i `b47fb24`), CI yeşil (18/18, flaky yok), çalışma alanı temiz. Kullanıcı bilerek burada durdu; aşağıdakiler kullanıcı isteyince sırayla yapılacak. **A, B ve C (demo linki) tamamlandı (2026-10-10); kalan yalnızca opsiyonel D.** Kullanıcıyla konuşulan önerilen sıra: (A) depoyu public yapmak → (B) Vercel'e yayınlamak → (C) README'ye canlı demo linki → (D) opsiyonel özellikler.

### A. Depoyu public yapmak: TAMAMLANDI (2026-10-10)
Geçmiş taraması temizdi (16 commit; env değerleri, şifre/token kalıpları yok; tek URL eşleşmesi `.env.example` yer tutucusu). Kullanıcı onayıyla public yapıldı; açıklama ve topic'ler (`nextjs`, `typescript`, `prisma`, `kanban`, `tailwindcss`) eklendi. CI rozeti (passing) ve README görselleri anonim erişimde 200 dönüyor. Aşağıdaki adımlar kayıt için duruyor.

1. Tüm git geçmişini tekrar tara: commit'lenmiş dosya adlarında `.env*` (`.env.example` hariç), `*.local.md`, `.pem`, `auth.json`, `storage-state*` olmamalı; `.env.local` ve `.env.test.local`'daki gerçek değerler (DB şifreleri, hostlar, `BETTER_AUTH_SECRET`) `git log --all -p` içinde geçmemeli. (Son tarama `59ce633`'te temizdi; sonrasında yalnızca kod/doküman eklendi.)
2. Kullanıcıdan açık "public yap" onayı al (public olan içerik kopyalanabilir; private'a dönmek bunu geri almaz).
3. `gh repo edit edizkosar/TaskFlow --visibility public --accept-visibility-change-consequences` (tam yol: `C:\Program Files\GitHub CLI\gh.exe`).
4. README'deki CI rozeti ve görsellerin herkese göründüğünü kontrol et. İsteğe bağlı: depo açıklaması + topic'ler (`nextjs`, `typescript`, `prisma`, `kanban`, `tailwindcss`).

### B. Canlıya alma: Vercel + Neon: TAMAMLANDI (2026-10-10)
Canlı: https://task-flow-lovat-tau.vercel.app. Neon `live` branch'i `production`'dan (dev) açıldı, kullanıcı verisi SQL Editor'da `TRUNCATE` ile temizlendi (Claude Code auto mode toplu silmeyi engelledi), `migrate deploy` = no pending. Canlıda doğrulanan: sayfalar 200 ve `fra1`, yabancı Origin'den giriş 403, kayıt/giriş, workspace, proje, görev, panel (açıklama, yorum, etiket, öncelik), klavyeyle sürükle-bırak (reload sonrası kalıcı), Ctrl+K arama, konsolda uygulama hatası yok. Not: Claude'un kurallarına göre canlı sitede hesap açmayı/şifreyle girişi kullanıcı yapar; tarayıcı panelinde kullanıcı girdikten sonra testler yapılır. Canlı migration: `DIRECT_URL=<.env.vercel'den> npx prisma migrate deploy`. Aşağıdaki adımlar kayıt için duruyor.

1. **Kullanıcı:** Vercel hesabı; Neon'da `production` branch'i (dev `main`'den değil, boş/temiz başlaması tercih edilir).
2. Production DB'ye migration: `DIRECT_URL=<prod direct> npx prisma migrate deploy` (değeri ekrana yazdırmadan).
3. Vercel projesi: GitHub'dan `edizkosar/TaskFlow` import; **Function region `fra1`** (Neon Frankfurt ile aynı; yoksa her kayıt saniyeler sürer, CI'da ~3,5 sn ölçüldü).
4. Vercel env: `DATABASE_URL` (prod pooled), `DIRECT_URL` (prod direct), **yeni** `BETTER_AUTH_SECRET` (dev/test ile aynı olmasın), `BETTER_AUTH_URL=https://<alan-adı>`. `E2E_DISABLE_RATE_LIMIT` **eklenmez** (rate limit açık kalmalı).
5. Build komutu varsayılan (`next build`; `postinstall` Prisma client'ı üretir).
6. Yayından sonra kontrol: kayıt/giriş, workspace, proje, görev, sürükle-bırak, panel, palet; tarayıcı konsolu temiz; sağlık için ilk istekler `fra1`'de mi.
7. Dikkat: production'da Better Auth `BETTER_AUTH_URL` gerçek alan adı olmalı (çerezler/redirect). Davet linkleri `window.location.origin` ile oluşur, ek ayar gerekmez.

### C. CV cilası: TAMAMLANDI (2026-10-10)
README başına canlı demo linki ve GitHub depo "homepage" alanı eklendi. Demo hesabı açılmadı (kullanıcı tercihi): ziyaretçiler kendileri kayıt olur. Aşağıdaki maddeler kayıt için duruyor.
- README'nin başına canlı demo linki; isteğe bağlı salt-okunur bir **demo hesabı** + seed (şu an seed betiği yok; `tests/screenshots/demo.spec.ts` demo verisini nasıl kuracağını gösterir, Prisma tabanlı bir `prisma/seed.ts` olarak uyarlanabilir).
- Görselleri yenilemek: `npm run screenshots` (test DB'ye yazar).

### D. Opsiyonel özellikler (CV için şart değil)
Davet e-postası (Resend), şifre sıfırlama, workspace yeniden adlandırma/silme, üyenin kendi ayrılması, liste/takvim görünümü, gerçek zamanlı güncelleme, `pg_trgm` arama indeksi (binlerce görevde), panel verisini ayrı GET ile yükleyip pano sorgusunun tekrarını önlemek.

### Küçükler (kullanıcı tarafı ya da düşük öncelik)
- `.env.local` / `.env.test.local`'da `sslmode=require` → `sslmode=verify-full` (pg uyarısını kaldırır; kullanıcı kendisi yapacak).
- `npm audit`: 5 yüksek uyarı yalnızca `eslint-config-next` zincirinde (dev); Next güncellemelerinde tekrar bak, `npm audit fix --force` kullanma.
- CI süresi (~5-9 dk) ABD runner ↔ Frankfurt DB gecikmesinden; istenirse ABD bölgesinde ayrı bir Neon test DB'si ile hızlanır.

## 12. Yeni oturumda hızlı başlangıç

```bash
git pull
npm ci
npm run dev            # http://localhost:3000
npm run lint && npm run typecheck
npm run test:e2e       # .env.test.local gerekir
```

Değişiklik yaparken: `CLAUDE.md` kurallarına uy, UI değiştiyse axe testleri yeşil kalmalı, her anlamlı adım tek commit + push (CI'ı izle; flaky çıkarsa nedenini bul, tekrar denemeye güvenme).
