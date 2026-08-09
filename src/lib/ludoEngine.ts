import { GameState, PlayerColor, TokenState } from '../types';

export const PLAYERS_ORDER: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

export const COLOR_START_INDEX: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// Main 52 perimeter steps [row, col] on 15x15 grid
export const MAIN_PATH: [number, number][] = [
  [6, 1],  // 0  (Red Start - Star)
  [6, 2],  // 1
  [6, 3],  // 2
  [6, 4],  // 3
  [6, 5],  // 4
  [5, 6],  // 5
  [4, 6],  // 6
  [3, 6],  // 7
  [2, 6],  // 8  (Star)
  [1, 6],  // 9
  [0, 6],  // 10
  [0, 7],  // 11
  [0, 8],  // 12
  [1, 8],  // 13 (Green Start - Star)
  [2, 8],  // 14
  [3, 8],  // 15
  [4, 8],  // 16
  [5, 8],  // 17
  [6, 9],  // 18
  [6, 10], // 19
  [6, 11], // 20
  [6, 12], // 21 (Star)
  [6, 13], // 22
  [6, 14], // 23
  [7, 14], // 24
  [8, 14], // 25
  [8, 13], // 26 (Yellow Start - Star)
  [8, 12], // 27
  [8, 11], // 28
  [8, 10], // 29
  [8, 9],  // 30
  [9, 8],  // 31
  [10, 8], // 32
  [11, 8], // 33
  [12, 8], // 34 (Star)
  [13, 8], // 35
  [14, 8], // 36
  [14, 7], // 37
  [14, 6], // 38
  [13, 6], // 39 (Blue Start - Star)
  [12, 6], // 40
  [11, 6], // 41
  [10, 6], // 42
  [9, 6],  // 43
  [8, 5],  // 44
  [8, 4],  // 45
  [8, 3],  // 46
  [8, 2],  // 47 (Star)
  [8, 1],  // 48
  [8, 0],  // 49
  [7, 0],  // 50
  [6, 0],  // 51
];

// Safe Star steps on the main path
export const SAFE_STAR_STEPS = [0, 8, 13, 21, 26, 34, 39, 47];

// Home Stretch paths (5 steps + final home step 56)
export const HOME_STRETCH_PATHS: Record<PlayerColor, [number, number][]> = {
  red: [
    [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6] // 51..55, 56 is Home
  ],
  green: [
    [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]
  ],
  yellow: [
    [7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]
  ],
  blue: [
    [13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]
  ]
};

// Yard position coordinates for 4 tokens per color
export const YARD_POSITIONS: Record<PlayerColor, [number, number][]> = {
  red: [
    [1.5, 1.5], [1.5, 3.5],
    [3.5, 1.5], [3.5, 3.5]
  ],
  green: [
    [1.5, 10.5], [1.5, 12.5],
    [3.5, 10.5], [3.5, 12.5]
  ],
  yellow: [
    [10.5, 10.5], [10.5, 12.5],
    [12.5, 10.5], [12.5, 12.5]
  ],
  blue: [
    [10.5, 1.5], [10.5, 3.5],
    [12.5, 1.5], [12.5, 3.5]
  ]
};

/**
 * Calculates global main path step index from a player's relative stepCount (0..50)
 */
export function getGlobalStepIndex(color: PlayerColor, stepCount: number): number {
  if (stepCount < 0 || stepCount > 50) return -1;
  const startIndex = COLOR_START_INDEX[color];
  return (startIndex + stepCount) % 52;
}

/**
 * Gets exact [row, col] grid coordinate for a token
 */
export function getTokenCoordinate(token: TokenState): [number, number] {
  if (token.status === 'YARD' || token.stepCount < 0) {
    return YARD_POSITIONS[token.color][token.id];
  }

  if (token.status === 'FINISHED' || token.stepCount >= 56) {
    return HOME_STRETCH_PATHS[token.color][5]; // final home cell
  }

  if (token.stepCount <= 50) {
    const globalIdx = getGlobalStepIndex(token.color, token.stepCount);
    return MAIN_PATH[globalIdx];
  }

  // Home Stretch: stepCount 51..55 => index 0..4
  const stretchIdx = token.stepCount - 51;
  return HOME_STRETCH_PATHS[token.color][Math.min(stretchIdx, 5)];
}

/**
 * Determines valid move token IDs for current player given a dice roll
 */
export function getValidMoves(tokens: Record<PlayerColor, TokenState[]>, color: PlayerColor, diceValue: number): number[] {
  const playerTokens = tokens[color];
  const validIds: number[] = [];

  playerTokens.forEach((t) => {
    // If in YARD, requires dice == 6
    if (t.status === 'YARD') {
      if (diceValue === 6) {
        validIds.push(t.id);
      }
      return;
    }

    // If FINISHED, cannot move
    if (t.status === 'FINISHED' || t.stepCount >= 56) {
      return;
    }

    // Must not overshoot 56 (exact roll needed to enter Home center)
    const newStep = t.stepCount + diceValue;
    if (newStep <= 56) {
      validIds.push(t.id);
    }
  });

  return validIds;
}

/**
 * Creates initial clean GameState
 */
export function createInitialGameState(roomId: string, hostName: string, hostColor: PlayerColor = 'red'): GameState {
  const tokens: Record<PlayerColor, TokenState[]> = {
    red: [0, 1, 2, 3].map((id) => ({ id, color: 'red', status: 'YARD', stepCount: -1 })),
    green: [0, 1, 2, 3].map((id) => ({ id, color: 'green', status: 'YARD', stepCount: -1 })),
    yellow: [0, 1, 2, 3].map((id) => ({ id, color: 'yellow', status: 'YARD', stepCount: -1 })),
    blue: [0, 1, 2, 3].map((id) => ({ id, color: 'blue', status: 'YARD', stepCount: -1 })),
  };

  const players: Record<PlayerColor, any> = {
    red: null,
    green: null,
    yellow: null,
    blue: null,
  };

  players[hostColor] = {
    id: 'host-id',
    name: hostName,
    color: hostColor,
    isBot: false,
    isHost: true,
    isConnected: true,
    avatarSeed: Math.floor(Math.random() * 1000),
  };

  return {
    roomId,
    status: 'LOBBY',
    players,
    tokens,
    turnOrder: PLAYERS_ORDER,
    currentTurnIndex: 0,
    diceValue: null,
    hasRolled: false,
    consecutiveSixes: 0,
    validMoves: [],
    winners: [],
    lastActionText: `Room created! Host is ${hostName}`,
    chatMessages: [],
    updatedAt: Date.now(),
  };
}

/**
 * Selects best token for AI Bot
 */
export function getBestBotMove(gameState: GameState, color: PlayerColor): number | null {
  const validIds = gameState.validMoves;
  if (validIds.length === 0) return null;
  if (validIds.length === 1) return validIds[0];

  const dice = gameState.diceValue || 1;
  const playerTokens = gameState.tokens[color];

  let bestTokenId = validIds[0];
  let highestScore = -9999;

  for (const tid of validIds) {
    const token = playerTokens[tid];
    let score = 0;

    // Moving out of yard
    if (token.status === 'YARD') {
      score += 500;
    } else {
      const nextStep = token.stepCount + dice;

      // Entering Home (reaching 56)
      if (nextStep === 56) {
        score += 2000;
      }

      // Check capture potential
      const nextGlobalIdx = getGlobalStepIndex(color, nextStep);
      const isSafe = nextStep <= 50 && SAFE_STAR_STEPS.includes(nextGlobalIdx);

      if (nextStep <= 50 && !isSafe) {
        // Look for opponent tokens on nextGlobalIdx
        for (const oppColor of PLAYERS_ORDER) {
          if (oppColor === color) continue;
          const oppTokens = gameState.tokens[oppColor];
          for (const oppT of oppTokens) {
            if (oppT.status === 'MAIN' && oppT.stepCount <= 50) {
              const oppGlobalIdx = getGlobalStepIndex(oppColor, oppT.stepCount);
              if (oppGlobalIdx === nextGlobalIdx) {
                score += 1500; // High priority capture!
              }
            }
          }
        }
      }

      // Landing on safe spot
      if (isSafe) {
        score += 300;
      }

      // Progress value (prefer moving tokens closer to home)
      score += token.stepCount * 10;
    }

    if (score > highestScore) {
      highestScore = score;
      bestTokenId = tid;
    }
  }

  return bestTokenId;
}
