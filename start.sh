#!/bin/sh
set -e
/nakama/nakama migrate up --database.address "$NAKAMA_DATABASE_ADDRESS"
exec /nakama/nakama \
  --database.address "$NAKAMA_DATABASE_ADDRESS" \
  --runtime.path /nakama/data/modules
