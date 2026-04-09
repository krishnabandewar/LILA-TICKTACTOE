import "./style.css";
import { Client } from "@heroiclabs/nakama-js";

type Cell = "X" | "O" | null;

type PlayerInfo = {
  user_id: string;
  username: string;
  symbol: "X" | "O";
};

type GameState = {
  board: Cell[];
  status: "waiting" | "playing" | "finished";
  turn: "X" | "O";
  winner: "X" | "O" | "draw" | null;
  move_deadline: number | null;
  players: PlayerInfo[];
};

type LeaderboardRow = {
  username: string;
  wins: number;
  losses: number;
  score: number;
  win_streak: number;
};

type RoomRow = {
  match_id: string;
  size: number;
};

const appElement = document.getElementById("app") as HTMLDivElement | null;
if (appElement === null) {
  throw new Error("Missing root app element.");
}
const app = appElement;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const httpScheme = import.meta.env.VITE_NAKAMA_HTTP_SCHEME ?? "http";
const wsScheme = import.meta.env.VITE_NAKAMA_WS_SCHEME ?? "ws";
const host = import.meta.env.VITE_NAKAMA_HOST ?? "127.0.0.1";
const httpPort = import.meta.env.VITE_NAKAMA_HTTP_PORT ?? "7350";
const serverKey = import.meta.env.VITE_NAKAMA_SERVER_KEY ?? "defaultkey";

const useSSL = httpScheme === "https";
const client = new Client(serverKey, host, httpPort, useSSL);
const socket = client.createSocket(wsScheme === "wss");

let session: Awaited<ReturnType<Client["authenticateCustom"]>> | null = null;
let currentUserId = "";
let currentUsername = "";
let currentMatchId = "";
let mySymbol: "X" | "O" | null = null;
let boardState: GameState | null = null;
let turnCountdown = 30;
let timerHandle: number | null = null;

const ui = {
  status: "",
  screen: "auth" as "auth" | "lobby" | "game",
  searching: false,
  roomCode: "",
  rooms: [] as RoomRow[],
  leaderboard: [] as LeaderboardRow[],
};

function render() {
  app.innerHTML = `
    <main class="container">
      <h1 class="title">Multiplayer Tic-Tac-Toe</h1>
      <p class="subtitle">Server-authoritative gameplay on Nakama</p>
      <section class="panel">
        ${renderScreen()}
      </section>
    </main>
  `;

}

function initEventListeners() {
  app.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest("button");
    if (!button || button.disabled) return;

    const id = button.id;
    const matchId = button.dataset.matchId;
    const cellIdx = button.dataset.idx;

    if (id === "login") await onLogin();
    else if (id === "quick-match") await onQuickMatch();
    else if (id === "create-room") await onCreateRoom();
    else if (id === "refresh-rooms") await onRefreshRooms();
    else if (id === "join-room-code") await onJoinRoomCode();
    else if (id === "leave-match") await onLeaveMatch();
    else if (id === "play-again") await onPlayAgain();
    else if (matchId) await joinRoom(matchId);
    else if (cellIdx !== undefined) await sendMove(Number(cellIdx));
  });

  app.addEventListener("input", (event) => {
    const target = event.target as HTMLInputElement;
    if (target.id === "room-code") {
      ui.roomCode = target.value.trim();
    }
  });
}

function renderScreen(): string {
  if (ui.screen === "auth") {
    return `
      <label>Nickname</label>
      <input id="nickname" maxlength="20" placeholder="Who are you?" />
      <div class="actions">
        <button id="login">Continue</button>
      </div>
      <p class="status">${ui.status}</p>
    `;
  }

  if (ui.screen === "lobby") {
    return `
      <p class="welcome">Hi <strong>${escapeHtml(currentUsername)}</strong></p>
      <div class="actions stacked mt-sm">
        <button id="quick-match" ${ui.searching ? "disabled" : ""}>Find random player</button>
        <button id="create-room">Create room</button>
        <button id="refresh-rooms">Refresh open rooms</button>
      </div>
      <div class="room-join">
        <input id="room-code" value="${escapeHtml(ui.roomCode)}" placeholder="Paste room id to join" />
        <button id="join-room-code">Join room by code</button>
      </div>
      ${renderOpenRooms()}
      <p class="status">${ui.searching ? "Finding a random player..." : ui.status}</p>
      ${renderLeaderboard()}
    `;
  }

  if (ui.screen === "game" && boardState) {
    const isFinished = boardState.status === "finished";
    const isPlaying = boardState.status === "playing";
    const isMyTurn = Boolean(mySymbol && boardState.turn === mySymbol && isPlaying);

    // Turn label with color class
    let turnLabel: string;
    let turnClass: string;
    if (isFinished) {
      turnLabel = gameResultText(boardState);
      turnClass = "turn is-done";
    } else {
      turnLabel = isMyTurn ? `Your turn (${mySymbol})` : `Opponent's turn (${boardState.turn})`;
      turnClass = `turn ${boardState.turn === "X" ? "is-x" : "is-o"}${isMyTurn ? " my-turn" : ""}`;
    }

    // Countdown with urgency
    const urgentClass = turnCountdown <= 10 ? " urgent" : "";
    const countdown = isPlaying
      ? `<p class="deadline${urgentClass}">⏱ ${turnCountdown}s remaining</p>`
      : "";

    return `
      <div class="game-header">
        <p class="muted">${playersText(boardState)}</p>
        <p class="${turnClass}"><strong>${turnLabel}</strong></p>
        ${countdown}
      </div>
      <div class="board">
        ${Array.from({ length: 9 })
          .map((_, idx) => {
            const b = boardState!.board as any;
            const val: string | null = Array.isArray(b) ? b[idx] : (b[idx] ?? b[String(idx + 1)]) ?? null;
            
            const isOccupied = Boolean(val);
            const disabled = (isOccupied || !isMyTurn) ? "disabled" : "";
            const cellClass = val === "X" ? "cell cell-x" : val === "O" ? "cell cell-o" : "cell";

            return `<button class="${cellClass}" ${disabled} data-idx="${idx}">${val ?? ""}</button>`;
          })
          .join("")}
      </div>
      <div class="actions mt-sm">
        <button id="leave-match">Leave room</button>
        ${isFinished ? '<button id="play-again" class="primary">Play again</button>' : ""}
      </div>
      <p class="status">${ui.status}</p>
      <div class="hints mt-sm">
        <p class="muted small">ℹ️ Symbols are assigned automatically: Room creator gets X, joiner gets O.</p>
      </div>
      ${renderLeaderboard()}
    `;
  }

  return `<p class="status">${ui.status}</p>`;
}

function renderOpenRooms() {
  if (!ui.rooms.length) {
    return `<p class="muted mt-sm">No open rooms yet.</p>`;
  }

  return `
    <div class="rooms mt-sm">
      ${ui.rooms
        .map(
          (room) => `
            <div class="room-row">
              <code>${shortRoomId(room.match_id)}</code>
              <button class="join-room" data-match-id="${room.match_id}">Join</button>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderLeaderboard() {
  if (!ui.leaderboard.length) {
    return "";
  }

  return `
    <div class="leaderboard">
      <h3>Leaderboard</h3>
      <table>
        <thead><tr><th>Player</th><th>W</th><th>L</th><th>Streak</th><th>Score</th></tr></thead>
        <tbody>
          ${ui.leaderboard
            .map(
              (row) =>
                `<tr><td>${escapeHtml(row.username)}</td><td>${row.wins}</td><td>${row.losses}</td><td>${row.win_streak}</td><td>${row.score}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}



async function onLogin() {
  const nicknameInput = document.getElementById("nickname") as HTMLInputElement | null;
  const nickname = nicknameInput?.value.trim() ?? "";
  if (!nickname) {
    ui.status = "Please enter a nickname.";
    render();
    return;
  }

  try {
    const id = crypto.randomUUID();
    session = await client.authenticateCustom(id, true, nickname);
    currentUserId = session.user_id ?? "";
    currentUsername = nickname;
    await socket.connect(session, true);
    bindSocketEvents();
    ui.screen = "lobby";
    ui.status = "Connected.";
    await loadLeaderboard();
    await loadOpenRooms();
    render();
  } catch (error) {
    ui.status = `Login failed: ${(error as Error).message}`;
    render();
  }
}

function bindSocketEvents() {
  socket.onmatchmakermatched = async (matched) => {
    try {
      const match = await socket.joinMatch(matched.token);
      currentMatchId = match.match_id;
      mySymbol = null;
      ui.screen = "game";
      ui.searching = false;
      ui.status = "Match found.";
      resetCountdown();
      render();
    } catch (error) {
      ui.searching = false;
      ui.status = `Could not join matched room: ${(error as Error).message}`;
      render();
    }
  };

  socket.onmatchdata = (matchData) => {
    if (matchData.op_code !== 10 || ui.screen !== "game") {
      return;
    }

    const data = JSON.parse(decoder.decode(matchData.data)) as GameState;
    boardState = data;
    const me = data.players.find((player) => player.user_id === currentUserId);
    mySymbol = me?.symbol ?? null;
    ui.status = mySymbol ? `You are ${mySymbol}` : "Waiting for symbol assignment...";
    syncCountdown(data);
    render();
  };

  socket.onchannelmessage = () => {};
}

async function onQuickMatch() {
  if (!session) return;
  try {
    ui.searching = true;
    ui.status = "";
    render();
    await socket.addMatchmaker("*", 2, 2);
  } catch (error) {
    ui.searching = false;
    ui.status = `Matchmaking failed: ${(error as Error).message}`;
    render();
  }
}

async function onCreateRoom() {
  if (!session) return;
  try {
    const response = await client.rpc(session, "create_tictactoe_room", {});
    const parsed = response.payload as { match_id: string };
    const match = await socket.joinMatch(parsed.match_id);
    currentMatchId = match.match_id;
    boardState = null;
    mySymbol = null;
    ui.screen = "game";
    ui.status = "Room created. Waiting for opponent...";
    ui.roomCode = currentMatchId;
    resetCountdown();
    render();
  } catch (error) {
    ui.status = `Create room failed: ${(error as Error).message}`;
    render();
  }
}

async function onRefreshRooms() {
  await loadOpenRooms();
  render();
}

async function onJoinRoomCode() {
  if (!ui.roomCode) {
    ui.status = "Enter a room code first.";
    render();
    return;
  }
  await joinRoom(ui.roomCode);
}

async function joinRoom(matchId: string) {
  if (!session) return;
  try {
    const match = await socket.joinMatch(matchId);
    currentMatchId = match.match_id;
    ui.screen = "game";
    ui.status = "Joined room.";
    resetCountdown();
    render();
  } catch (error) {
    ui.status = `Join room failed: ${(error as Error).message}`;
    render();
  }
}

async function onLeaveMatch() {
  if (currentMatchId) {
    try {
      // Best effort to notify server, but don't block UI if it fails
      socket.leaveMatch(currentMatchId);
    } catch (e) {
      console.warn("Error leaving match:", e);
    }
  }

  // Clear local state immediately for snappy UI
  currentMatchId = "";
  mySymbol = null;
  boardState = null;
  stopCountdown();
  ui.screen = "lobby";
  ui.status = "Left room.";
  render();

  // Load background data without blocking
  loadLeaderboard();
  loadOpenRooms();
}

async function onPlayAgain() {
  await onLeaveMatch();
  await onQuickMatch();
}

async function sendMove(idx: number) {
  if (!currentMatchId || !boardState || boardState.status !== "playing") return;
  if (!mySymbol || boardState.turn !== mySymbol) return;
  const b = boardState.board as any;
  const isOccupied = Array.isArray(b) ? b[idx] : (b[idx] ?? b[String(idx + 1)]);
  if (isOccupied) return;

  const payload = encoder.encode(JSON.stringify({ index: idx }));
  await socket.sendMatchState(currentMatchId, 1, payload);
}

function playersText(state: GameState) {
  if (!state.players.length) return "Waiting for players...";
  return state.players
    .map((player) => `${player.username} (${player.symbol})`)
    .join(" vs ");
}

function gameResultText(state: GameState) {
  if (state.winner === "draw") return "Draw";
  if (!state.winner) return "Finished";
  return `Winner: ${state.winner}`;
}

async function loadLeaderboard() {
  if (!session) return;
  try {
    const result = await (client as any).listLeaderboardRecords(session, "ttt_global", undefined, undefined, 10);
    const records = (result.records ?? []) as Array<Record<string, any>>;
    ui.leaderboard = records.map((record) => {
      const metadata = (record.metadata ?? {}) as Record<string, number>;
      const wins = Number(metadata.wins ?? 0);
      const losses = Number(metadata.losses ?? 0);
      const win_streak = Number(metadata.win_streak ?? 0);
      return {
        username: String(record.username || record.owner_id || "Unknown"),
        wins,
        losses,
        score: Number(record.score ?? 0),
        win_streak,
      };
    });
  } catch {
    ui.leaderboard = [];
  }
}

async function loadOpenRooms() {
  if (!session) return;
  try {
    const response = await client.rpc(session, "list_tictactoe_rooms", {});
    const payload = response.payload as { rooms?: RoomRow[] };
    ui.rooms = (payload.rooms ?? []).filter((room) => room.size < 2);
  } catch {
    ui.rooms = [];
  }
}

function resetCountdown(startAt = 30) {
  turnCountdown = startAt;
  stopCountdown();
  timerHandle = window.setInterval(() => {
    if (turnCountdown > 0) {
      turnCountdown -= 1;
      if (ui.screen === "game") {
        render();
      }
    }
  }, 1000);
}

function stopCountdown() {
  if (timerHandle !== null) {
    window.clearInterval(timerHandle);
    timerHandle = null;
  }
}

function syncCountdown(state: GameState) {
  if (state.status !== "playing" || !state.move_deadline) {
    stopCountdown();
    turnCountdown = 0;
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const next = Math.max(0, state.move_deadline - now);
  resetCountdown(next);
}

function shortRoomId(value: string) {
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

initEventListeners();
render();
