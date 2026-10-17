#!/usr/bin/env sh
set -e
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example. Please review and adjust if needed."
fi

echo "Bringing up PostgreSQL and FixIt AI in production mode..."
docker compose -f docker-compose.offline.yml up --build
