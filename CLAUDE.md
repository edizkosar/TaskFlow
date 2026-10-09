@AGENTS.md

# TaskFlow

Team task management app. Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, npm. Source lives in `src/app/`; import alias `@/*` → `src/*`.

Architecture, data model and phase plan: [docs/PLAN.md](docs/PLAN.md). Follow it; update it first if the plan changes.

## Commands

- `npm run dev` — dev server on http://localhost:3000 (also `.claude/launch.json` → `taskflow-dev`)
- `npm run lint` / `npm run build` — run both before considering a change done

## Skills

- `design-taste-frontend` — visual direction and marketing/landing pages. Its rules target landing pages, not dense app UI; apply selectively to dashboards, task lists and forms.
- `web-design-guidelines` — review built UI for accessibility/UX (fetches rules from GitHub).
- `playwright-cli` — browser automation and visual checks; config in `.playwright/cli.config.json` (uses installed Microsoft Edge). Keep its artifacts in `.playwright-cli/` (gitignored).

## Repo conventions

- Canonical skills live in `.agents/skills/` (pinned in `skills-lock.json`). `.claude/skills/design-taste-frontend` and `.claude/skills/web-design-guidelines` are local Windows junctions to them and are gitignored. On a fresh clone, recreate them:
  `New-Item -ItemType Junction -Path .claude\skills\<name> -Target .agents\skills\<name>`
- Never commit real env files; only `.env.example` is tracked.
- Line endings are normalized to LF via `.gitattributes`.
