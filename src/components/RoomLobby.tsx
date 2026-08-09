import React, { useState } from 'react';
import { GlassCard } from './GlassCard';
import { GameState, PlayerColor } from '../types';
import { Bot, Check, Copy, Dices, Play, Share2, UserPlus, Users } from 'lucide-react';

interface RoomLobbyProps {
  gameState: GameState | null;
  myColor: PlayerColor | null;
  onCreateRoom: (playerName: string, color: PlayerColor) => void;
  onJoinRoom: (roomId: string, playerName: string, color: PlayerColor) => void;
  onStartGame: () => void;
  onToggleBot: (color: PlayerColor) => void;
  errorMsg: string | null;
}

const COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

const COLOR_CONFIG: Record<PlayerColor, { name: string; bg: string; text: string; border: string }> = {
  red: { name: 'Red', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' },
  green: { name: 'Green', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  yellow: { name: 'Yellow', bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40' },
  blue: { name: 'Blue', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/40' },
};

export const RoomLobby: React.FC<RoomLobbyProps> = ({
  gameState,
  myColor,
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onToggleBot,
  errorMsg,
}) => {
  const [playerName, setPlayerName] = useState('Player 1');
  const [inputRoomId, setInputRoomId] = useState('');
  const [selectedColor, setSelectedColor] = useState<PlayerColor>('red');
  const [copied, setCopied] = useState(false);

  // Check URL query params for initial room code
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        setInputRoomId(roomParam.toUpperCase());
      }
    }
  }, []);

  const handleCopyLink = () => {
    if (!gameState) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${gameState.roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isHost = gameState?.players[myColor || 'red']?.isHost ?? false;

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col items-center gap-6">
      {/* Title Header */}
      <div className="text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-red-500 via-amber-400 to-cyan-500 p-0.5 shadow-[0_0_30px_rgba(245,158,11,0.5)] mb-3 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
            <Dices className="w-9 h-9 text-amber-300 animate-pulse" />
          </div>
        </div>
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-cyan-400 tracking-wider">
          LUDO CLUB
        </h1>
        <p className="text-xs text-white/70 mt-1 font-medium">
          Modern Real-Time 4-Player Multiplayer Game
        </p>
      </div>

      {errorMsg && (
        <div className="w-full p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs text-center font-medium animate-bounce">
          {errorMsg}
        </div>
      )}

      {/* Lobby State vs Create/Join State */}
      {gameState ? (
        <GlassCard className="w-full p-6 flex flex-col gap-5">
          {/* Room Code Display */}
          <div className="flex flex-col items-center p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-xs uppercase tracking-widest text-amber-300 font-bold">
              ROOM CODE
            </span>
            <span className="text-4xl font-black text-white tracking-widest my-1">
              {gameState.roomId}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="mt-2 px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Link Copied!' : 'Share Room Link'}
            </button>
          </div>

          {/* Player Slots */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60">
              Player Slots (4 Players)
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {COLORS.map((color) => {
                const player = gameState.players[color];
                const cfg = COLOR_CONFIG[color];

                return (
                  <div
                    key={color}
                    className={`p-3 rounded-xl border flex flex-col justify-between ${cfg.bg} ${cfg.border}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black uppercase ${cfg.text}`}>
                        {cfg.name}
                      </span>
                      {player?.isBot ? (
                        <Bot className="w-4 h-4 text-white/60" />
                      ) : (
                        <Users className="w-4 h-4 text-white/60" />
                      )}
                    </div>

                    <span className="text-sm font-bold text-white truncate my-1">
                      {player ? player.name : 'Empty Slot'}
                    </span>

                    {/* Bot Toggle Button */}
                    <button
                      type="button"
                      onClick={() => onToggleBot(color)}
                      className="mt-1 py-1 px-2 text-[10px] font-semibold rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"
                    >
                      {player ? (player.isBot ? 'Remove Bot' : 'Occupied') : 'Add AI Bot'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Button */}
          {isHost ? (
            <button
              type="button"
              onClick={onStartGame}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-base shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-transform active:scale-98"
            >
              <Play className="w-5 h-5 fill-current" /> START MATCH NOW
            </button>
          ) : (
            <div className="text-center text-xs text-amber-200/80 font-medium py-2 animate-pulse">
              Waiting for Host to start the match...
            </div>
          )}
        </GlassCard>
      ) : (
        /* Create or Join Room Form */
        <GlassCard className="w-full p-6 flex flex-col gap-5">
          {/* Player Name Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-white/70">
              Your Player Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-amber-400 font-semibold"
            />
          </div>

          {/* Preferred Color Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-white/70">
              Choose Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map((color) => {
                const cfg = COLOR_CONFIG[color];
                const isSel = selectedColor === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`py-2 rounded-xl border font-bold text-xs capitalize transition-all ${
                      cfg.bg
                    } ${cfg.text} ${isSel ? 'border-amber-300 ring-2 ring-amber-300/50 scale-105' : 'border-white/10 opacity-70'}`}
                  >
                    {cfg.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Buttons: Create or Join */}
          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={() => onCreateRoom(playerName, selectedColor)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 hover:opacity-90 text-slate-950 font-black text-base shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-transform active:scale-98"
            >
              <UserPlus className="w-5 h-5" /> CREATE NEW ROOM
            </button>

            <div className="relative my-1 text-center">
              <span className="px-3 bg-slate-900 text-xs font-bold text-white/40">OR JOIN EXISTING ROOM</span>
              <div className="absolute inset-0 top-1/2 -z-10 border-t border-white/10" />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
                placeholder="ROOM CODE..."
                className="flex-1 px-4 py-3 rounded-xl bg-slate-950/60 border border-white/20 text-white tracking-widest uppercase font-mono font-bold placeholder-white/40 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => onJoinRoom(inputRoomId, playerName, selectedColor)}
                disabled={!inputRoomId.trim()}
                className="px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm disabled:opacity-50 transition-colors"
              >
                JOIN
              </button>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
