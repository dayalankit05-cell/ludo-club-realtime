import React from 'react';
import { motion } from 'motion/react';
import { GameState, PlayerColor } from '../types';
import { Dice3D } from './Dice3D';
import { Bot, User, WifiOff } from 'lucide-react';

interface PlayerCardProps {
  color: PlayerColor;
  gameState: GameState;
  myColor: PlayerColor | null;
  onRollDice: () => void;
  onToggleBot?: () => void;
}

const COLOR_NAMES: Record<PlayerColor, string> = {
  red: 'Luffy Team 👒',
  green: 'Zoro Team ⚔️',
  yellow: 'Sanji Team 🚬',
  blue: 'Jimbei Team ☀️',
};

const COLOR_BG: Record<PlayerColor, string> = {
  red: 'bg-red-950/40 border-red-500/40 text-red-300',
  green: 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300',
  yellow: 'bg-amber-950/40 border-amber-500/40 text-amber-300',
  blue: 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300',
};

const COLOR_GLOW: Record<PlayerColor, string> = {
  red: 'shadow-[0_0_20px_rgba(239,68,68,0.4)] border-red-400',
  green: 'shadow-[0_0_20px_rgba(16,185,129,0.4)] border-emerald-400',
  yellow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)] border-amber-300',
  blue: 'shadow-[0_0_20px_rgba(6,182,212,0.4)] border-cyan-400',
};

export const PlayerCard: React.FC<PlayerCardProps> = ({
  color,
  gameState,
  myColor,
  onRollDice,
  onToggleBot,
}) => {
  const player = gameState.players[color];
  const isTurn = gameState.turnOrder[gameState.currentTurnIndex] === color;
  const isMyTurn = isTurn && (myColor === color || (!myColor && !player?.isBot));

  const tokens = gameState.tokens[color];
  const homeCount = tokens.filter((t) => t.status === 'FINISHED' || t.stepCount >= 56).length;

  return (
    <motion.div
      animate={isTurn ? { scale: [1, 1.02, 1] } : {}}
      transition={isTurn ? { repeat: Infinity, duration: 2 } : {}}
      className={`relative p-3 rounded-2xl border backdrop-blur-xl transition-all duration-300 flex flex-col justify-between ${
        COLOR_BG[color]
      } ${isTurn ? COLOR_GLOW[color] : 'border-white/10 opacity-90'}`}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
              color === 'red'
                ? 'bg-red-500 text-white'
                : color === 'green'
                ? 'bg-emerald-500 text-white'
                : color === 'yellow'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-cyan-500 text-white'
            }`}
          >
            {player?.isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
          </div>

          <div className="flex flex-col truncate">
            <span className="text-xs font-bold truncate text-white">
              {player ? player.name : `Empty (${COLOR_NAMES[color]})`}
            </span>
            <span className="text-[10px] text-white/60">
              {player ? (player.isBot ? 'AI Bot' : player.isConnected ? 'Connected' : 'Offline') : 'No Player'}
            </span>
          </div>
        </div>

        {/* Toggle Bot Button if host/lobby */}
        {gameState.status === 'LOBBY' && onToggleBot && (
          <button
            type="button"
            onClick={onToggleBot}
            className="px-2 py-1 text-[10px] rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors flex items-center gap-1"
          >
            {player?.isBot ? 'Human' : 'Add Bot'}
          </button>
        )}
      </div>

      {/* Game Playing Stats */}
      {gameState.status === 'PLAYING' && (
        <div className="mt-2 flex items-center justify-between pt-2 border-t border-white/10">
          {/* Tokens Home Indicator */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-wider text-white/70">Home:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full border ${
                    i <= homeCount ? 'bg-amber-300 border-amber-200 shadow' : 'bg-white/10 border-white/20'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Dice Component if it's player's turn */}
          {isTurn && (
            <Dice3D
              value={gameState.diceValue}
              isMyTurn={isMyTurn}
              hasRolled={gameState.hasRolled}
              onRoll={onRollDice}
              color={color}
              disabled={gameState.players[color]?.isBot}
            />
          )}
        </div>
      )}
    </motion.div>
  );
};
