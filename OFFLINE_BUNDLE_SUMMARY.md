# FixIt AI — Offline local bundle (what's included)

All files you need to run FixIt AI entirely offline on another Windows/macOS/Linux machine:

## Files added
- `Dockerfile` — production multi-stage build (offline-safe: no `next/font/google` network fetch)
- `.dockerignore` — keeps the build small
- `docker-compose.offline.yml` — `db` (Postgres 16) + `app` (Next.js prod) with optional migrate/seed flags
- `run-offline.bat` — one-click Windows launcher
- `run-offline.sh` — one-command shell launcher (`chmod +x` not needed on Windows; on Linux/macOS `chmod +x run-offline.sh`)
- `OFFLINE.md` — full offline instructions (how to run, LAN access, first-time migrate/seed, data persistence, troubleshooting)
- Updated `README.md` — added "Option 1: Run entirely offline (one command)"
- Updated `src/app/layout.tsx`, `src/app/globals.css` — removed Google Fonts network dependency
- Added `AUTH_TRUSTED_ORIGINS` support + localhost wildcards in dev
- Schema fixes: `moneySchema` and `itemAge` now accept `null` (form empty values) + regression tests

## How to run (one command)
1. Have Docker Desktop/Docker Engine installed
2. Double-click `run-offline.bat` OR run: `docker compose -f docker-compose.offline.yml up --build`
3. On first run, stop and rerun with `RUN_DB_MIGRATE=1 RUN_DB_SEED=1` to create schema + admin (`admin@fixit.local` / `ChangeMe123!`)
4. Open [http://localhost:3000](http://localhost:3000)

## Verification status
- Unit/integration: **72/72 passing** (Vitest)
- E2E: currently running (production build, isolated `.next-e2e`), will report final 9-test outcome when done
- Typecheck/build/lint: clean (build passes; lint warnings only)

## Notes
- No internet required at runtime. The only network I/O is between app and Postgres inside Docker.
- AI runs in **mock mode** unless `AI_API_KEY` is provided.
- Images stored locally in `public/uploads` (mounted volume).
- Google OAuth is disabled by default.
- All secrets stay in `.env` (never committed). `.env.example` is provided.
