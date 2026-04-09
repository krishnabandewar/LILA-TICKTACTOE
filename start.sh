#!/bin/sh
set -e
echo "Starting database migration..."
/nakama/nakama migrate up --database.address "$NK_DATABASE_ADDRESS"
echo "Starting Nakama server..."
exec /nakama/nakama \
  --database.address "$NK_DATABASE_ADDRESS" \
  --runtime.path /nakama/data/modules \
  --session.cors_allowed_origins "*"
