# LILA Multiplayer Tic-Tac-Toe (Nakama)

Production-style multiplayer Tic-Tac-Toe with a server-authoritative backend using Nakama.

## What is implemented

- Server-authoritative game logic in `nakama/modules/tictactoe.lua`
- Validated moves and anti-cheat checks on server
- Random matchmaking (`socket.addMatchmaker`)
- Room creation via RPC (`create_tictactoe_room`)
- Room discovery + join by room code
- Graceful disconnect handling
- Turn timer (30s) with timeout forfeit
- Leaderboard updates (wins/losses + score)
- Mobile-friendly web UI flow:
  - nickname
  - find random opponent / create room
  - live board and turn state
  - result + leaderboard

## Tech stack

- Frontend: Vite + TypeScript + Nakama JS client
- Backend: Nakama Lua runtime modules
- Infra: Docker Compose (`nakama` + `postgres`)

## Project structure

- `docker-compose.yml`: Nakama + Postgres local environment
- `nakama/local.yml`: Nakama local config
- `nakama/modules/tictactoe.lua`: match handler + RPCs + leaderboard initialization
- `frontend/`: web client app
- `deploy/`: deployment manifests for Render, Railway, AWS ECS

## Local setup

### 1) Start backend

```bash
docker compose up -d
```

Nakama endpoints:
- HTTP API: `http://127.0.0.1:7350`
- Console: `http://127.0.0.1:7351`

### 2) Start frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open the Vite URL shown in terminal.

## Multiplayer test plan

1. Open two browser windows (or two devices) using the frontend URL.
2. Login with different nicknames.
3. Test `Find random player` in both windows:
   - both users should enter same match
   - move validation should enforce turns and prevent overwrites
4. Test `Create room` in one window and join from second user using:
   - open room list, or
   - join by room id/code
5. Play a full game:
   - verify win or draw is correctly detected
   - verify leaderboard updates after game finishes
6. Let one turn idle for 30+ seconds:
   - timeout should forfeit and finish game

## Deployment notes

### Backend (Nakama)

- Deploy the same Docker image + mounted Lua runtime module files to any cloud VM/container platform.
- Expose ports `7350` and `7351`.
- Use managed Postgres for production and update DB connection string.
- Set secure server key and TLS termination at load balancer/reverse proxy.

Ready-to-edit backend deployment templates:
- Render: `deploy/render.yaml`
- Railway: `deploy/railway.json` + `deploy/railway.nakama.Dockerfile`
- AWS ECS Fargate: `deploy/aws-ecs-taskdef.json`

### Frontend

- Build static assets via `npm run build`.
- Deploy `frontend/dist` to Netlify, Vercel, Cloudflare Pages, S3+CloudFront, or similar.
- Set environment variables to your public Nakama host and ports.

## API/runtime configuration details

- Server key: `defaultkey` (change for production)
- Match module id: `tictactoe`
- Client move opcode: `1`
- Server state broadcast opcode: `10`
- Leaderboard id: `ttt_global`
- Room creation RPC id: `create_tictactoe_room`
- Room list RPC id: `list_tictactoe_rooms`

## Design decisions

- Authoritative server owns all game state transitions.
- Client only sends desired move index; server validates and applies.
- Single source of truth is state broadcast from Nakama match loop.
- Lightweight UI with clear phase transitions (auth, lobby, game).
