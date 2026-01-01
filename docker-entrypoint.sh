#!/bin/sh
set -e

# Run migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  # Try to use local prisma binary first
  if [ -f "./node_modules/.bin/prisma" ]; then
    ./node_modules/.bin/prisma migrate deploy
  else
    npx prisma migrate deploy
  fi
fi

# Execute the main command
exec "$@"
