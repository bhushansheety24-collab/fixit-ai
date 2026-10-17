---
title: Offline local run (one command)
description: How to run FixIt AI entirely offline with Docker, no external services needed.
---

# Offline local run (one command)

This makes the app runnable offline: no internet required after the first image/build download, using a local PostgreSQL and mock AI.

## Prerequisites
- Docker Desktop (Windows/Mac) or Docker Engine + Docker Compose (Linux)
- ~2–4 GB free space for the PostgreSQL and Next.js images

## Run it
Double-click `run-offline.bat` (Windows) or run in a terminal:

```bash
./run-offline.sh
```

That will:
1. Copy `.env.example` to `.env` if missing (edit it first if you want to change anything)
2. Build the production Docker image
3. Start PostgreSQL (`fixit-postgres`) and the web app (`fixit-app`)

Wait until you see `Ready in ...` in the logs (Next.js production start), then open:

- **Local:** [http://localhost:3000](http://localhost:3000)
- **LAN:** `http://<your-local-ip>:3000` (useful for other devices on the same Wi-Fi)

## First-time: apply migrations and seed admin
By default the compose file runs migrations and seed **only** if you tell it to. To set up the database on the very first run:

Stop the stack (Ctrl+C in that terminal) and run:

```bash
# Windows PowerShell
$env:RUN_DB_MIGRATE="1"; $env:RUN_DB_SEED="1"; docker compose -f docker-compose.offline.yml up --build

# macOS/Linux
RUN_DB_MIGRATE=1 RUN_DB_SEED=1 docker compose -f docker-compose.offline.yml up --build
```

This will:
- Apply Prisma migrations (`prisma migrate deploy`)
- Seed demo professionals and the admin account (`admin@fixit.local` / `ChangeMe123!`)

After it's up, you can sign in as admin and as any regular user you create at `/sign-up`.

## Stopping
Press `Ctrl+C` in the terminal, or `docker compose -f docker-compose.offline.yml down`.

## Data persistence
- PostgreSQL data lives in the Docker volume `pgdata` (survives `down`/rebuilds)
- Uploaded images land in `public/uploads` and are mounted as volume `uploads` inside the container; on the host they'll appear under `public/uploads` in this folder

## Offline notes
- **AI:** With `AI_API_KEY` empty, everything runs in clearly-labelled **mock mode**.
- **Storage:** Local disk only (no Cloudinary/S3). Works fully offline.
- **Fonts:** Using a system font stack (no Google Fonts CDN).
- **Network:** No external requests are made at runtime unless you configure Google OAuth or an AI key.

## Troubleshooting
- If port 3000 or 5432 is taken, edit `ports:` in `docker-compose.offline.yml`.
- If you already have `.env` configured, the script won't overwrite it.
- To wipe and start fresh: `docker compose -f docker-compose.offline.yml down -v` (destroys `pgdata` and uploaded images).
