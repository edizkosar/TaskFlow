# TaskFlow — MVP Planı

Ekipler için Linear tarzı proje ve görev yönetim aracı. Bu belge MVP'nin mimarisini, veri modelini ve faz planını tanımlar. Kod yazımı bu plana göre ilerler; plandan sapma gerekirse önce bu belge güncellenir.

## 1. Kapsam

**MVP'de var**

- E-posta + şifre ile kayıt / giriş
- Workspace (çalışma alanı) oluşturma, üye davet etme, roller (owner / admin / member)
- Workspace altında projeler
- Proje bazlı **Kanban panosu** (sürükle-bırak ile durum ve sıra değişikliği)
- **Görev detay paneli**: başlık, açıklama, durum, öncelik, atanan kişi, bitiş tarihi, etiketler, yorumlar
- Linear tarzı arayüz: sol sidebar + ana çalışma alanı, koyu/açık mod, temel klavye kısayolları

**MVP'de yok (Faz 2+)**

- Liste görünümü, takvim görünümü
- Gerçek zamanlı (canlı) güncelleme — MVP'de değişiklikler kaydetme/yenileme ile görünür
- OAuth (Google/GitHub) ile giriş, şifre sıfırlama e-postası
- Bildirimler, dosya ekleri, alt görevler, aktivite geçmişi
- Davetlerin gerçek e-posta ile gönderimi (MVP'de davet linki ekranda/konsolda gösterilir)

## 2. Teknoloji kararları

| Alan | Seçim | Gerekçe |
|---|---|---|
| Framework | Next.js 16.3.8 (App Router, Server Components, Server Actions) | Zaten kurulu; API katmanı ayrıca yazmadan form ve mutasyonlar |
| Dil | TypeScript (strict) | |
| Stil / UI | Tailwind CSS 4 + **shadcn/ui** | Erişilebilir, sahiplenilebilir bileşenler (kod projeye kopyalanır) |
| Tema | `next-themes` | Koyu/açık mod, sistem tercihi |
| Veritabanı | **Neon** (bulut Postgres) | Docker/yerel Postgres yok; ücretsiz katman, dev için ayrı branch |
| ORM | **Prisma 7.10.0** (sabit sürüm) | İlişkisel veri için standart. ⚠️ npm `latest` etiketi şu an `8.0.0-rc` gösteriyor; sürüm mutlaka açıkça belirtilecek |
| Auth | **Better Auth** + organization eklentisi | Workspace/üye/davet/rol hazır; veriler kendi Postgres'imizde; dış servis ve kullanıcı limiti yok |
| Doğrulama | Zod | Server Action girdileri |
| Sürükle-bırak | `@dnd-kit` | Kanban; klavye ile erişilebilir sürükleme |
| Sıralama | Fractional indexing (string `position`) | Taşımada yalnızca tek satır güncellenir |
| Test | Playwright Test (E2E) + `playwright-cli` (görsel kontrol) | Edge kanalı kullanılır (`.playwright/cli.config.json`) |

> **Not:** `AGENTS.md` gereği her fazda kod yazmadan önce ilgili Next.js 16 kılavuzu `node_modules/next/dist/docs/` altından okunur (ör. Next 16'da `middleware.ts` → `proxy.ts`). Prisma 7 ve Better Auth için de kurulu sürümün dokümantasyonu esas alınır.

## 3. Veri modeli

Workspace kavramı Better Auth'un **organization** tablosuna karşılık gelir. Auth tabloları (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`) Better Auth CLI ile Prisma şemasına üretilir; uygulama tabloları aşağıdadır.

```
Organization (= Workspace)  ── Better Auth
 ├─ Member (userId, role: owner|admin|member)  ── Better Auth
 ├─ Invitation (email, role, status, expiresAt)  ── Better Auth
 ├─ Label (name, color)
 └─ Project (name, key "MOB", description, taskCounter)
     └─ Task
         ├─ number        → görünen kimlik: MOB-12 (projectId+number unique)
         ├─ title, description
         ├─ status        → BACKLOG | TODO | IN_PROGRESS | DONE
         ├─ priority      → NONE | LOW | MEDIUM | HIGH | URGENT
         ├─ position      → fractional index (sütun içi sıra)
         ├─ assigneeId?   → User (aynı workspace'in üyesi olmalı)
         ├─ creatorId     → User
         ├─ dueDate?
         ├─ labels        → TaskLabel (çoka-çok)
         └─ comments      → Comment (authorId, body, createdAt)
```

Kurallar:

- Her uygulama tablosu `organizationId` taşır (Task proje üzerinden); tüm sorgular aktif workspace ile filtrelenir.
- Görev numarası, proje `taskCounter` alanının transaction içinde artırılmasıyla üretilir.
- Proje `key` değeri workspace içinde benzersizdir (2–5 büyük harf).
- Silmeler: proje silinirse görevleri ve yorumları da silinir (cascade); kullanıcı workspace'ten çıkarılırsa görevleri atanmamış duruma düşer.

## 4. Yetkilendirme

| İşlem | owner | admin | member |
|---|:-:|:-:|:-:|
| Görev oluştur / düzenle / taşı / yorum yaz | ✅ | ✅ | ✅ |
| Proje oluştur / düzenle | ✅ | ✅ | ❌ |
| Proje sil | ✅ | ✅ | ❌ |
| Üye davet et / çıkar, rol değiştir | ✅ | ✅ | ❌ |
| Workspace sil | ✅ | ❌ | ❌ |

- Yetki kontrolü **sunucuda** yapılır: her Server Action ve veri okuma fonksiyonu `src/server/` altındaki erişim katmanından geçer (`requireMember(orgId, minRole)`).
- `proxy.ts` yalnızca oturumu olmayan kullanıcıyı `/login`'e yönlendirir; asıl yetki kontrolü veri katmanındadır.
- Kendi yorumunu yalnızca yazarı düzenleyebilir/silebilir.

## 5. Sayfa ve URL yapısı

| URL | İçerik |
|---|---|
| `/login`, `/signup` | Giriş / kayıt |
| `/onboarding` | İlk workspace'i oluşturma |
| `/invite/[invitationId]` | Daveti kabul et |
| `/w/[slug]` | Workspace ana sayfası → ilk projeye yönlendirir |
| `/w/[slug]/p/[key]` | Proje Kanban panosu |
| `/w/[slug]/p/[key]?task=MOB-12` | Pano + görev detay paneli (paylaşılabilir link) |
| `/w/[slug]/settings` | Workspace ayarları, üyeler, davetler, etiketler |

Arayüz iskeleti: sol sidebar (workspace değiştirici, proje listesi, ayarlar, kullanıcı menüsü) + ana alan (pano başlığı, filtreler, sütunlar).

## 6. Klasör yapısı

```
src/
  app/
    (auth)/login, signup
    (app)/onboarding, w/[slug]/...      ← oturum gerektiren alan
    invite/[invitationId]
    api/auth/[...all]/route.ts           ← Better Auth handler
  components/
    ui/                                  ← shadcn bileşenleri
    board/, task/, sidebar/              ← özellik bileşenleri
  lib/
    auth.ts, auth-client.ts              ← Better Auth sunucu/istemci
    db.ts                                ← Prisma client (tekil)
    utils.ts
  server/
    access.ts                            ← requireSession, requireMember
    projects.ts, tasks.ts, comments.ts   ← veri erişimi + Server Actions
prisma/
  schema.prisma
  seed.ts                                ← demo workspace/proje/görevler
prisma.config.ts
proxy.ts
tests/e2e/                               ← Playwright Test
```

## 7. Ortam değişkenleri

`.env.example` (commit edilir, değer içermez) — gerçek değerler `.env.local` dosyasına girilir (gitignore'da):

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | Neon **pooled** bağlantı adresi (uygulama) |
| `DIRECT_URL` | Neon **direct** bağlantı adresi (migration) |
| `BETTER_AUTH_SECRET` | En az 32 karakter rastgele değer |
| `BETTER_AUTH_URL` | `http://localhost:3000` |

## 8. Fazlar

Her faz sonunda: `npm run lint`, `npm run build`, tarayıcıda kontrol, ilgili Playwright testleri ve **tek bir commit**. Bir faz bitmeden sonrakine geçilmez.

### Faz 0 — Altyapı ✅

- shadcn/ui kurulumu (`components.json`, temel bileşenler), `next-themes`
- Prisma 7.10.0 + Neon bağlantısı, `prisma.config.ts`
- Better Auth (e-posta/şifre + organization eklentisi), Prisma şemasının üretilmesi, ilk migration
- `/login`, `/signup`, `proxy.ts` ile koruma, çıkış yapma
- `.env.example`, Playwright Test kurulumu (`playwright.config.ts`, Edge kanalı)

**Kabul:** Kayıt ol → giriş yap → korumalı sayfaya eriş → çıkış yap akışı E2E testte geçiyor.

### Faz 1 — Workspace ve üyeler

- Onboarding: workspace adı + slug
- Sidebar'da workspace değiştirici
- Ayarlar: üye listesi, davet oluşturma (link gösterilir), rol değiştirme, üye çıkarma
- Davet kabul sayfası

**Kabul:** Kullanıcı A workspace oluşturur, B'yi davet eder; B linkle katılır ve rolüne göre yetkileri doğru.

### Faz 2 — Projeler ve uygulama iskeleti

- Sidebar proje listesi, proje oluştur/düzenle/sil (admin+)
- Boş durumlar, yükleme iskeletleri, koyu/açık mod geçişi
- `design-taste-frontend` ile görsel yön; tasarım token'ları `globals.css`'te

**Kabul:** Admin proje oluşturur, member oluşturamaz; tema tercihi kalıcı.

### Faz 3 — Kanban panosu

- 4 sütun (Backlog, Yapılacak, Yapılıyor, Tamamlandı), sütun başına görev sayısı
- Hızlı görev oluşturma (sütun içinden)
- `@dnd-kit` ile sütunlar arası ve sütun içi sürükle-bırak; iyimser (optimistic) güncelleme
- Görev kartı: `MOB-12`, başlık, öncelik, atanan kişinin avatarı, bitiş tarihi, etiketler
- Filtre: atanan kişi, etiket, "bana atananlar"

**Kabul:** Görev taşındığında yenilemeden sonra da yeni yerinde; klavyeyle taşınabiliyor.

### Faz 4 — Görev detay paneli

- Sağdan açılan panel (`?task=MOB-12`), linkle doğrudan açılabilir
- Başlık/açıklama düzenleme, durum, öncelik, atanan kişi (yalnızca üyeler), bitiş tarihi, etiket seçimi/oluşturma
- Yorumlar: ekle, düzenle, sil (yazar)
- Görevi silme (onaylı)

**Kabul:** B'ye atanan görev B'nin "bana atananlar" filtresinde görünüyor; yorumlar iki kullanıcıda da görünüyor.

### Faz 5 — Cila ve doğrulama

- Komut paleti (Ctrl+K): görev ara, projeye git, yeni görev
- Kısayollar: `C` yeni görev, `Esc` paneli kapat
- `web-design-guidelines` ile erişilebilirlik/UX incelemesi ve düzeltmeler
- Seed verisiyle tam E2E senaryosu, koyu/açık mod ve mobil genişlik görsel kontrolü

**Kabul:** E2E paketi yeşil; inceleme bulguları kapatıldı.

## 9. Test stratejisi

- **E2E (Playwright Test):** her fazın kabul senaryosu bir test; testler kendi kullanıcı/workspace verisini oluşturur (benzersiz `@taskflow.test` e-postaları).
- **Test sunucusu:** `next build` + `next start` (port 3100). Next.js aynı projede ikinci bir `next dev`'e izin vermediği için dev server ile çakışmaz.
- **Test veritabanı:** `.env.test.local` varsa (Neon `test` branch'i) test sunucusu onu kullanır; yoksa `.env.local`'daki veritabanına yazar.
- **Görsel kontrol:** `playwright-cli` ve tarayıcı paneli ile koyu/açık mod, 375px mobil genişlik.
- Oturum dosyaları (`playwright/.auth/`) gitignore'da.

## 10. Riskler ve açık konular

| Risk | Önlem |
|---|---|
| Next.js 16 / Prisma 7 API'leri eğitim verisinden farklı | Kurulu sürümün dokümantasyonu her fazda okunur |
| Prisma `latest` etiketinin RC göstermesi | Sürüm `7.10.0` olarak sabitlenir |
| Gerçek zamanlı güncelleme yok | MVP'de kabul edildi; Faz 2+'da polling veya websocket |
| Davet e-postası yok | MVP'de link kopyalanır; sonra Resend vb. eklenir |
| `npm audit`: eslint-config-next zincirinde 5 yüksek (yalnızca dev) | Next.js güncellemelerinde tekrar kontrol |

## 11. Başlamadan önce kullanıcının yapacakları

1. [neon.tech](https://neon.tech) üzerinde hesap ve `taskflow` projesi oluştur (bölge: Frankfurt `eu-central-1` önerilir).
2. Bağlantı ayrıntılarından **pooled** ve **direct** adresleri kopyala.
3. Proje kökünde `.env.local` oluşturup `DATABASE_URL` ve `DIRECT_URL` değerlerini gir (değerleri sohbete yapıştırma).
4. `BETTER_AUTH_SECRET` için rastgele değer üret:
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
5. `.env.local` içine `BETTER_AUTH_URL=http://localhost:3000` satırını ekle (gizli değil, ama gerekli).
6. (Faz 0 test kurulumunda) Neon'da `test` branch'i oluştur.
