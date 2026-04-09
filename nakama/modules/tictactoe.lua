local nk = require("nakama")
local leaderboard_id = "ttt_global"

local function serialize_state(state)
  local players = {}
  for _, p in pairs(state.players) do
    table.insert(players, { user_id = p.user_id, username = p.username, symbol = p.symbol })
  end

  return {
    board = state.board,
    status = state.status,
    turn = state.turn,
    winner = state.winner,
    move_deadline = state.move_deadline,
    players = players
  }
end

local function broadcast_state(dispatcher, state)
  local payload = nk.json_encode(serialize_state(state))
  dispatcher.broadcast_message(10, payload)
end

local function check_winner(board)
  local lines = {
    {1, 2, 3}, {4, 5, 6}, {7, 8, 9},
    {1, 4, 7}, {2, 5, 8}, {3, 6, 9},
    {1, 5, 9}, {3, 5, 7}
  }

  for _, line in ipairs(lines) do
    local a = board[line[1]]
    local b = board[line[2]]
    local c = board[line[3]]
    if a ~= "" and a == b and b == c then
      return a
    end
  end

  local full = true
  for i = 1, 9 do
    if board[i] == "" then
      full = false
      break
    end
  end

  if full then
    return "draw"
  end
  return nil
end

local function other_symbol(symbol)
  if symbol == "X" then
    return "O"
  end
  return "X"
end

local function update_leaderboard(winner_player, loser_player)
  if not winner_player or not loser_player then
    return
  end

  nk.leaderboard_record_write(
    leaderboard_id,
    winner_player.user_id,
    winner_player.username,
    100,
    0,
    { wins = 1, losses = 0, win_streak = 1 },
    "incr"
  )

  nk.leaderboard_record_write(
    leaderboard_id,
    loser_player.user_id,
    loser_player.username,
    0,
    0,
    { wins = 0, losses = 1, win_streak = 0 },
    "set"
  )
end

local M = {}

function M.match_init(context, params)
  local state = {
    board = { "", "", "", "", "", "", "", "", "" },
    players = {},
    presences = {},
    status = "waiting",
    turn = "X",
    winner = nil,
    move_deadline = nil
  }

  local tick_rate = 5
  local label = nk.json_encode({ mode = "tictactoe", status = "open" })
  return state, tick_rate, label
end

function M.match_join_attempt(context, dispatcher, tick, state, presence, metadata)
  if state.status == "finished" then
    return state, false, "match already finished"
  end
  if #state.presences >= 2 then
    return state, false, "room is full"
  end
  return state, true
end

function M.match_join(context, dispatcher, tick, state, presences)
  for _, presence in ipairs(presences) do
    if state.players[presence.user_id] == nil then
      local symbol = "X"
      if next(state.players) ~= nil then
        symbol = "O"
      end

      state.players[presence.user_id] = {
        user_id = presence.user_id,
        username = presence.username,
        symbol = symbol
      }
      table.insert(state.presences, presence)
    end
  end

  if #state.presences == 2 then
    state.status = "playing"
    state.move_deadline = os.time() + 30
  end

  broadcast_state(dispatcher, state)
  return state
end

function M.match_leave(context, dispatcher, tick, state, presences)
  for _, leaving in ipairs(presences) do
    state.players[leaving.user_id] = nil
    for i = #state.presences, 1, -1 do
      if state.presences[i].user_id == leaving.user_id then
        table.remove(state.presences, i)
      end
    end
  end

  if state.status == "playing" and #state.presences == 1 then
    local remaining = state.presences[1]
    if remaining then
      state.status = "finished"
      local winner = state.players[remaining.user_id]
      state.winner = winner and winner.symbol or nil
    end
  end

  broadcast_state(dispatcher, state)
  return state
end

function M.match_loop(context, dispatcher, tick, state, messages)
  if state.status == "playing" and state.move_deadline and os.time() > state.move_deadline then
    local winner_symbol = other_symbol(state.turn)
    state.status = "finished"
    state.winner = winner_symbol
  end

  for _, message in ipairs(messages) do
    if message.op_code == 1 and state.status == "playing" then
      local ok, payload = pcall(nk.json_decode, message.data)
      if not ok or type(payload.index) ~= "number" then
        goto continue
      end

      local idx = payload.index + 1
      local player = state.players[message.sender.user_id]
      if player == nil then
        goto continue
      end

      if player.symbol ~= state.turn then
        goto continue
      end

      if idx < 1 or idx > 9 then
        goto continue
      end

      if state.board[idx] ~= "" then
        goto continue
      end

      state.board[idx] = player.symbol
      local result = check_winner(state.board)
      if result ~= nil then
        state.status = "finished"
        state.winner = result

        if result ~= "draw" then
          local winner_player = nil
          local loser_player = nil
          for _, p in pairs(state.players) do
            if p.symbol == result then
              winner_player = p
            else
              loser_player = p
            end
          end
          update_leaderboard(winner_player, loser_player)
        end
      else
        state.turn = other_symbol(state.turn)
        state.move_deadline = os.time() + 30
      end
    end
    ::continue::
  end

  broadcast_state(dispatcher, state)
  return state
end

function M.match_terminate(context, dispatcher, tick, state, grace_seconds)
  return state
end

function M.match_signal(context, dispatcher, tick, state, data)
  return state, data
end

local function rpc_create_room(context, payload)
  local match_id = nk.match_create("tictactoe", {})
  return nk.json_encode({ match_id = match_id })
end

local function rpc_list_rooms(context, payload)
  local matches = nk.match_list(100, true, "", 0, 1, "")
  local result = {}
  for _, m in ipairs(matches) do
    table.insert(result, {
      match_id = m.match_id,
      size = m.size
    })
  end
  return nk.json_encode({ rooms = result })
end

local function init_leaderboard()
  pcall(function()
    nk.leaderboard_create(leaderboard_id, true, "desc", "best", "", { game = "tictactoe" }, true)
  end)
end

-- Nakama 3.x: registrations happen at module top-level using the nk global
init_leaderboard()
nk.register_rpc(rpc_create_room, "create_tictactoe_room")
nk.register_rpc(rpc_list_rooms, "list_tictactoe_rooms")

return M
