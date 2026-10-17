# FixIt AI — Repair Intelligence & Reuse Platform

FixIt AI helps people decide whether a broken item is worth **repairing, reusing or
replacing**, then connects them with repair professionals and tracks the sustainability
impact of those decisions.

It is a production-oriented full-stack application: Next.js (App Router) + TypeScript +
Tailwind + shadcn/ui on the front end, PostgreSQL + Prisma and Better Auth on the back
end, with an OpenAI-compatible vision API for damage analysis.

> **Estimates, not measurements.** Every cost, severity and sustainability figure the
> app produces is a documented estimate. The repair-vs-replace recommendation itself is
> produced by a **deterministic TypeScript engine**, never by the language model.

---

## Table of contents

1. [Features](#features)
2. [Routes](#routes)
3. [Tech stack](#tech-stack)
4. [Quick start](#quick-start)
5. [Environment variables](#environment-variables)
6. [AI provider and mock mode](#ai-provider-and-mock-mode)
7. [Image storage](#image-storage)
8. [The repair-vs-replace decision engine](#the-repair-vs-replace-decision-engine)
9. [Sustainability methodology](#sustainability-methodology)
10. [Authentication, roles and admin](#authentication-roles-and-admin)
11. [Database](#database)
12. [Testing](#testing)
13. [Security](#security)
14. [Project structure](#project-structure)
15. [Deployment](#deployment)
16. [Troubleshooting](#troubleshooting)
17. [Known limitations](#known-limitations)

---

## Features

- **AI damage analysis** — upload up to 6 photos plus a description; a vision model
  returns a *validated, structured* assessment (visible damage, possible causes,
  severity, repairability, cost ranges, safety warnings).
2. [Routes](#routes)
3. [Tech stack](#tech-stack)
4. [Quick start](#quick-start)
5. [Environment variables](#environment-variables)
6. [AI provider and mock mode](#ai-provider-and-mock-mode)
7. [Image storage](#image-storage)
8. [The repair-vs-replace decision engine](#the-repair-vs-replace-decision-engine)
9. [Sustainability methodology](#sustainability-methodology)
10. [Authentication, roles and admin dashboard](#authentication-roles-and-admin)
11. [Database](#database)
12. [Testing](#testing)
13. [Security](#security)
14. [Project structure](#project-structure)
15. [Deployment](#deployment)
16. [Troubleshooting](#troubleshooting)
17. [Known limitations](#known-limitations)

---

## Features

- **Multi-step AI damage analysis** — category → details → photos → review, producing a
  structured report (visible damage, possible causes, severity, repairability, cost
  ranges, safety warnings) with the model output strictly validated by Zod.
- **Deterministic repair-vs-replace engine** — category-specific thresholds, remaining
  useful life, budget, warranty and repairability signals, with per-factor explanations
  and confidence. The LLM never decides.
- **Safety guardrails** — safety-critical failures never receive an unconditional
  "repair" recommendation; DIY is actively discouraged for dangerous categories.
- **Troubleshooting assistant** — threaded chat grounded in the analysis, with mock
  mode clearly labelled when no AI key is configured.
- **Repair marketplace** — searchable professionals with filters, detail pages and a
  quote-request flow; seeded records are flagged **Demo data**.
- **Repair request tracking** — a server-enforced status machine with per-user ownership
  checks and reviews allowed only on completed repairs.
- **Sustainability dashboard** — estimated money saved, waste avoided and CO₂e avoided,
  derived from the user's own decisions and shown with the documented methodology.
- **Admin dashboard** — real aggregate statistics, user list, professional
  create/verify/delete, repair-request oversight, review moderation, and an audit log.
- **Honest by design** — no fabricated statistics or non-functional buttons; mock AI and
  demo marketplace rows are always labelled.

## Routes

| Route | Access | Description |
| --- | --- | --- |
| `/` | public | Landing page |
| `/sign-in`, `/sign-up` | public | Email/password (+ optional Google) auth |
| `/dashboard` | user | Personal overview |
| `/analyze` | user | Multi-step analysis wizard |
| `/analysis/[id]` | owner | Full AI report, safety warnings, next actions |
| `/compare/[id]`, `/compare/new` | owner / user | Repair-vs-replace comparison tool |
| `/assistant/[analysisId]` | owner | Troubleshooting chat |
| `/professionals`, `/professionals/[id]` | public | Marketplace + quote request |
| `/requests`, `/requests/[id]` | owner | Repair request tracking |
| `/sustainability` | user | Estimated impact dashboard |
| `/admin` | admin | Statistics, users, professionals, requests, reviews |
| `/privacy`, `/terms` | public | Policies |

API routes live under `src/app/api/**` and all perform their own server-side auth,
validation, ownership checks and rate limiting.

## Tech stack

- **Framework:** Next.js 15 (App Router, React 19, Server Components), TypeScript
- **UI:** Tailwind CSS, shadcn/ui-style components, Lucide icons, Recharts
- **Forms:** React Hook Form + Zod (`zodResolver`), shared schemas with the API
- **Data:** TanStack Query for client fetching, Prisma + PostgreSQL
- **Auth:** Better Auth (email/password, optional Google OAuth, role field)
- **AI:** OpenAI-compatible vision API via `fetch` (no SDK lock-in)
- **Storage:** Cloudinary → S3-compatible bucket → local disk fallback
- **Rate limiting:** Redis sliding window when `REDIS_URL` is set, otherwise in-memory
- **Tests:** Vitest + Testing Library (unit/integration), Playwright (e2e)

## Quick start

Prerequisites: Node.js 20+, npm, and PostgreSQL 14+ (or Docker).

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Start PostgreSQL (Docker)
docker compose up -d

# 3. Configure the environment
copy .env.example .env      # Windows
# cp .env.example .env      # macOS/Linux
# then set DATABASE_URL and BETTER_AUTH_SECRET

# 4. Create the schema and seed demo data
npm run db:migrate
npm run db:seed

# 5. Run the app
npm run dev                 # http://localhost:3000
```

> If `docker compose` maps a different port, update `DATABASE_URL` accordingly.

`npm run db:seed` inserts demo professionals and, when `SEED_ADMIN_EMAIL` and
`SEED_ADMIN_PASSWORD` are set, an admin account.

### npm scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript checks |
| `npm test` | Vitest unit + integration tests |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:push` | Push schema without a migration (prototyping) |
| `npm run db:seed` | Seed demo data / admin |
| `npm run db:studio` | Prisma Studio |

## Environment variables

Every variable is optional except `DATABASE_URL`, `BETTER_AUTH_SECRET` and
`NEXT_PUBLIC_APP_URL` (all secrets stay server-side; nothing sensitive is exposed via
`NEXT_PUBLIC_*`).

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | yes | Session signing secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | recommended | Server base URL |
| `NEXT_PUBLIC_APP_URL` | yes | Public app URL used by the browser auth client |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Enables "Continue with Google" when both are set |
| `AUTH_TRUSTED_ORIGINS` | optional | Comma-separated extra origins allowed to call the auth API (preview deploys) |
| `AI_API_KEY` | optional | Vision-capable OpenAI-compatible key. Unset ⇒ **mock mode** |
| `AI_BASE_URL` | optional | Defaults to `https://api.openai.com/v1` |
| `AI_MODEL` | optional | Defaults to `gpt-4o-mini` |
| `CLOUDINARY_*` | optional | Primary image storage |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | optional | S3-compatible storage |
| `S3_ENDPOINT`, `S3_PUBLIC_BASE_URL` | optional | Required for R2/MinIO/Supabase, public CDN base |
| `REDIS_URL` | optional | Durable rate limiting; otherwise in-memory |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | optional | Admin account created by the seed |

Secrets are only ever read from server-side `process.env`. Nothing sensitive is exposed
through `NEXT_PUBLIC_*`.

## AI provider and mock mode

Any OpenAI-compatible **chat/completions** endpoint with vision support works.

```env
AI_API_KEY="sk-..."
AI_BASE_URL="https://api.openai.com/v1"
AI_MODEL="gpt-4o-mini"
```

Behaviour:

- When `AI_API_KEY` is **unset**, the app runs in **mock mode**: analyses and chat
  replies are generated locally and the UI explicitly shows *"DEMO MODE — simulated
  analysis"* / *"DEMO MODE: replies are simulated locally…"*. No network calls are made.
- Model output is parsed and validated with `aiAnalysisSchema`; malformed output is
  retried/rejected rather than persisted.
- Timeouts, provider rate limits (`429`) and provider errors are mapped to safe,
  user-facing messages — never raw stack traces.
- AI rate limits: 10 analyses/minute/user, 20 chat messages/minute/user.

## Image storage

Images are uploaded through `POST /api/upload` (max 8 MB, JPEG/PNG/WebP/GIF/HEIC) and
only the resulting **URL** is stored in the database — image binaries are never written
to Postgres.

Provider order:

1. **Cloudinary** when `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and
   `CLOUDINARY_API_SECRET` are set.
2. **S3-compatible** bucket when `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID` and
   `S3_SECRET_ACCESS_KEY` are set (use `S3_ENDPOINT` for R2/MinIO/Supabase and
   `S3_PUBLIC_BASE_URL` for a CDN hostname).
3. **Local disk** (`public/uploads/`) as a development fallback. This is not suitable for
   serverless deployments — configure Cloudinary or S3 in production.

## The repair-vs-replace decision engine

Implemented as pure TypeScript in `src/services/comparison.service.ts` so it is
deterministic, unit-testable and shared by the UI and the API.

**Inputs:** repair cost, replacement cost, remaining life after repair, replacement
lifespan, warranty status, budget, repair availability, AI repairability/severity signals,
user sustainability preference and category.

**Category thresholds** (repair cost ÷ replacement cost below the threshold favours
repair):

| Category | Threshold |
| --- | --- |
| Electronics | 0.40 |
| Home Appliances | 0.45 |
| Furniture | 0.50 |
| Clothing / Footwear | 0.35 |
| Bicycles | 0.50 |
| Vehicles | 0.45 |
| Household Items | 0.40 |
| Other (default) | 0.40 |

**Factors** each carry an impact in favour of (+) or against (−) repair: cost ratio, cost
per month of remaining life vs. replacement life, repair availability, repairability,
warranty, budget fit and sustainability preference. The summed score selects the outcome:

- `REPAIR` — clear cost-effective repair
- `REPLACE` — repair uneconomic
- `INVESTIGATE_FURTHER` — mixed evidence; a firm quote is required
- `REUSE` / `RECYCLE` / `DISPOSE_RESPONSIBLY` — not repairable but materials recoverable

**Safety first.** If a safety risk is flagged or severity is `critical`, the engine
**never** returns `REPAIR`; it recommends professional assessment and emits an explicit
"Do not attempt DIY repair" warning. High-risk categories (Electronics, Home Appliances,
Vehicles) with major damage get an additional caution warning.

Every result includes `factors`, human-readable `explanation`, `confidence`, `warnings`,
`uncertain` and `manualComparisonRecommended` for transparency.

## Sustainability methodology

Implemented in `src/services/sustainability-engine.ts`, versioned as `estimate-v1`.

- **Money saved** = estimated replacement cost − actual repair cost (floored at 0).
- **Waste avoided** = typical product weight for the category, or an explicit known
  weight when available. Category weights are rough public averages (e.g. Electronics
  1.2 kg, Home Appliances 12 kg, Furniture 20 kg).
- **CO₂e avoided** ≈ waste avoided (kg) × 5.5 kg CO₂e/kg — an indicative
  order-of-magnitude factor, not a lifecycle assessment.

Every record stores `calculationMethod`, `dataSource` (`fixit-ai/estimate-v1`) and the
assumptions used, and the dashboard repeats the disclaimer. The model is intentionally
modular: swap the weight table or CO₂ factor without touching callers.

These are **estimates, not verified measurements**, and must not be presented as carbon
offsets or audited environmental claims.

## Authentication, roles and admin

- **Better Auth** with email/password. Google OAuth activates automatically when both
  Google credentials are present.
- The browser auth client targets **the current origin** by default, so the app works on
  any port, on Vercel preview URLs and behind custom domains without rebuilding. Add
  extra allowed origins with `AUTH_TRUSTED_ORIGINS`.
- Roles are stored on the user (`USER` / `ADMIN`). The role field is marked
  `input: false`, so it can never be set through client sign-up requests — preventing
  privilege escalation.
- Page guards: `requireUserPage()` redirects to `/sign-in`; `requireAdminPage()`
  redirects non-admins to `/dashboard`.
- API guards: `requireUser()` / `requireAdmin()` throw typed `AuthError`s handled by a
  central error mapper.
- Every resource query is scoped by `userId` (or explicitly admin-only), so users can
  never read or mutate another user's analyses, requests, conversations or reviews.

### Creating an admin

Either:

1. Set `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` in `.env` and run `npm run db:seed`.
   The seed creates the account (with a credential password hashed by Better Auth, so you
   can sign in immediately) or, if the email already exists, attaches a credential
   account and promotes it to `ADMIN`. Re-running the seed is safe, or
2. Promote an existing account:

```bash
npx prisma studio          # edit the user's role to ADMIN
```

### Moderation

Admin actions (verify/unverify/delete professional, hide/restore review, status changes)
are recorded via `src/lib/security/audit.ts` into the `AuditLog` table.

## Database

PostgreSQL via Prisma. Models: `User`, `Session`, `Account`, `Verification`,
`ItemAnalysis`, `TroubleshootingConversation`, `ChatMessage`, `RepairProfessional`,
`RepairRequest`, `Review`, `SustainabilityRecord`, `AuditLog` and `RateLimitEvent`.

Notable constraints:

- `ItemAnalysis` owns its AI payload and status (`PENDING`/`COMPLETED`/`FAILED`).
- `SustainabilityRecord.analysisId` is **unique**, and recording uses an upsert, so an
  analysis can never create duplicate impact records.
- `Review` is one-per-`RepairRequest` (enforced by a unique constraint *and* a service
  check that returns `409 ALREADY_REVIEWED`).

Repair-request status machine (`PENDING → QUOTE_PROVIDED → ACCEPTED → SCHEDULED →
IN_PROGRESS → COMPLETED`, plus `CANCELLED`) is enforced server-side: illegal jumps are
rejected with `409 INVALID_TRANSITION`, non-admins may only cancel/accept/complete, and
cancellation is refused once work has started (`409 NOT_CANCELLABLE`).

Commands:

```bash
npm run db:migrate     # create + apply a migration (development)
npm run db:migrate -- --name add_something
npx prisma migrate deploy   # apply migrations in production
npm run db:seed        # demo data + optional admin
npm run db:studio      # browse data
```

## Testing

```bash
npm test          # Vitest: unit + integration (no external services required)
npm run typecheck # tsc --noEmit
npm run lint      # ESLint (next/core-web-vitals + typescript)
npm run build     # production build
npx playwright install chromium
npm run test:e2e  # Playwright journeys against a real server + database
```

The e2e suite builds and serves a **production** Next.js server on port **3210** (override
with `E2E_PORT`) using a dedicated build directory (`.next-e2e`), so it never collides
with a `npm run dev` on 3000 and never clobbers your `.next`. Point it at a deployed
environment with `PLAYWRIGHT_BASE_URL`. The suite needs a migrated database and creates
its own throwaway users; it never touches seed data.

Coverage highlights:

- **Decision engine** — category thresholds and overrides, cheap/expensive repairs,
  missing cost data, safety escalation, critical severity, reuse outcome, warranty,
  budget in both directions, high-risk-category warnings, determinism, confidence bounds.
- **Sustainability engine** — savings formula, zero-floor, category weights, unknown
  category fallback, CO₂ factor, replacement produces no savings, versioned methodology.
- **Validation** — analysis, review, request, chat and comparison schemas (including
  length, range and enum rejection).
- **AI output schema** — defaults, enum/confidence validation and rejection of malformed
  or malicious payloads.
- **Service logic (mocked Prisma)** — ownership checks, duplicate-review and duplicate
  sustainability prevention, server-enforced status transitions, RBAC-driven transitions.
- **Rate limiting** — sliding-window limits, independent keys, window reset.
- **Components** — empty-state rendering and interaction.
- **Playwright e2e** — public pages, auth redirects, sign-up → analysis (mock AI) report,
  compare → sustainability record, and quote request against demo professionals.

E2E tests require `DATABASE_URL` to point at a migrated database; the AI provider is left
unset so the journeys run in labelled mock mode.

## Security

- Auth and role checks run on the server for every page and API route.
- Zod validation on every request body and query string.
- Ownership scoping on all user-owned resources.
- Central error mapper returns safe messages and never leaks stack traces or secrets.
- Rate limiting on AI (`10/min`), chat (`20/min`) and uploads (30/minute per user),
  durably with Redis or in-memory for single-instance deployments.
- Image uploads validated by MIME type and size before storage.
- Admin actions written to an audit log.
- No secrets in `NEXT_PUBLIC_*`; `.env` is git-ignored.

## Project structure

```
prisma/
  schema.prisma            # data model
  migrations/              # applied migration(s)
  seed.ts                  # demo professionals + optional admin
src/
  app/
    (marketing)/           # landing page
    (auth)/                # sign-in, sign-up
    analyze/, analysis/[id], compare/**, assistant/[analysisId]
    professionals, requests, sustainability, admin, privacy, terms
    api/**                 # route handlers (auth, ai, upload, admin, …)
    error.tsx, not-found.tsx, layout.tsx, globals.css
  components/              # ui/*, layout/*, feature components
  lib/
    ai/        provider + Zod schemas (mock mode lives here)
    auth/      better-auth config, session/RBAC guards, client
    db/        prisma singleton
    security/  rate limiting + audit log
    storage/   Cloudinary → S3 → local upload abstraction
    validation/# shared Zod schemas
  services/                # comparison, sustainability, analysis, requests, admin
prisma/ , tests/e2e/ , vitest.config.ts , playwright.config.ts , docker-compose.yml
```

## Deployment

### Option 1: Run entirely offline (one command)

See [OFFLINE.md](./OFFLINE.md) for the Docker-based one-command setup that works with
no internet after download.

### Option 2: Vercel + managed PostgreSQL (e.g. Neon/Supabase/RDS)

1. Provision PostgreSQL and set `DATABASE_URL` (use a pooled connection string where
   offered).
2. Set the environment variables from the table above. Set `BETTER_AUTH_URL` and
   `NEXT_PUBLIC_APP_URL` to the production URL and use a strong `BETTER_AUTH_SECRET`.
3. Apply migrations during the build or as a release step:
   - Build command: `prisma generate && prisma migrate deploy && next build`
   - Or run `npx prisma migrate deploy` from CI before promoting the deployment.
4. Configure at least one durable image provider (Cloudinary or S3). Ephemeral
   filesystems on serverless platforms make the local upload fallback unsuitable.
5. Add `REDIS_URL` if you run more than one instance so rate limits are shared.
6. Optionally seed an initial admin with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
   (run the seed once, then remove them).

### Option 3: Self-host with Node.js

Any Node 20+ host works: `npm ci --legacy-peer-deps`, `prisma migrate deploy`,
`next build`, `next start`. Ensure the upload fallback directory (if used) is a mounted
volume.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `Environment variable not found: DATABASE_URL` | `.env` missing or Postgres not running. Start Docker and re-check the URL |
| `P1001: Can't reach database server` | Wrong host/port (Docker port mapping) |
| `npm install` peer conflicts | Use `npm install --legacy-peer-deps` (Better Auth + Vite peer ranges) |
| Analyses say "DEMO MODE" | `AI_API_KEY` is unset — expected without a key |
| "Image upload failed" | Storage not configured or bucket credentials invalid; check Cloudinary/S3 env vars |
| Uploads disappear in production | You are on the local disk fallback — configure Cloudinary or S3 |
| `429` on analysis or chat | Per-user rate limit hit; wait a minute or raise the limits in the route handlers |
| Google button fails | Both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` must be set with matching redirect URIs |
| Admin page redirects to dashboard | Your user's `role` is not `ADMIN` — see [Creating an admin](#creating-an-admin) |
| `Invalid origin` when signing in | You're browsing on a different port/host than `BETTER_AUTH_URL`. Development already trusts any `localhost`/`127.0.0.1` port; otherwise set `BETTER_AUTH_URL` (and `NEXT_PUBLIC_APP_URL`) to the URL you actually use, add `AUTH_TRUSTED_ORIGINS`, and restart |
| Playwright browsers missing | `npx playwright install chromium` |

## Known limitations

- Cost estimates, severity scores and sustainability figures are heuristic estimates,
  not measurements or quotes.
- Optional services degrade gracefully rather than requiring infrastructure: without
  Redis, rate limiting is per-instance; without Cloudinary/S3, uploads are local; without
  an AI key, output is clearly-labelled mock data.
- BullMQ is installed for future background jobs but no queue is required by any current
  flow; AI calls run inline with timeouts and safe error mapping.
- `src/components/sustainability/charts.tsx` uses Recharts rather than a Leaflet map;
  Leaflet/OSM is installed but no map view is currently rendered.
- The marketplace is admin-curated (professionals are added/verified by admins); there is
  no self-service professional onboarding yet.

---

Built as a portfolio-grade demonstration of honest AI product engineering: deterministic
decision logic, explainable estimates, real authorization, and clearly labelled mock
data.
