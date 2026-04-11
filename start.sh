#!/bin/sh
set -e
/nakama/nakama migrate up --database.address "$NAKAMA_DATABASE_ADDRESS"
exec /nakama/nakama \
  --database.address "$NAKAMA_DATABASE_ADDRESS" \
  --runtime.path /nakama/data/modules \
  --socket.response_headers "Access-Control-Allow-Origin=*" \
  --socket.response_headers "Access-Control-Allow-Headers=Authorization,Content-Type,*" \
  --socket.response_headers "Access-Control-Allow-Methods=GET,POST,PUT,DELETE,OPTIONS" \
  --socket.response_headers "Access-Control-Expose-Headers=*"
