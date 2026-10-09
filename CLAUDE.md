@AGENTS.md

# TaskFlow

Team task management app. Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, npm. Source lives in `src/app/`; import alias `@/*` → `src/*`.

Architecture, data model and phase plan: [docs/PLAN.md](docs/PLAN.md). Follow it; update it first if the plan changes.

## Commands

- `npm run dev` — dev server on http://localhost:3000 (also `.claude/launch.json` → `taskflow-dev`)
- `npm run lint` / `npm run build` — run both before considering a change done
- `npm run test:e2e` — Playwright Test (Edge) against a production build on :3100 (Next allows only one `next dev` per project)
- `npm run db:migrate` — create/apply a migration (uses `DIRECT_URL`); `npm run db:generate` regenerates the client into `src/generated/prisma` (gitignored)
- `npm run auth:generate` — regenerate Better Auth models into `prisma/schema.prisma`. It **overwrites the whole file**: copy app models back afterwards or edit auth models by hand.

## Stack notes

- Auth: Better Auth (`src/lib/auth.ts`, client `src/lib/auth-client.ts`); workspaces = organization plugin. `src/proxy.ts` only checks the session cookie; real checks go through `src/server/access.ts` (`requireSession`, `requireMember(slug, minRole)` → 404 for non-members). Rate limiting is on in production; the E2E server sets `E2E_DISABLE_RATE_LIMIT=1`.
- Workspace mutations are Server Actions in `src/server/workspaces.ts` that call `auth.api.*` with explicit `organizationId` (the URL slug is the source of truth, not the session's active org). Role rules for the UI live in `src/lib/roles.ts` and mirror Better Auth's server checks.
- DB: Prisma 7 with `@prisma/adapter-pg`; config in `prisma.config.ts` (loads `.env.local`). Import the client from `@/lib/db`. Pin Prisma versions — npm `latest` points at an 8.0 RC.
- Data access: read helpers go in `src/server/queries.ts` (`server-only`, no auth checks; call `requireMember` first). Mutations go in `"use server"` files (`src/server/workspaces.ts`, `src/server/projects.ts`) and must start with `requireMember(slug, minRole)` and scope every query by `organizationId`. Never export read helpers from a `"use server"` file: every export there becomes a public endpoint.
- App models (Project, …) are hand-written at the bottom of `prisma/schema.prisma`; add a migration with `npm run db:migrate -- --name <name>`, then restart `next dev` (the Prisma client is cached on `globalThis`).
- Design: tokens in `src/app/globals.css` (cool neutral hue 265 + one cobalt accent, radius 0.5rem); details in docs/PLAN.md Faz 2. Use theme tokens, not raw Tailwind colors, except semantic status colors. No em-dashes in UI copy.
- UI: shadcn/ui `base-nova` style (Base UI primitives, not Radix); `cn` comes from the `cn` package. Add components with `npx shadcn@4.21.4 add <name>`.
- Never run `prisma init` in this repo: it also writes agent skill files and overwrites `skills-lock.json`.

## Skills

- `design-taste-frontend` — visual direction and marketing/landing pages. Its rules target landing pages, not dense app UI; apply selectively to dashboards, task lists and forms.
- `web-design-guidelines` — review built UI for accessibility/UX (fetches rules from GitHub).
- `playwright-cli` — browser automation and visual checks; config in `.playwright/cli.config.json` (uses installed Microsoft Edge). Keep its artifacts in `.playwright-cli/` (gitignored).

## Repo conventions

- Canonical skills live in `.agents/skills/` (pinned in `skills-lock.json`). `.claude/skills/design-taste-frontend` and `.claude/skills/web-design-guidelines` are local Windows junctions to them and are gitignored. On a fresh clone, recreate them:
  `New-Item -ItemType Junction -Path .claude\skills\<name> -Target .agents\skills\<name>`
- Never commit real env files; only `.env.example` is tracked.
- Line endings are normalized to LF via `.gitattributes`.
