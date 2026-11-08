# SITEBUILDER X ULTRA

A complete, self-hosted, no-code website builder SaaS — a visual drag-and-drop editor, an AI site generator, a template/component library, media management, real publishing with public URLs, standalone ZIP export, and full account security. Built with a premium dark glassmorphism interface in **Polish and English**.

This is a working application, not a mockup: every panel, button, and workflow is backed by a real REST API, a real PostgreSQL database, and a real Google Gemini integration.

---

## Feature overview

**Dashboard** — Overview, My Projects, Templates, Component Library, AI Generator, Media Library, Publications, Domains, Statistics/Analytics, Form Submissions, Activity History, Profile, and Settings.

**Visual editor** — A true three-panel layout:
- **Left:** categorized library of **120 drag-and-drop variants** across Text (20), Media (15), Layout (14), Interactive (15), E-commerce (8), and Ready Sections (48), plus a Layers tree.
- **Center:** live canvas with Desktop / Laptop / Tablet / Mobile preview, drag-to-insert, reorder, reparent, multi-select, duplicate, copy/paste, group, resize, undo/redo, and autosave.
- **Right:** properties for content, colors/gradients, typography, spacing, sizing, borders, radius, shadows, opacity, positioning, flexbox/grid alignment, backgrounds, animations, hover states, and per-device visibility.

**Element system** — **65 editable element types** including headings, rich text, quotes, lists, badges; image, gallery, video, background image, icons, SVG, sliders, carousels, logos, avatars; section, container, grid, flexbox, columns, row, spacer, divider, card, stack, sticky; button, navbar, dropdown, accordion, tabs, modal, tooltip, popup, search, contact/newsletter/login forms; product card/grid/gallery, price, cart, categories, product details, checkout. Every element is fully editable and renders to clean, standalone HTML.

**Templates** — **60 professional, fully editable templates** across 15 categories (Gaming, Business, Portfolio, Technology, SaaS, E-commerce, Restaurant, Blog, Agency, Education, Personal, Landing Page, News, Fitness, Travel), each with multiple subpages, thumbnail, description, and live preview. Available in both Polish and English.

**AI (Google Gemini)** — Generate whole websites or individual sections, write/improve copy, generate SEO meta descriptions, and improve a site's color palette/design. AI output is the editor's native document structure, so every generated element remains editable. **The API key lives only on the backend** and is never exposed to the browser.

**Accounts & security** — Real registration, login, logout, profile editing, password change, and email-based password recovery. Hashed opaque cookie sessions, CSRF origin checks, bcrypt password hashing, rate limiting, strict input validation, and per-owner authorization on every resource.

**Projects** — Create, edit, save (optimistic revision locking), duplicate, delete (trash + restore), version history with restore, and multiple subpages per project.

**Media library** — Upload images/SVG/graphics (magic-byte validated), organize into folders, search, filter, preview, rename, delete, and insert into projects.

**Publishing** — Publish to a public URL, update, unpublish, serve subpages, per-page SEO, and privacy-friendly page-view analytics. Published sites are server-rendered standalone HTML.

**Export** — Download a ZIP containing HTML, CSS, JS, images, fonts, all subpages, and a README. The exported site runs on its own with no server dependency.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 7, Tailwind-style custom CSS, Framer Motion, Zustand + Immer, TanStack Query, React Router 7, Recharts, Lucide icons |
| Backend | Node.js, Express 5, Prisma 6, PostgreSQL, Zod 4, bcryptjs, Helmet, express-rate-limit, Multer, Archiver, Nodemailer |
| Shared core | Framework-agnostic TypeScript document model, CSS generator, HTML renderer, and site runtime shared by editor, server, and export |
| AI | Google Gemini REST API (backend-only key) |
| Tooling | npm workspaces, tsx, embedded-postgres (zero-config local database) |

---

## Monorepo structure

```
sitebuilder-x-ultra/
├─ apps/
│  ├─ server/              Express + Prisma REST API
│  │  ├─ prisma/schema.prisma
│  │  └─ src/
│  │     ├─ routes/        auth, projects, media, components, domains, ai,
│  │     │                 public, submissions, analytics, activity
│  │     ├─ services/      ai, export, images, projects, public
│  │     ├─ security.ts    sessions, CSRF, auth, rate limits, errors
│  │     ├─ validation.ts  Zod schemas + structural document validation
│  │     └─ index.ts       app wiring
│  └─ web/                 React SPA (dashboard + editor)
│     └─ src/
│        ├─ pages/         15 dashboard/editor pages
│        ├─ editor/        Canvas, LeftPanel, PropertiesPanel, store
│        ├─ components/    UI kit + dashboard widgets
│        └─ lib/           api client, auth, i18n (PL/EN), data, mutations
├─ packages/
│  └─ shared/              @sitebuilder/shared — the document engine
│     └─ src/
│        ├─ types.ts       SiteDocument / SiteNode / NodeSpec model
│        ├─ tree.ts        tree operations (insert/move/remove/validate)
│        ├─ elements.ts    65-element registry
│        ├─ styles.ts      theme + responsive CSS generator
│        ├─ render.ts      HTML renderer (editor preview, SSR, export)
│        ├─ runtime.ts     standalone published-site runtime JS
│        ├─ safety.ts      URL/CSS/HTML/JSON sanitizers
│        └─ library/       presets, sections, templates (120 + 60)
└─ scripts/
   ├─ dev.mjs              one-command dev orchestrator
   └─ postgres.mjs         embedded PostgreSQL lifecycle
```

---

## Quick start

Requires **Node.js 24+**. No external database or Docker needed — a local PostgreSQL is started automatically.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    then edit .env (set GEMINI_API_KEY to enable AI — optional)

# 3. Run everything (embedded Postgres + API + web)
npm run dev
```

`npm run dev` will:
1. Start (or reuse) an embedded PostgreSQL on `127.0.0.1:55432` with a UTF-8 cluster.
2. Generate the Prisma client and push the schema.
3. Launch the API on **http://localhost:4000** and the web app on **http://localhost:5173**.

Open http://localhost:5173, register an account, and start building.

### Using an external PostgreSQL

Set `DATABASE_URL` in `.env` to your own PostgreSQL connection string and run:

```bash
npm run dev:external   # API + web only (no embedded database)
```

---

## Configuration

All configuration is via `.env` (see `.env.example`):

| Variable | Purpose | Default |
| --- | --- | --- |
| `NODE_ENV` | `development` / `production` | `development` |
| `PORT` | API port | `4000` |
| `WEB_PORT` | Vite dev port | `5173` |
| `APP_URL` | Web app origin (CSRF allow-list) | `http://localhost:5173` |
| `PUBLIC_URL` | Public published-site origin | `http://localhost:4000` |
| `DATABASE_URL` | PostgreSQL connection string | local embedded cluster |
| `LOCAL_POSTGRES_PORT` | Embedded Postgres port | `55432` |
| `SESSION_DAYS` | Session lifetime (1–90) | `30` |
| `GEMINI_API_KEY` | Google Gemini key (**backend only**) | _(empty → AI disabled)_ |
| `GEMINI_MODEL` | Gemini model id | `gemini-2.5-flash` |
| `SMTP_HOST/PORT/USER/PASSWORD/FROM` | Outbound email for password recovery | _(empty → logged to console in dev)_ |

In production, `APP_URL` must use HTTPS and session cookies switch to the `__Host-` prefix.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Full local stack (embedded Postgres + API + web) |
| `npm run dev:external` | API + web against an external database |
| `npm run db:local` | Start only the embedded PostgreSQL |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run typecheck` | Type-check all three workspaces |
| `npm test` | Run the shared-core + backend validation test suites |
| `npm run build` | Build the web SPA and bundle the server |
| `npm start` | Run the built server (serves API + web + published sites) |

---

## Architecture notes

**Single document model.** A site is a `SiteDocument`: a flat map of `SiteNode`s plus per-page `rootIds`, a theme, and SEO. The same model drives the editor canvas, server-side rendering, publishing, and ZIP export, so what you edit is exactly what publishes and exports. Authors/AI produce `NodeSpec`s that are instantiated into the tree.

**Rendering pipeline.** `render.ts` turns nodes into escaped HTML; `styles.ts` generates theme CSS variables plus per-breakpoint rules (media queries for published sites, container queries for the editor canvas). `runtime.ts` is a small dependency-free script powering nav menus, tabs, accordions, sliders, modals, forms, cart, countdowns, and animations on published/exported sites.

**Safety boundary.** `safety.ts` provides deterministic, DOM-independent sanitizers for URLs, CSS values, rich-text HTML, and JSON. All user/AI content passes through Zod validation (`validation.ts`) and structural tree validation before it is stored or rendered.

**Security.** Opaque hashed cookie sessions; CSRF origin verification (public form/analytics endpoints do their own exact-origin check); bcrypt(12) passwords; granular rate limits; owner-scoped queries; optimistic revision locking with `409 REVISION_CONFLICT`; SVG/image magic-byte validation; and SSRF-protected asset fetching for export (HTTPS-only, public DNS pinning, redirect revalidation, size cap).

---

## API overview

REST under `/api`, cookie-authenticated, JSON responses:

- `auth` — register, login, logout, me, forgot/reset/change password, profile, settings, sessions, delete account
- `projects` — CRUD, duplicate, trash/restore, versions + restore, publish/unpublish
- `media` — upload, folders, list/search, rename, delete
- `components` — saved reusable components
- `domains` — custom domain mapping
- `ai` — status, generate (website/section), design, text
- `submissions` — form submission inbox
- `analytics` — page-view aggregates
- `activity` — account activity history
- `public` — published site HTML, subpages, form intake, analytics beacon (no auth)

---

## Testing

```bash
npm run typecheck   # strict TypeScript across shared / server / web
npm test            # 32 unit/integration tests (node:test)
```

The suites cover tree operations, sanitizers, CSS generation (media + container modes), HTML rendering, the full library (≥100 variants instantiate cleanly), all templates (≥50 across 15 categories, valid in PL/EN with working navbar links), and backend validation (URL/CSS injection, password/slug/email rules, prototype-pollution rejection, document structural attacks, rich-text sanitization, nesting bounds).

---

## Security & dependency advisories

The reachable runtime vulnerabilities in direct dependencies have been remediated (Nodemailer SMTP injection → 10.4.0; Zod memory-exhaustion → 4.6.7; an unused Zod dependency was removed from the shared package).

`npm audit` may still report advisories that are **not reachable in this application**:
- **Prisma CLI tooling** (`prisma`, `@prisma/config`, `deepmerge-ts`) — build-time config merging only; the runtime database client (`@prisma/client`) is unaffected. Resolving these requires a Prisma 7 major migration.
- **Archiver's glob/minimatch chain** — ReDoS in glob *pattern matching*; the exporter only uses `archive.append(content, { name })` with explicit filenames and never invokes glob/directory pattern APIs, so the vulnerable code path is not exercised.

These are documented rather than force-upgraded to avoid introducing breaking major-version changes into a verified, working build.

---

## Production deployment

This is a **single-process full-stack app** (Express serves the API, the compiled SPA, uploaded media, and published sites). It needs a host that runs a persistent Node process plus a managed PostgreSQL — **not** a static/serverless-only host. Vercel's default serverless model cannot run it as-is (no long-lived process, no embedded Postgres, no persistent disk); use Railway, Render, Fly.io, or a VPS instead.

```bash
npm run build     # prisma generate + web build + server bundle
npm start         # prisma db push (sync schema) + node apps/server/dist/index.js
```

Required environment variables in production:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | managed PostgreSQL connection string (Railway/Render Postgres, Neon, Supabase…) |
| `APP_URL` | `https://<your-host>` (must be HTTPS; enables `__Host-` cookies + HSTS) |
| `PUBLIC_URL` | `https://<your-host>` (origin used for published sites / form CSRF) |
| `PORT` | injected by the host (the server binds it on all interfaces) |
| `GEMINI_API_KEY` | optional, enables AI |
| `SMTP_*` | optional, enables password-recovery email |

The server sets `trust proxy`, so TLS terminated by the host's load balancer is handled correctly (secure cookies, client IPs, `X-Forwarded-Proto`).

### Railway

1. Create a project from the repo; add a **PostgreSQL** plugin and copy its `DATABASE_URL` (use the public/proxy URL if the build container can't reach the internal one).
2. Set the variables above (`NODE_ENV`, `APP_URL`, `PUBLIC_URL` to your Railway public domain, `GEMINI_API_KEY`).
3. Build command: `npm run build` · Start command: `npm start` (auto-detected from `package.json`).
4. **Uploads:** attach a Volume mounted at `apps/server/storage/uploads` so media survives redeploys. Without a volume the filesystem is ephemeral.
5. Health check path: `/api/health`.

### Render

**Blueprint (zero-config):** the repo ships a `render.yaml`. Connect the repo in Render and apply the blueprint — it provisions the PostgreSQL database, the web service, and the env wiring automatically. `APP_URL`/`PUBLIC_URL` are derived at runtime from Render's `RENDER_EXTERNAL_URL`, and `PORT` is injected, so the only value left to fill in is the optional `GEMINI_API_KEY` (and SMTP if you want recovery email). Manual setup, if you prefer:

1. New **Web Service** from the repo; runtime Node.
2. Build command: `npm install && npm run build` · Start command: `npm start`.
3. Add a managed PostgreSQL (or external Neon/Supabase) and set `DATABASE_URL` plus the variables above (`APP_URL`/`PUBLIC_URL` = your `onrender.com` URL or custom domain).
4. **Uploads:** add a Persistent Disk mounted at `/opt/render/project/src/apps/server/storage/uploads`.
5. Health check path: `/api/health`.

### Notes

- `npm start` runs `prisma db push --skip-generate` to sync the schema at boot (idempotent); the client is generated during `npm run build`.
- `prisma` is a runtime dependency so the schema sync works even when dev dependencies are pruned in production.
- The shared workspace package ships TypeScript source and is **bundled into the server output** (`tsup` `noExternal`), so `node dist/index.js` runs on plain Node without a TS loader.

---

## License

Private / unlicensed — provided as a complete reference implementation.