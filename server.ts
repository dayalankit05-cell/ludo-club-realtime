import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocket, WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  ClientMessage,
  GameState,
  Player,
  PlayerColor,
  ServerMessage,
  TokenState,
} from './src/types';
import {
  COLOR_START_INDEX,
  createInitialGameState,
  getBestBotMove,
  getGlobalStepIndex,
  getValidMoves,
  PLAYERS_ORDER,
  SAFE_STAR_STEPS,
} from './src/lib/ludoEngine';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrade explicitly on /ws route
server.on('upgrade', (request, socket, head) => {
  try {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  } catch (err) {
    socket.destroy();
  }
});

// In-Memory Storage for Active Rooms
const rooms = new Map<string, GameState>();

// Socket Metadata Map
interface ClientSession {
  ws: WebSocket;
  roomId?: string;
  color?: PlayerColor;
  playerId?: string;
}
const sessions = new Map<WebSocket, ClientSession>();

// Generate 6-Character Room Code
function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Broadcast Message to all clients in a room
function broadcastToRoom(roomId: string, message: ServerMessage) {
  const payload = JSON.stringify(message);
  for (const [ws, session] of sessions.entries()) {
    if (session.roomId === roomId && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

// Send tailored state update to specific client
function sendRoomState(ws: WebSocket, state: GameState, myColor: PlayerColor | null) {
  if (ws.readyState === WebSocket.OPEN) {
    const msg: ServerMessage = { type: 'ROOM_STATE', state, myColor };
    ws.send(JSON.stringify(msg));
  }
}

// Broadcast room state to everyone in room with their respective colors
function broadcastRoomState(roomId: string) {
  const state = rooms.get(roomId);
  if (!state) return;

  for (const [ws, session] of sessions.entries()) {
    if (session.roomId === roomId && ws.readyState === WebSocket.OPEN) {
      sendRoomState(ws, state, session.color || null);
    }
  }
}

// Get next active player color in order
function getNextTurnColor(state: GameState, currentColor: PlayerColor): PlayerColor {
  const currentIndex = PLAYERS_ORDER.indexOf(currentColor);
  for (let i = 1; i <= 4; i++) {
    const nextColor = PLAYERS_ORDER[(currentIndex + i) % 4];
    const player = state.players[nextColor];
    // Must be a player/bot in the game who hasn't finished all 4 tokens
    if (player && !state.winners.includes(nextColor)) {
      return nextColor;
    }
  }
  return currentColor;
}

// Track pending bot turn timers per room to avoid duplicates
const botTurnTimers = new Map<string, NodeJS.Timeout>();

// Automatically trigger AI Bot action if current turn is a Bot
function checkAndRunBotTurn(roomId: string) {
  const state = rooms.get(roomId);
  if (!state || state.status !== 'PLAYING') return;

  const currentTurnColor = PLAYERS_ORDER[state.currentTurnIndex];
  const currentPlayer = state.players[currentTurnColor];

  // Clear existing pending timer for this room
  if (botTurnTimers.has(roomId)) {
    clearTimeout(botTurnTimers.get(roomId)!);
    botTurnTimers.delete(roomId);
  }

  if (currentPlayer && currentPlayer.isBot) {
    const timer = setTimeout(() => {
      botTurnTimers.delete(roomId);
      const currentState = rooms.get(roomId);
      if (!currentState || currentState.status !== 'PLAYING') return;
      const turnColor = PLAYERS_ORDER[currentState.currentTurnIndex];
      if (turnColor !== currentTurnColor) return;

      if (!currentState.hasRolled) {
        // Bot Rolls Dice
        handleRollDice(roomId, currentTurnColor);
      } else if (currentState.validMoves.length > 0) {
        // Bot Moves Token
        const bestTokenId = getBestBotMove(currentState, currentTurnColor);
        if (bestTokenId !== null) {
          handleMoveToken(roomId, currentTurnColor, bestTokenId);
        }
      }
    }, 1000);

    botTurnTimers.set(roomId, timer);
  }
}

// Core Game Action Handlers
function handleRollDice(roomId: string, color: PlayerColor) {
  const state = rooms.get(roomId);
  if (!state || state.status !== 'PLAYING') return;

  const currentTurnColor = PLAYERS_ORDER[state.currentTurnIndex];
  if (currentTurnColor !== color || state.hasRolled) return;

  // Roll 1..6
  const diceValue = Math.floor(Math.random() * 6) + 1;
  state.diceValue = diceValue;
  state.hasRolled = true;

  if (diceValue === 6) {
    state.consecutiveSixes += 1;
  } else {
    state.consecutiveSixes = 0;
  }

  // 3 Consecutive Sixes Rule -> Cancel turn
  if (state.consecutiveSixes >= 3) {
    state.lastActionText = `${color.toUpperCase()} rolled 3 Sixes in a row! Turn lost.`;
    state.hasRolled = false;
    state.consecutiveSixes = 0;
    state.validMoves = [];
    const nextColor = getNextTurnColor(state, color);
    state.currentTurnIndex = PLAYERS_ORDER.indexOf(nextColor);
    state.updatedAt = Date.now();
    broadcastRoomState(roomId);
    checkAndRunBotTurn(roomId);
    return;
  }

  // Calculate Valid Moves
  const validMoves = getValidMoves(state.tokens, color, diceValue);
  state.validMoves = validMoves;
  state.lastActionText = `${color.toUpperCase()} rolled a ${diceValue}!`;
  state.updatedAt = Date.now();

  broadcastRoomState(roomId);

  // If NO valid moves -> pass turn after 1.2s
  if (validMoves.length === 0) {
    setTimeout(() => {
      const st = rooms.get(roomId);
      if (!st || st.status !== 'PLAYING') return;

      // Extra roll if 6 was rolled even if no move?
      // In Ludo, if you roll 6 but have no move (e.g. all tokens in yard and none can open? Wait, 6 ALWAYS opens from yard!),
      // or if all tokens are blocked by exact roll at home stretch, you pass turn unless you rolled 6!
      if (diceValue === 6) {
        st.hasRolled = false;
        st.lastActionText = `${color.toUpperCase()} rolled 6 but no moves! Extra roll!`;
      } else {
        st.hasRolled = false;
        st.consecutiveSixes = 0;
        const nextColor = getNextTurnColor(st, color);
        st.currentTurnIndex = PLAYERS_ORDER.indexOf(nextColor);
        st.lastActionText = `No valid moves for ${color.toUpperCase()}. Pass turn.`;
      }
      st.updatedAt = Date.now();
      broadcastRoomState(roomId);
      checkAndRunBotTurn(roomId);
    }, 1200);
  } else if (validMoves.length > 0 && state.players[color]?.isBot) {
    // If Bot has valid moves, select the best move and execute after a short delay
    setTimeout(() => {
      const st = rooms.get(roomId);
      if (!st || st.status !== 'PLAYING') return;
      const bestTokenId = getBestBotMove(st, color);
      if (bestTokenId !== null) {
        handleMoveToken(roomId, color, bestTokenId);
      }
    }, 800);
  }
}

function handleMoveToken(roomId: string, color: PlayerColor, tokenId: number) {
  const state = rooms.get(roomId);
  if (!state || state.status !== 'PLAYING') return;

  const currentTurnColor = PLAYERS_ORDER[state.currentTurnIndex];
  if (currentTurnColor !== color || !state.hasRolled) return;
  if (!state.validMoves.includes(tokenId)) return;

  const dice = state.diceValue || 0;
  const token = state.tokens[color][tokenId];
  let bonusTurn = false;
  let actionLog = '';

  if (token.status === 'YARD') {
    // Open from Yard
    token.status = 'MAIN';
    token.stepCount = 0;
    actionLog = `${color.toUpperCase()} opened Token #${tokenId + 1}!`;
    bonusTurn = true; // Opening with 6 gives extra turn!
  } else {
    // Move on Track
    const newStep = token.stepCount + dice;

    if (newStep === 56) {
      // Reached Home!
      token.status = 'FINISHED';
      token.stepCount = 56;
      actionLog = `🎉 ${color.toUpperCase()} brought Token #${tokenId + 1} HOME!`;
      bonusTurn = true;
    } else if (newStep > 50) {
      // Home stretch
      token.status = 'HOME_STRETCH';
      token.stepCount = newStep;
      actionLog = `${color.toUpperCase()} moved Token #${tokenId + 1} into Home Stretch!`;
    } else {
      // Main track
      token.status = 'MAIN';
      token.stepCount = newStep;
      actionLog = `${color.toUpperCase()} moved Token #${tokenId + 1}.`;

      // Check for Capture/Cutting opponent tokens!
      const landingGlobalIdx = getGlobalStepIndex(color, newStep);
      const isSafeSpot = SAFE_STAR_STEPS.includes(landingGlobalIdx);

      if (!isSafeSpot) {
        for (const oppColor of PLAYERS_ORDER) {
          if (oppColor === color) continue;
          const oppTokens = state.tokens[oppColor];
          for (const oppT of oppTokens) {
            if (oppT.status === 'MAIN' && oppT.stepCount <= 50) {
              const oppGlobalIdx = getGlobalStepIndex(oppColor, oppT.stepCount);
              if (oppGlobalIdx === landingGlobalIdx) {
                // Cut Opponent Token!
                oppT.status = 'YARD';
                oppT.stepCount = -1;
                bonusTurn = true;
                actionLog = `💥 ${color.toUpperCase()} CUT ${oppColor.toUpperCase()}'s token! Extra turn!`;
              }
            }
          }
        }
      }
    }
  }

  // Check if player completed all 4 tokens
  const allFinished = state.tokens[color].every((t) => t.status === 'FINISHED' || t.stepCount >= 56);
  if (allFinished && !state.winners.includes(color)) {
    state.winners.push(color);
    actionLog = `🏆 ${color.toUpperCase()} FINISHED IN PLACE #${state.winners.length}!`;
  }

  // Check Game Over Condition (if only 1 or 0 active players left without winning)
  const activePlayers = PLAYERS_ORDER.filter((c) => state.players[c] !== null);
  if (state.winners.length >= activePlayers.length - 1 || state.winners.length === activePlayers.length) {
    state.status = 'FINISHED';
    actionLog = `🏁 GAME OVER! Champions: ${state.winners.map((w) => w.toUpperCase()).join(', ')}`;
  }

  // Reset roll state
  state.hasRolled = false;
  state.validMoves = [];

  // Extra turn if rolled 6, captured token, or reached home
  if (dice === 6 || bonusTurn) {
    // Keep turn for same player
    state.lastActionText = `${actionLog} (Bonus Turn!)`;
  } else {
    // Advance turn to next active player
    state.consecutiveSixes = 0;
    const nextColor = getNextTurnColor(state, color);
    state.currentTurnIndex = PLAYERS_ORDER.indexOf(nextColor);
    state.lastActionText = actionLog;
  }

  state.updatedAt = Date.now();
  broadcastRoomState(roomId);

  if (state.status === 'PLAYING') {
    checkAndRunBotTurn(roomId);
  }
}

// Handle incoming WebSocket messages
wss.on('connection', (ws: WebSocket) => {
  sessions.set(ws, { ws });

  ws.on('message', (data: string) => {
    try {
      const msg: ClientMessage = JSON.parse(data.toString());
      const session = sessions.get(ws)!;

      switch (msg.type) {
        case 'CREATE_ROOM': {
          let roomId = generateRoomId();
          while (rooms.has(roomId)) {
            roomId = generateRoomId();
          }

          const preferredColor: PlayerColor = msg.preferredColor || 'red';
          const gameState = createInitialGameState(roomId, msg.playerName || 'Player 1', preferredColor);

          rooms.set(roomId, gameState);
          session.roomId = roomId;
          session.color = preferredColor;
          session.playerId = gameState.players[preferredColor]?.id;

          sendRoomState(ws, gameState, preferredColor);
          break;
        }

        case 'JOIN_ROOM': {
          const roomId = msg.roomId.trim().toUpperCase();
          const state = rooms.get(roomId);

          if (!state) {
            ws.send(JSON.stringify({ type: 'ERROR', message: `Room "${roomId}" not found!` } as ServerMessage));
            return;
          }

          // Find requested color or available color slot
          let assignedColor: PlayerColor | null = msg.preferredColor && !state.players[msg.preferredColor] ? msg.preferredColor : null;

          if (!assignedColor) {
            for (const color of PLAYERS_ORDER) {
              if (!state.players[color]) {
                assignedColor = color;
                break;
              }
            }
          }

          if (!assignedColor) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is already full! (4 players maximum)' } as ServerMessage));
            return;
          }

          const newPlayer: Player = {
            id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: msg.playerName || `Player (${assignedColor.toUpperCase()})`,
            color: assignedColor,
            isBot: false,
            isHost: false,
            isConnected: true,
            avatarSeed: Math.floor(Math.random() * 1000),
          };

          state.players[assignedColor] = newPlayer;
          state.lastActionText = `${newPlayer.name} joined as ${assignedColor.toUpperCase()}!`;
          state.updatedAt = Date.now();

          session.roomId = roomId;
          session.color = assignedColor;
          session.playerId = newPlayer.id;

          broadcastRoomState(roomId);
          break;
        }

        case 'TOGGLE_BOT': {
          const state = rooms.get(msg.roomId);
          if (!state || state.status === 'FINISHED') return;

          const targetColor = msg.color;
          const existingPlayer = state.players[targetColor];

          if (!existingPlayer) {
            // Add Bot to empty slot
            state.players[targetColor] = {
              id: `bot-${targetColor}`,
              name: `Bot ${targetColor.toUpperCase()}`,
              color: targetColor,
              isBot: true,
              isHost: false,
              isConnected: true,
              avatarSeed: Math.floor(Math.random() * 1000),
            };
            state.lastActionText = `Added Bot to ${targetColor.toUpperCase()} slot.`;
          } else if (existingPlayer.isBot) {
            // Remove Bot
            state.players[targetColor] = null;
            state.lastActionText = `Removed Bot from ${targetColor.toUpperCase()} slot.`;
          }

          state.updatedAt = Date.now();
          broadcastRoomState(msg.roomId);
          if (state.status === 'PLAYING') {
            checkAndRunBotTurn(msg.roomId);
          }
          break;
        }

        case 'START_GAME': {
          const state = rooms.get(msg.roomId);
          if (!state) return;

          // Auto-fill empty player slots with bots so 4 players are ready
          for (const color of PLAYERS_ORDER) {
            if (!state.players[color]) {
              state.players[color] = {
                id: `bot-${color}`,
                name: `Bot ${color.toUpperCase()}`,
                color,
                isBot: true,
                isHost: false,
                isConnected: true,
                avatarSeed: Math.floor(Math.random() * 1000),
              };
            }
          }

          state.status = 'PLAYING';
          state.currentTurnIndex = 0;
          state.lastActionText = `🎲 Ludo match started! ${PLAYERS_ORDER[0].toUpperCase()}'s turn!`;
          state.updatedAt = Date.now();

          broadcastRoomState(msg.roomId);
          checkAndRunBotTurn(msg.roomId);
          break;
        }

        case 'ROLL_DICE': {
          if (session.roomId && session.color) {
            handleRollDice(session.roomId, session.color);
          }
          break;
        }

        case 'MOVE_TOKEN': {
          if (session.roomId && session.color) {
            handleMoveToken(session.roomId, session.color, msg.tokenId);
          }
          break;
        }

        case 'SEND_CHAT': {
          const state = rooms.get(msg.roomId);
          if (!state || !session.color) return;

          const player = state.players[session.color];
          if (!player) return;

          const chatMsg = {
            id: `chat-${Date.now()}`,
            senderId: player.id,
            senderName: player.name,
            senderColor: session.color,
            text: msg.text,
            emoji: msg.emoji,
            timestamp: Date.now(),
          };

          state.chatMessages.push(chatMsg);
          if (state.chatMessages.length > 50) state.chatMessages.shift();
          state.updatedAt = Date.now();

          broadcastRoomState(msg.roomId);

          if (msg.emoji) {
            broadcastToRoom(msg.roomId, {
              type: 'PLAYER_REACTION',
              senderColor: session.color,
              emoji: msg.emoji,
            });
          }
          break;
        }

        case 'RESTART_GAME': {
          const state = rooms.get(msg.roomId);
          if (!state) return;

          const hostPlayer = Object.values(state.players).find((p) => p && p.isHost);
          const newInitial = createInitialGameState(
            msg.roomId,
            hostPlayer?.name || 'Player 1',
            hostPlayer?.color || 'red'
          );

          newInitial.players = { ...state.players };
          state.tokens = newInitial.tokens;
          state.status = 'PLAYING';
          state.winners = [];
          state.currentTurnIndex = 0;
          state.diceValue = null;
          state.hasRolled = false;
          state.consecutiveSixes = 0;
          state.validMoves = [];
          state.lastActionText = '✨ Game restarted! Good luck!';
          state.updatedAt = Date.now();

          broadcastRoomState(msg.roomId);
          checkAndRunBotTurn(msg.roomId);
          break;
        }
      }
    } catch (err) {
      console.error('Socket message parse error:', err);
    }
  });

  ws.on('close', () => {
    const session = sessions.get(ws);
    if (session && session.roomId && session.color) {
      const state = rooms.get(session.roomId);
      if (state) {
        const player = state.players[session.color];
        if (player) {
          if (state.status === 'PLAYING') {
            // Convert to AI Bot so match continues smoothly!
            player.isBot = true;
            player.isConnected = false;
            state.lastActionText = `${player.name} disconnected. Replaced by Bot.`;
            checkAndRunBotTurn(session.roomId);
          } else {
            // Remove from lobby
            state.players[session.color] = null;
            state.lastActionText = `${player.name} left the room.`;
          }
          state.updatedAt = Date.now();
          broadcastRoomState(session.roomId);
        }
      }
    }
    sessions.delete(ws);
  });
});

// Express API and Static / Vite Middleware Setup
async function startServer() {
  app.use(express.json());

  // Health Endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', activeRooms: rooms.size });
  });

  // REST API Endpoint: Get Room State
  app.get('/api/room/:roomId', (req, res) => {
    const roomId = req.params.roomId.toUpperCase();
    const state = rooms.get(roomId);
    if (!state) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json({ state });
  });

  // REST API Endpoint: Dispatch Game Action (HTTP Fallback)
  app.post('/api/action', (req, res) => {
    try {
      const { msg, color: requestColor } = req.body as { msg: ClientMessage; color?: PlayerColor };

      if (!msg) {
        return res.status(400).json({ error: 'Invalid payload' });
      }

      switch (msg.type) {
        case 'CREATE_ROOM': {
          let roomId = generateRoomId();
          while (rooms.has(roomId)) {
            roomId = generateRoomId();
          }
          const prefColor = msg.preferredColor || 'red';
          const gameState = createInitialGameState(roomId, msg.playerName || 'Player 1', prefColor);
          rooms.set(roomId, gameState);
          return res.json({ success: true, state: gameState, myColor: prefColor });
        }

        case 'JOIN_ROOM': {
          const roomId = msg.roomId.trim().toUpperCase();
          const state = rooms.get(roomId);
          if (!state) {
            return res.status(404).json({ error: `Room "${roomId}" not found!` });
          }

          let assignedColor: PlayerColor | null =
            msg.preferredColor && !state.players[msg.preferredColor] ? msg.preferredColor : null;

          if (!assignedColor) {
            for (const c of PLAYERS_ORDER) {
              if (!state.players[c]) {
                assignedColor = c;
                break;
              }
            }
          }

          if (!assignedColor) {
            return res.status(400).json({ error: 'Room is full! (4 players maximum)' });
          }

          const newPlayer: Player = {
            id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: msg.playerName || `Player (${assignedColor.toUpperCase()})`,
            color: assignedColor,
            isBot: false,
            isHost: false,
            isConnected: true,
            avatarSeed: Math.floor(Math.random() * 1000),
          };

          state.players[assignedColor] = newPlayer;
          state.lastActionText = `${newPlayer.name} joined as ${assignedColor.toUpperCase()}!`;
          state.updatedAt = Date.now();
          broadcastRoomState(roomId);
          return res.json({ success: true, state, myColor: assignedColor });
        }

        case 'TOGGLE_BOT': {
          const state = rooms.get(msg.roomId);
          if (!state) return res.status(404).json({ error: 'Room not found' });
          const targetColor = msg.color;
          const existingPlayer = state.players[targetColor];
          if (!existingPlayer) {
            state.players[targetColor] = {
              id: `bot-${targetColor}`,
              name: `Bot ${targetColor.toUpperCase()}`,
              color: targetColor,
              isBot: true,
              isHost: false,
              isConnected: true,
              avatarSeed: Math.floor(Math.random() * 1000),
            };
            state.lastActionText = `Added Bot to ${targetColor.toUpperCase()} slot.`;
          } else if (existingPlayer.isBot) {
            state.players[targetColor] = null;
            state.lastActionText = `Removed Bot from ${targetColor.toUpperCase()} slot.`;
          }
          state.updatedAt = Date.now();
          broadcastRoomState(msg.roomId);
          if (state.status === 'PLAYING') checkAndRunBotTurn(msg.roomId);
          return res.json({ success: true, state });
        }

        case 'START_GAME': {
          const state = rooms.get(msg.roomId);
          if (!state) return res.status(404).json({ error: 'Room not found' });
          for (const color of PLAYERS_ORDER) {
            if (!state.players[color]) {
              state.players[color] = {
                id: `bot-${color}`,
                name: `Bot ${color.toUpperCase()}`,
                color,
                isBot: true,
                isHost: false,
                isConnected: true,
                avatarSeed: Math.floor(Math.random() * 1000),
              };
            }
          }
          state.status = 'PLAYING';
          state.currentTurnIndex = 0;
          state.lastActionText = `🎲 Ludo match started! ${PLAYERS_ORDER[0].toUpperCase()}'s turn!`;
          state.updatedAt = Date.now();
          broadcastRoomState(msg.roomId);
          checkAndRunBotTurn(msg.roomId);
          return res.json({ success: true, state });
        }

        case 'ROLL_DICE': {
          const color = requestColor || PLAYERS_ORDER[rooms.get(msg.roomId)?.currentTurnIndex || 0];
          handleRollDice(msg.roomId, color);
          const state = rooms.get(msg.roomId);
          return res.json({ success: true, state });
        }

        case 'MOVE_TOKEN': {
          const color = requestColor || PLAYERS_ORDER[rooms.get(msg.roomId)?.currentTurnIndex || 0];
          handleMoveToken(msg.roomId, color, msg.tokenId);
          const state = rooms.get(msg.roomId);
          return res.json({ success: true, state });
        }

        case 'SEND_CHAT': {
          const state = rooms.get(msg.roomId);
          if (!state || !requestColor) return res.status(400).json({ error: 'Invalid request' });
          const player = state.players[requestColor];
          if (player) {
            const chatMsg = {
              id: `chat-${Date.now()}`,
              senderId: player.id,
              senderName: player.name,
              senderColor: requestColor,
              text: msg.text,
              emoji: msg.emoji,
              timestamp: Date.now(),
            };
            state.chatMessages.push(chatMsg);
            if (state.chatMessages.length > 50) state.chatMessages.shift();
            state.updatedAt = Date.now();
            broadcastRoomState(msg.roomId);
          }
          return res.json({ success: true, state });
        }

        case 'RESTART_GAME': {
          const state = rooms.get(msg.roomId);
          if (!state) return res.status(404).json({ error: 'Room not found' });
          const hostPlayer = Object.values(state.players).find((p) => p && p.isHost);
          const newInitial = createInitialGameState(
            msg.roomId,
            hostPlayer?.name || 'Player 1',
            hostPlayer?.color || 'red'
          );
          newInitial.players = { ...state.players };
          state.tokens = newInitial.tokens;
          state.status = 'PLAYING';
          state.winners = [];
          state.currentTurnIndex = 0;
          state.diceValue = null;
          state.hasRolled = false;
          state.consecutiveSixes = 0;
          state.validMoves = [];
          state.lastActionText = '✨ Game restarted! Good luck!';
          state.updatedAt = Date.now();
          broadcastRoomState(msg.roomId);
          checkAndRunBotTurn(msg.roomId);
          return res.json({ success: true, state });
        }

        default:
          return res.status(400).json({ error: 'Unknown message type' });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  });

  // Serve static or Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🎮 Real-time Ludo Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
