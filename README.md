<div align="center">

# 🕹️ LILA Multiplayer Tic-Tac-Toe

### *Server-Authoritative Real-Time Multiplayer on Nakama*

[![Live Demo](https://img.shields.io/badge/🎮%20Play%20Now-lila--tictactoe--ui.vercel.app-6366f1?style=for-the-badge)](https://lila-tictactoe-ui.vercel.app)
[![Backend](https://img.shields.io/badge/⚙️%20Backend-Render-46E3B7?style=for-the-badge)](https://lila-nakama-w0pr.onrender.com)
[![GitHub](https://img.shields.io/badge/📦%20Source-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/krishnabandewar/LILA-TICKTACTOE)

> A production-grade, real-time multiplayer Tic-Tac-Toe game with a server-authoritative backend, global leaderboard, turn timers, and room-based matchmaking — built for the **LILA Backend Assignment A**.

</div>

---

## 📑 Table of Contents

- [🚀 Live Links](#-live-links)
- [✨ Feature Overview](#-feature-overview)
- [🏛️ System Architecture](#️-system-architecture)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [⚙️ Local Development](#️-local-development)
- [🎮 How to Play](#-how-to-play)
- [🔌 API & Runtime Reference](#-api--runtime-reference)
- [🏆 Leaderboard & Bonus Features](#-leaderboard--bonus-features)
- [🌐 Deployment Guide](#-deployment-guide)
- [⚖️ Design Decisions](#️-design-decisions)
- [🙏 Credits](#-credits)

---

## 🚀 Live Links

| Service | URL | Status |
|:---|:---|:---:|
| 🎮 **Frontend (Vercel)** | [lila-tictactoe-ui.vercel.app](https://lila-tictactoe-ui.vercel.app) | ✅ Live |
| ⚙️ **Backend (Render)** | [lila-nakama-w0pr.onrender.com](https://lila-nakama-w0pr.onrender.com) | ✅ Live |
| 📦 **Repository (GitHub)** | [krishnabandewar/LILA-TICKTACTOE](https://github.com/krishnabandewar/LILA-TICKTACTOE) | ✅ Public |

> **⚠️ Note:** The backend runs on Render's **free tier**, which may sleep after inactivity. The **first login may take up to 50 seconds** to wake the server. Subsequent requests are instant.

---

## ✨ Feature Overview

### Core Requirements ✅
| Feature | Description | Status |
|:---|:---|:---:|
| **Server-Authoritative Logic** | All game state changes are validated on the Lua backend | ✅ Done |
| **Real-Time Multiplayer** | WebSocket-driven live board sync between two players | ✅ Done |
| **Anti-Cheat Move Validation** | Server rejects out-of-turn, out-of-bounds, and occupied-cell moves | ✅ Done |
| **Random Matchmaking** | `socket.addMatchmaker` pairs strangers automatically | ✅ Done |
| **Room Creation** | Private rooms created via `create_tictactoe_room` RPC | ✅ Done |
| **Room Discovery** | Public room list via `list_tictactoe_rooms` RPC | ✅ Done |
| **Win/Draw Detection** | Server checks all 8 win lines + full-board draw condition | ✅ Done |
| **Graceful Disconnect** | Opponent disconnect triggers instant forfeit + result broadcast | ✅ Done |
| **Web UI** | Nickname → Lobby → Game → Result → Leaderboard flow | ✅ Done |

### Bonus Features 🏆
| Feature | Description | Status |
|:---|:---|:---:|
| **Global Leaderboard** | Persistent win/loss/score tracking using Nakama's leaderboard API | ✅ Implemented |
| **Win Streak Tracking** | Consecutive wins are tracked and displayed in the leaderboard | ✅ Implemented |
| **Turn Timer (30s)** | Server-enforced 30-second move deadline with automatic forfeit | ✅ Implemented |
| **Production Deployment** | Backend on Render, Frontend on Vercel, DB on PostgreSQL | ✅ Deployed |
| **CORS Support** | Cross-origin headers set for secure browser-to-server communication | ✅ Configured |
| **Docker Containerization** | Nakama server packaged as a Docker image for any cloud platform | ✅ Done |

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (Vercel)                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │  TypeScript + Vite Frontend                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────────────┐  │  │
│  │  │  Nickname │  │  Lobby   │  │  Game Board     │  │  │
│  │  │  Screen  │  │  Screen  │  │  (Live Sync)    │  │  │
│  │  └──────────┘  └──────────┘  └─────────────────┘  │  │
│  │              Nakama JS Client                      │  │
│  └────────────┬───────────────────────┬───────────────┘  │
│               │ HTTPS REST            │ WSS WebSocket     │
└───────────────┼───────────────────────┼───────────────────┘
                ▼                       ▼
┌─────────────────────────────────────────────────────────┐
│              NAKAMA SERVER 3.23.0 (Render)               │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Lua Runtime (tictactoe.lua)                     │   │
│  │                                                  │   │
│  │  match_init()  → Creates board state             │   │
│  │  match_join()  → Assigns X/O symbols             │   │
│  │  match_loop()  → Validates moves + timer         │   │
│  │  match_leave() → Handles forfeit on disconnect   │   │
│  │                                                  │   │
│  │  RPC: create_tictactoe_room                      │   │
│  │  RPC: list_tictactoe_rooms                       │   │
│  └──────────────────────┬───────────────────────────┘   │
│                          │                               │
│  ┌──────────────────────▼───────────────────────────┐   │
│  │  PostgreSQL 18 (Render Managed DB)               │   │
│  │  • User sessions & accounts                      │   │
│  │  • Match state persistence                       │   │
│  │  • Leaderboard: ttt_global                       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Game State Machine
```
WAITING ──(2 players joined)──► PLAYING ──(win/draw/timeout/disconnect)──► FINISHED
   │                                │
   │         30s timer per turn     │
   │         Server validates moves │
   └────────────────────────────────┘
         State broadcast via opcode 10
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|:---|:---|
| **Vite + TypeScript** | Modern build tooling with full type safety |
| **Nakama JS Client** | Official client SDK for WebSocket + REST |
| **Vanilla CSS** | Custom dark-mode glassmorphism design system |
| **Inter (Google Fonts)** | Premium typography for polished UI |
| **Event Delegation** | Touchpad-friendly, re-render-proof button handling |

### Backend
| Technology | Purpose |
|:---|:---|
| **Nakama 3.23.0** | Open-source authoritative game server |
| **Lua Runtime** | Game logic, RPCs, and match handlers |
| **PostgreSQL 18** | Persistent storage for users, sessions, leaderboard |
| **Docker** | Containerized backend for consistent deployments |

### Infrastructure
| Service | Role |
|:---|:---|
| **Render** | Hosts Nakama Docker image + managed PostgreSQL |
| **Vercel** | Hosts the static Vite frontend build |
| **GitHub** | Version control and CI/CD trigger (auto-deploy on push) |

---

## 📁 Project Structure

```
LILA-assignment/
├── 📄 Dockerfile              # Nakama server Docker image definition
├── 📄 start.sh                # Shell entrypoint with CORS headers + migrations
├── 📄 docker-compose.yml      # Local dev: Nakama + PostgreSQL
├── 📄 README.md               # This file
│
├── 📁 nakama/
│   ├── local.yml              # Nakama local configuration
│   └── modules/
│       └── tictactoe.lua      # ⭐ Core game logic (match handlers + RPCs)
│
├── 📁 frontend/
│   ├── .env.example           # Environment variable template
│   ├── .env.production        # Production env config
│   ├── index.html             # HTML entry point
│   ├── package.json           # Node dependencies
│   ├── tsconfig.json          # TypeScript config
│   └── src/
│       ├── main.ts            # ⭐ All game UI, socket handlers, state management
│       └── style.css          # ⭐ Full dark-mode glassmorphism design system
│
└── 📁 deploy/
    ├── render.yaml            # Render one-click deploy manifest
    ├── railway.json           # Railway deploy config
    ├── railway.nakama.Dockerfile
    └── aws-ecs-taskdef.json   # AWS ECS task definition
```

---

## ⚙️ Local Development

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for Nakama + Postgres)
- [Node.js 18+](https://nodejs.org/) (for the frontend)

### 1. Clone the repository
```bash
git clone https://github.com/krishnabandewar/LILA-TICKTACTOE.git
cd LILA-TICKTACTOE
```

### 2. Start the backend (Nakama + PostgreSQL)
```bash
docker compose up -d
```

Wait ~10 seconds, then verify it's running:
- **Nakama API:** [http://127.0.0.1:7350](http://127.0.0.1:7350)
- **Nakama Console:** [http://127.0.0.1:7351](http://127.0.0.1:7351) (admin / password)

### 3. Configure and start the frontend
```bash
cd frontend
cp .env.example .env   # Uses localhost by default
npm install
npm run dev
```

Open the Vite dev URL shown in your terminal (usually `http://localhost:5173`).

### Environment Variables

| Variable | Description | Local Value | Production Value |
|:---|:---|:---|:---|
| `VITE_NAKAMA_HOST` | Server hostname | `127.0.0.1` | `lila-nakama-w0pr.onrender.com` |
| `VITE_NAKAMA_HTTP_SCHEME` | HTTP protocol | `http` | `https` |
| `VITE_NAKAMA_WS_SCHEME` | WebSocket protocol | `ws` | `wss` |
| `VITE_NAKAMA_HTTP_PORT` | API port | `7350` | `443` |
| `VITE_NAKAMA_SERVER_KEY` | Nakama server key | `defaultkey` | `defaultkey` |

---

## 🎮 How to Play

### Option A: Random Matchmaking
1. Open [lila-tictactoe-ui.vercel.app](https://lila-tictactoe-ui.vercel.app) in **two separate browser windows**.
2. Enter different nicknames in each window and click **Continue**.
3. Click **"Find Random Player"** in both windows.
4. Both players are automatically matched and placed into the same game.

### Option B: Private Room
1. **Player 1:** Click **"Create Room"**. Copy the `Match ID` displayed.
2. **Player 2:** Click **"Join Room"**, paste the `Match ID`, and click Join.
3. Both players are now in the same private game session.

### Gameplay Rules
- **Creator = X** (goes first), **Joiner = O**
- Click any empty cell on your turn to place your symbol
- A **30-second timer** counts down for each move — running out forfeits your turn and the game
- The server detects wins, draws, and disconnects automatically
- Results are saved to the **global leaderboard** instantly

---

## 🔌 API & Runtime Reference

### Match Handler Opcodes
| Opcode | Direction | Payload | Purpose |
|:---|:---|:---|:---|
| `1` | Client → Server | `{ "index": 0-8 }` | Player attempts a move |
| `10` | Server → Client | Full `GameState` JSON | Server broadcasts updated game state |

### RPC Endpoints
| RPC ID | Method | Request | Response | Purpose |
|:---|:---|:---|:---|:---|
| `create_tictactoe_room` | POST | `{}` | `{ "match_id": "..." }` | Creates a new private match |
| `list_tictactoe_rooms` | POST | `{}` | `{ "rooms": [...] }` | Lists all open matches |

### Game State Schema (Broadcast on opcode 10)
```json
{
  "board": ["X", "", "O", "", "X", "", "", "", ""],
  "status": "playing",
  "turn": "X",
  "winner": null,
  "move_deadline": 1712830000,
  "players": [
    { "user_id": "abc123", "username": "Alice", "symbol": "X" },
    { "user_id": "def456", "username": "Bob",   "symbol": "O" }
  ]
}
```

### Configuration
| Setting | Value |
|:---|:---|
| Match Module ID | `tictactoe` |
| Leaderboard ID | `ttt_global` |
| Leaderboard Sort | `desc` (highest score first) |
| Turn Timeout | `30 seconds` |
| Tick Rate | `5 ticks/second` |
| Server Key | `defaultkey` |

---

## 🏆 Leaderboard & Bonus Features

The global leaderboard (`ttt_global`) tracks:

| Column | Source | Description |
|:---|:---|:---|
| **Score** | `+100` per win | Accumulates over lifetime |
| **Wins** | metadata.wins | Total wins (incremented) |
| **Losses** | metadata.losses | Total losses (incremented) |
| **Win Streak** | metadata.win_streak | Resets on loss, increments on win |

The leaderboard is visible in the lobby screen and updates immediately after each game result.

### Turn Timer Logic
```lua
-- In match_loop(), called every tick (5x per second)
if state.status == "playing" and os.time() > state.move_deadline then
  local winner_symbol = other_symbol(state.turn)  -- Opponent wins
  state.status = "finished"
  state.winner = winner_symbol
  -- Update leaderboard and broadcast result
end
```

---

## 🌐 Deployment Guide

### Backend (Render)
1. Create a **PostgreSQL** database on [Render](https://render.com).
2. Create a **Web Service**, connect the GitHub repo, select **Docker** runtime.
3. Add environment variable: `NAKAMA_DATABASE_ADDRESS` = your Postgres internal URL.
4. Deploy. Render uses the root `Dockerfile` + `start.sh` automatically.

### Frontend (Vercel)
```bash
cd frontend
npm install -g vercel
vercel login
vercel env add VITE_NAKAMA_HOST production      # lila-nakama-xxxx.onrender.com
vercel env add VITE_NAKAMA_HTTP_SCHEME production  # https
vercel env add VITE_NAKAMA_WS_SCHEME production    # wss
vercel env add VITE_NAKAMA_HTTP_PORT production    # 443
vercel env add VITE_NAKAMA_SERVER_KEY production   # defaultkey
vercel --prod
```

### Alternative Platforms
| Platform | Files | Notes |
|:---|:---|:---|
| **Railway** | `deploy/railway.json` + `deploy/railway.nakama.Dockerfile` | Add `DATABASE_ADDRESS` env var |
| **AWS ECS** | `deploy/aws-ecs-taskdef.json` | Requires ECR image + RDS Postgres |
| **Render** | `deploy/render.yaml` | Referenced above |

---

## ⚖️ Design Decisions

### Why Nakama?
Nakama is purpose-built for game backends. It provides:
- A managed WebSocket match system with per-tick loops
- Built-in leaderboard, account, and session APIs
- Lua/JS/Go runtime for server-side logic
- Production-ready and battle-tested at scale

### Server-Authoritative Design
Clients only send **intent** (`{ "index": 4 }`). The server:
1. Validates the move (turn, bounds, occupied cell)
2. Updates the canonical board state
3. Checks win/draw conditions
4. Broadcasts the new state to ALL connected clients

This prevents cheating, ensures consistency, and makes the game resilient to network issues.

### Frontend Event Delegation
Instead of attaching click listeners to individual buttons (which break on re-renders), all interactions are handled by a **single delegated listener** on the root container:
```typescript
document.getElementById("app")!.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement).closest("[data-action]");
  if (!target) return;
  const action = target.getAttribute("data-action");
  // Route to the correct handler...
});
```
This eliminates "ghost clicks" and touchpad latency issues.

### Sparse Lua → JSON Parsing
Lua tables with `nil` values serialize as sparse JSON objects (`{ "1": "X", "3": "O" }`), not arrays. The frontend handles this:
```typescript
const cell = Array.isArray(board) ? board[i] : (board[i] ?? board[String(i + 1)] ?? "");
```

---

## 🙏 Credits

Built with ❤️ by **[Krishna Bandewar](https://github.com/krishnabandewar)** for the **LILA Backend Assignment A**.

| Technology | Credit |
|:---|:---|
| [Nakama](https://heroiclabs.com/) | Heroic Labs — Open source game server |
| [Vite](https://vitejs.dev/) | Lightning-fast frontend tooling |
| [Vercel](https://vercel.com/) | Zero-config frontend deployment |
| [Render](https://render.com/) | Reliable container hosting |
| [Inter Font](https://rsms.me/inter/) | Beautiful, readable typography |

---

<div align="center">

**[🎮 Play the Game](https://lila-tictactoe-ui.vercel.app)** · **[📦 View Source](https://github.com/krishnabandewar/LILA-TICKTACTOE)** · **[⚙️ Backend Health](https://lila-nakama-w0pr.onrender.com)**

*Made for LILA · April 2026*

</div>
