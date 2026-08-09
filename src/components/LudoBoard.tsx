import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState, PlayerColor, TokenState } from '../types';
import {
  getTokenCoordinate,
  PLAYERS_ORDER,
  YARD_POSITIONS,
} from '../lib/ludoEngine';
import { playSound } from '../lib/audio';
import { LudoPawn } from './LudoPawn';

interface LudoBoardProps {
  gameState: GameState;
  myColor: PlayerColor | null;
  onSelectToken: (tokenId: number) => void;
}

const YARD_THEMES: Record<
  PlayerColor,
  {
    bg: string;
    border: string;
    glow: string;
    title: string;
    accent: string;
  }
> = {
  red: {
    bg: 'from-rose-600/90 via-red-700/90 to-red-950/90',
    border: 'border-rose-400',
    glow: 'shadow-[0_0_30px_rgba(244,63,94,0.8)]',
    title: 'LUFFY TEAM 👒',
    accent: 'bg-rose-500',
  },
  green: {
    bg: 'from-emerald-600/90 via-green-700/90 to-teal-950/90',
    border: 'border-emerald-400',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.8)]',
    title: 'ZORO TEAM ⚔️',
    accent: 'bg-emerald-500',
  },
  yellow: {
    bg: 'from-amber-500/90 via-yellow-600/90 to-amber-950/90',
    border: 'border-amber-300',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.8)]',
    title: 'SANJI TEAM 🚬',
    accent: 'bg-amber-400',
  },
  blue: {
    bg: 'from-cyan-600/90 via-blue-700/90 to-indigo-950/90',
    border: 'border-cyan-400',
    glow: 'shadow-[0_0_30px_rgba(6,182,212,0.8)]',
    title: 'JIMBEI TEAM ☀️',
    accent: 'bg-cyan-400',
  },
};

export const LudoBoard: React.FC<LudoBoardProps> = ({
  gameState,
  myColor,
  onSelectToken,
}) => {
  const currentTurnColor = PLAYERS_ORDER[gameState.currentTurnIndex];

  // Local state to track step-by-step animated movement of each token
  const [animatedSteps, setAnimatedSteps] = useState<Record<string, number>>({});
  const activeStepTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Sync server token step state to local animated steps with step-by-step walking animation!
  useEffect(() => {
    PLAYERS_ORDER.forEach((color) => {
      gameState.tokens[color].forEach((token) => {
        const key = `${color}-${token.id}`;
        const targetStep = token.stepCount;

        setAnimatedSteps((prev) => {
          const currentStep = prev[key];

          // 1. Initial assignment if missing
          if (currentStep === undefined) {
            return { ...prev, [key]: targetStep };
          }

          // 2. Token captured back to Yard (-1)
          if (targetStep === -1 && currentStep !== -1) {
            if (activeStepTimersRef.current[key]) {
              clearInterval(activeStepTimersRef.current[key]);
            }
            playSound.capture();
            return { ...prev, [key]: -1 };
          }

          // 3. Token opened from Yard (-1 -> 0)
          if (currentStep === -1 && targetStep === 0) {
            if (activeStepTimersRef.current[key]) {
              clearInterval(activeStepTimersRef.current[key]);
            }
            playSound.openYard();
            return { ...prev, [key]: 0 };
          }

          // 4. Token moving forward step-by-step!
          if (targetStep > currentStep) {
            if (!activeStepTimersRef.current[key]) {
              let curr = currentStep;

              activeStepTimersRef.current[key] = setInterval(() => {
                curr++;
                playSound.step(curr);

                setAnimatedSteps((p) => ({ ...p, [key]: curr }));

                if (curr >= targetStep) {
                  clearInterval(activeStepTimersRef.current[key]);
                  delete activeStepTimersRef.current[key];

                  if (targetStep === 56 || token.status === 'FINISHED') {
                    playSound.home();
                  }
                }
              }, 130); // 130ms per step hop
            }
          }

          return prev;
        });
      });
    });
  }, [gameState.tokens]);

  // Clean up step timers on unmount
  useEffect(() => {
    return () => {
      Object.keys(activeStepTimersRef.current).forEach((k) => {
        clearInterval(activeStepTimersRef.current[k]);
      });
    };
  }, []);

  // Map active animated tokens to grid positions for stacking
  const trackGridMap = new Map<string, { token: TokenState; color: PlayerColor }[]>();

  PLAYERS_ORDER.forEach((color) => {
    const tokens = gameState.tokens[color];
    tokens.forEach((token) => {
      const key = `${color}-${token.id}`;
      const stepVal = animatedSteps[key] ?? token.stepCount;

      if (stepVal !== -1) {
        const mockToken: TokenState = {
          ...token,
          stepCount: stepVal,
          status: stepVal >= 56 ? 'FINISHED' : stepVal > 50 ? 'HOME_STRETCH' : 'MAIN',
        };
        const [r, c] = getTokenCoordinate(mockToken);
        const gridKey = `${r.toFixed(1)},${c.toFixed(1)}`;
        if (!trackGridMap.has(gridKey)) {
          trackGridMap.set(gridKey, []);
        }
        trackGridMap.get(gridKey)!.push({ token: mockToken, color });
      }
    });
  });

  // Handle clicking a token
  const handleTokenClick = (color: PlayerColor, tokenId: number) => {
    if (color !== currentTurnColor) return;
    if (!gameState.hasRolled) return;
    if (gameState.validMoves.includes(tokenId)) {
      onSelectToken(tokenId);
    }
  };

  // Handle clicking Yard Box directly (Auto-selects yard token if movable)
  const handleYardClick = (color: PlayerColor) => {
    if (color !== currentTurnColor) return;
    if (!gameState.hasRolled) return;

    const movableYardToken = gameState.tokens[color].find(
      (t) => t.status === 'YARD' && gameState.validMoves.includes(t.id)
    );

    if (movableYardToken) {
      onSelectToken(movableYardToken.id);
    }
  };

  // Render Yard Box (6x6)
  const renderYardBox = (color: PlayerColor, colClass: string, rowClass: string) => {
    const theme = YARD_THEMES[color];
    const tokens = gameState.tokens[color];
    const isCurrentTurn = color === currentTurnColor;

    const hasMovableYardToken =
      isCurrentTurn &&
      gameState.hasRolled &&
      tokens.some((t) => t.status === 'YARD' && gameState.validMoves.includes(t.id));

    return (
      <motion.div
        type="button"
        onClick={() => handleYardClick(color)}
        animate={
          hasMovableYardToken
            ? {
                scale: [1, 1.02, 1],
                boxShadow: [
                  '0 0 15px rgba(255,255,255,0.4)',
                  '0 0 35px rgba(255,255,255,0.95)',
                  '0 0 15px rgba(255,255,255,0.4)',
                ],
              }
            : {}
        }
        transition={hasMovableYardToken ? { repeat: Infinity, duration: 0.8 } : {}}
        className={`${colClass} ${rowClass} relative bg-gradient-to-br ${theme.bg} p-2 sm:p-4 border-2 border-white/40 flex flex-col items-center justify-center select-none overflow-hidden ${
          hasMovableYardToken ? 'cursor-pointer z-30 ring-4 ring-amber-300' : ''
        }`}
      >
        {/* Inner Slot Container */}
        <div className="w-full h-full bg-slate-950/85 backdrop-blur-md rounded-2xl border-2 border-white/20 p-2 grid grid-cols-2 grid-rows-2 gap-2 place-items-center shadow-inner relative">
          {[0, 1, 2, 3].map((tokenId) => {
            const token = tokens[tokenId];
            const key = `${color}-${tokenId}`;
            const stepVal = animatedSteps[key] ?? token.stepCount;
            const isInYard = stepVal === -1;
            const isMovable =
              isCurrentTurn && gameState.hasRolled && isInYard && gameState.validMoves.includes(tokenId);

            return (
              <div
                key={`${color}-yard-slot-${tokenId}`}
                className={`relative w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-slate-900/90 border-2 border-white/20 flex items-center justify-center shadow-inner ${
                  isMovable ? 'ring-2 ring-amber-300 animate-pulse' : ''
                }`}
              >
                {isInYard ? (
                  <LudoPawn
                    color={color}
                    tokenId={tokenId}
                    isMovable={isMovable}
                    onClick={() => handleTokenClick(color, tokenId)}
                  />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-slate-800 opacity-20" />
                )}
              </div>
            );
          })}
        </div>

        {/* Yard Banner */}
        <div className="absolute bottom-1 flex items-center gap-1.5">
          <span className="text-[10px] sm:text-xs font-black tracking-widest text-white drop-shadow">
            {theme.title}
          </span>
          {hasMovableYardToken && (
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black animate-bounce shadow-lg">
              OPEN YARD 🔓
            </span>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="relative w-full max-w-[620px] aspect-square p-2 sm:p-3.5 rounded-3xl bg-slate-950/90 border border-white/20 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex items-center justify-center select-none overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-rose-600/15 via-emerald-600/15 to-blue-600/15 pointer-events-none rounded-3xl" />

      {/* 15x15 Grid Layout */}
      <div className="relative w-full h-full grid grid-cols-15 grid-rows-15 border-2 border-white/40 rounded-2xl overflow-hidden bg-slate-900 shadow-inner">
        {/* ===================== YARD BOXES ===================== */}
        {renderYardBox('red', 'col-span-6', 'row-span-6')}
        {renderYardBox('green', 'col-start-10 col-span-6', 'row-span-6')}
        {renderYardBox('yellow', 'col-start-10 col-span-6', 'row-start-10 row-span-6')}
        {renderYardBox('blue', 'col-span-6', 'row-start-10 row-span-6')}

        {/* ===================== CENTER HOME ===================== */}
        <div className="col-start-7 col-span-3 row-start-7 row-span-3 relative bg-slate-950 border-2 border-white/50 overflow-hidden flex items-center justify-center z-10 shadow-2xl">
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            <div className="bg-rose-600/90 [clip-path:polygon(0_0,100%_100%,0_100%)] border-r border-b border-white/30" />
            <div className="bg-emerald-600/90 [clip-path:polygon(0_0,100%_0,0_100%)] border-l border-b border-white/30" />
            <div className="bg-cyan-600/90 [clip-path:polygon(0_0,100%_100%,100%_0)] border-r border-t border-white/30" />
            <div className="bg-amber-500/90 [clip-path:polygon(100%_0,100%_100%,0_100%)] border-l border-t border-white/30" />
          </div>

          <div className="relative z-10 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-950/90 border-2 border-amber-300 flex items-center justify-center shadow-2xl">
            <span className="text-sm sm:text-base animate-pulse">🏆</span>
          </div>
        </div>

        {/* ===================== TRACK CELLS & HOME STRETCHES ===================== */}
        {Array.from({ length: 15 }).map((_, r) =>
          Array.from({ length: 15 }).map((_, c) => {
            if (r < 6 && c < 6) return null;
            if (r < 6 && c > 8) return null;
            if (r > 8 && c > 8) return null;
            if (r > 8 && c < 6) return null;
            if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return null;

            let cellBg = 'bg-slate-900/90 hover:bg-slate-800/90';
            let cellIcon = '';

            // Red Start: [6, 1]
            if (r === 6 && c === 1) {
              cellBg = 'bg-rose-500/90 font-bold';
              cellIcon = '⭐';
            }
            // Green Start: [1, 8]
            else if (r === 1 && c === 8) {
              cellBg = 'bg-emerald-500/90 font-bold';
              cellIcon = '⭐';
            }
            // Yellow Start: [8, 13]
            else if (r === 8 && c === 13) {
              cellBg = 'bg-amber-500/90 font-bold';
              cellIcon = '⭐';
            }
            // Blue Start: [13, 6]
            else if (r === 13 && c === 6) {
              cellBg = 'bg-cyan-500/90 font-bold';
              cellIcon = '⭐';
            }
            // Other Safe Stars
            else if ((r === 2 && c === 6) || (r === 6 && c === 12) || (r === 12 && c === 8) || (r === 8 && c === 2)) {
              cellBg = 'bg-slate-800/95';
              cellIcon = '⭐';
            }
            // Home Stretches
            else if (r === 7 && c >= 1 && c <= 5) cellBg = 'bg-rose-600/80';
            else if (c === 7 && r >= 1 && r <= 5) cellBg = 'bg-emerald-600/80';
            else if (r === 7 && c >= 9 && c <= 13) cellBg = 'bg-amber-500/80';
            else if (c === 7 && r >= 9 && r <= 13) cellBg = 'bg-cyan-600/80';

            return (
              <div
                key={`cell-${r}-${c}`}
                style={{ gridRowStart: r + 1, gridColumnStart: c + 1 }}
                className={`relative border border-white/10 flex items-center justify-center ${cellBg} transition-colors`}
              >
                {cellIcon && <span className="text-[10px] sm:text-xs text-amber-300 drop-shadow">{cellIcon}</span>}
              </div>
            );
          })
        )}

        {/* ===================== RENDER ANIMATED ON-TRACK TOKENS ===================== */}
        <AnimatePresence>
          {PLAYERS_ORDER.flatMap((color) =>
            gameState.tokens[color].map((token) => {
              const key = `${color}-${token.id}`;
              const stepVal = animatedSteps[key] ?? token.stepCount;

              if (stepVal === -1) return null; // Yard tokens rendered inside Yard slots

              const mockToken: TokenState = {
                ...token,
                stepCount: stepVal,
                status: stepVal >= 56 ? 'FINISHED' : stepVal > 50 ? 'HOME_STRETCH' : 'MAIN',
              };

              const [r, c] = getTokenCoordinate(mockToken);
              const gridKey = `${r.toFixed(1)},${c.toFixed(1)}`;
              const stackedList = trackGridMap.get(gridKey) || [];
              const stackIndex = stackedList.findIndex((item) => item.color === color && item.token.id === token.id);
              const isStackMultiple = stackedList.length > 1;

              const offsetX = isStackMultiple ? (stackIndex % 2) * 8 - 4 : 0;
              const offsetY = isStackMultiple ? Math.floor(stackIndex / 2) * 8 - 4 : 0;

              const isMovable =
                color === currentTurnColor &&
                gameState.hasRolled &&
                gameState.validMoves.includes(token.id);

              return (
                <motion.div
                  key={`token-track-${color}-${token.id}`}
                  style={{
                    gridRowStart: 1,
                    gridColumnStart: 1,
                  }}
                  animate={{
                    x: `${c * 100}%`,
                    y: `${r * 100}%`,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 380,
                    damping: 24,
                  }}
                  className="absolute inset-0 w-[6.666%] h-[6.666%] p-0.5 flex items-center justify-center z-20 pointer-events-none"
                >
                  <div
                    style={{
                      transform: `translate(${offsetX}px, ${offsetY}px)`,
                    }}
                    className="relative w-full h-full flex items-center justify-center"
                  >
                    <LudoPawn
                      color={color}
                      tokenId={token.id}
                      isMovable={isMovable}
                      badgeCount={isStackMultiple && stackIndex === 0 ? stackedList.length : undefined}
                      onClick={() => handleTokenClick(color, token.id)}
                    />
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
