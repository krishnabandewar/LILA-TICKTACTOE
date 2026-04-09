# 🕹️ LILA Multiplayer Tic-Tac-Toe (Nakama)

A high-performance, **server-authoritative** multiplayer Tic-Tac-Toe game. Built with a production-ready architecture using the **Nakama** game server, **PostgreSQL**, and a modern **TypeScript** web client.

---

## 🚀 Live Links
- **Play Now:** [https://lila-tictactoe-ui.vercel.app](https://lila-tictactoe-ui.vercel.app)
- **Backend API:** `https://lila-nakama-w0pr.onrender.com`
- **GitHub Repository:** [https://github.com/krishnabandewar/LILA-TICKTACTOE](https://github.com/krishnabandewar/LILA-TICKTACTOE)

---

## ✨ Core Features
- **Server-Authoritative Game Logic:** All game state transitions and move validations occur on the Lua backend to prevent client-side manipulation.
- **Real-Time Synchronous Play:** WebSocket-driven state updates with extremely low latency.
- **Advanced Matchmaking:** 
  - 🧩 **Random Matchmaking:** Seamlessly find and pair with global opponents using Nakama's matchmaker.
  - 🏠 **Custom Rooms:** Create private rooms with unique Match IDs to play with friends.
  - 🔍 **Room Discovery:** Live listing of publicly available game rooms.
- **Bonus Feature: Leaderboard System:** Track global rankings with Wins, Losses, and **Win Streaks**.
- **Bonus Feature: Turn Timer:** 30-second move limit with automatic forfeit logic to ensure smooth gameplay.
- **Glassmorphic UI:** A modern, responsive design system optimized for both desktop and mobile touchpads.

---

## 🛠️ Technical Stack
- **Frontend:**
  - [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
  - [Nakama JavaScript Client](https://heroiclabs.com/docs/nakama/clients/javascript/)
  - CSS3 (Custom Glassmorphism Design System)
- **Backend:**
  - [Nakama 3.23.0](https://heroiclabs.com/) (Distributed Game Server)
  - Lua Cloud Scripts (Match handlers & RPCs)
  - [PostgreSQL](https://www.postgresql.org/) (Persistent Data Storage)
- **Infrastructure:**
  - Docker & Docker Compose (Containerization)
  - Render (Backend & DB Hosting)
  - Vercel (Frontend Hosting)

---

## 🏛️ System Architecture
The game follows a **State-Driven, Authoritative Server** model:
1. **Match Initialization:** The server creates a 3x3 board and manages player symbol assignment (X/O).
2. **Input Validation:** Clients send *intent* (desired move index). The server validates:
   - Is it the player's turn?
   - Is the move within bounds?
   - Is the target cell empty?
3. **State Broadcast:** Upon a valid move, the server updates the `boardState`, checks for win/draw conditions, and broadcasts the updated state to all connected clients.
4. **Resilience:** Graceful handling of player disconnections (automatic forfeit for the quitter) and turn timeouts.

---

## 🛠️ Local Development

### 1. Prerequisites
- [Docker & Docker Compose](https://www.docker.com/)
- [Node.js](https://nodejs.org/) (v18+)

### 2. Run the Backend
```bash
# Start Nakama and PostgreSQL
docker-compose up -d
```
Access the Nakama Console at `http://127.0.0.1:7351` (Username: `admin`, Password: `password`).

### 3. Run the Frontend
```bash
cd frontend
npm install
# Configure your local environment (copy .env.example)
npm run dev
```

---

## 🎮 How to Test

1. **Multiplayer Pairing:** Open the live link in *two different* browsers or private windows.
2. **Auth:** Login with different nicknames (e.g., "Player1" and "Player2").
3. **Random Match:** Click **"Find Random Player"** on both windows. You will be paired instantly.
4. **Room Join:** Alternatively, create a room in Window A, copy the `Match ID`, and join from Window B using the `Join` button.
5. **Turn Timer:** Let the turn idle for 30 seconds to see the automated forfeit and leaderboard update in action.

---

## ⚖️ Design Decisions
- **Event Delegation:** Implemented custom event delegation for UI interactions to avoid "click loss" during high-frequency React-style re-renders on touchpads.
- **Sparse Object Parsing:** Optimized frontend parsing for Lua-serialized sparse arrays to ensure cross-language data integrity.
- **Cloud-Ready Config:** Used environment variable injection for `DATABASE_ADDRESS` and `NAKAMA_HOST` to allow seamless transition between local, Render, and Railway environments.

---

Made with ❤️ by [Krishna Bandewar](https://github.com/krishnabandewar)
