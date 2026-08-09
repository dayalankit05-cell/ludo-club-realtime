export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export type TokenStatus = 'YARD' | 'MAIN' | 'HOME_STRETCH' | 'FINISHED';

export interface TokenState {
  id: number; // 0, 1, 2, 3
  color: PlayerColor;
  status: TokenStatus;
  stepCount: number; // -1 for YARD, 0..50 for MAIN, 51..55 for HOME_STRETCH, 56 for FINISHED
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  isBot: boolean;
  isHost: boolean;
  isConnected: boolean;
  avatarSeed: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: PlayerColor;
  text: string;
  emoji?: string;
  timestamp: number;
}

export type GameStatus = 'LOBBY' | 'PLAYING' | 'FINISHED';

export interface GameState {
  roomId: string;
  status: GameStatus;
  players: Record<PlayerColor, Player | null>;
  tokens: Record<PlayerColor, TokenState[]>;
  turnOrder: PlayerColor[];
  currentTurnIndex: number;
  diceValue: number | null;
  hasRolled: boolean;
  consecutiveSixes: number;
  validMoves: number[]; // Array of token IDs that can legally move
  winners: PlayerColor[];
  lastActionText: string | null;
  chatMessages: ChatMessage[];
  updatedAt: number;
}

// Client -> Server Messages
export type ClientMessage =
  | { type: 'CREATE_ROOM'; playerName: string; preferredColor?: PlayerColor }
  | { type: 'JOIN_ROOM'; roomId: string; playerName: string; preferredColor?: PlayerColor }
  | { type: 'TOGGLE_BOT'; roomId: string; color: PlayerColor }
  | { type: 'CHANGE_COLOR'; roomId: string; targetColor: PlayerColor }
  | { type: 'START_GAME'; roomId: string }
  | { type: 'ROLL_DICE'; roomId: string }
  | { type: 'MOVE_TOKEN'; roomId: string; tokenId: number }
  | { type: 'SEND_CHAT'; roomId: string; text: string; emoji?: string }
  | { type: 'RESTART_GAME'; roomId: string }
  | { type: 'LEAVE_ROOM'; roomId: string };

// Server -> Client Messages
export type ServerMessage =
  | { type: 'ROOM_STATE'; state: GameState; myColor: PlayerColor | null }
  | { type: 'ERROR'; message: string }
  | { type: 'PLAYER_REACTION'; senderColor: PlayerColor; emoji: string }
  | { type: 'SOUND_EVENT'; sound: 'roll' | 'move' | 'capture' | 'home' | 'win' };
