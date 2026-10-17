@echo off
setlocal
cd /d "%~dp0"

if not exist .env (
  copy .env.example .env
  echo Created .env from .env.example. Please review and adjust if needed.
)

echo Bringing up PostgreSQL and FixIt AI in production mode...
docker compose -f docker-compose.offline.yml up --build
