#!/bin/sh
set -e
/nakama/nakama migrate up --database.address "$NK_DATABASE_ADDRESS"
exec /nakama/nakama \
  --database.address "$NK_DATABASE_ADDRESS" \
  --runtime.path /nakama/data/modules \
  --session.cors_allowed_origins "*"
