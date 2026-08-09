import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameState, PlayerColor } from '../types';
import { playSound } from '../lib/audio';
import { Award, RotateCcw, Trophy } from 'lucide-react';

interface VictoryModalProps {
  gameState: GameState;
  onRestartGame: () => void;
}

const COLOR_NAMES: Record<PlayerColor, string> = {
  red: 'Red',
  green: 'Green',
  yellow: 'Yellow',
  blue: 'Blue',
};

const COLOR_CLASSES: Record<PlayerColor, string> = {
  red: 'bg-red-500/30 border-red-500 text-red-300',
  green: 'bg-emerald-500/30 border-emerald-500 text-emerald-300',
  yellow: 'bg-amber-500/30 border-amber-500 text-amber-200',
  blue: 'bg-cyan-500/30 border-cyan-500 text-cyan-300',
};

export const VictoryModal: React.FC<VictoryModalProps> = ({
  gameState,
  onRestartGame,
}) => {
  useEffect(() => {
    playSound.win();

    // Trigger confetti bursts
    const count = 200;
    const defaults = { origin: { y: 0.7 } };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  const winner = gameState.winners[0];
  const winnerPlayer = winner ? gameState.players[winner] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border-2 border-amber-300/60 shadow-[0_0_50px_rgba(245,158,11,0.5)] flex flex-col items-center text-center gap-5 animate-scaleUp">
        {/* Trophy Icon */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 p-1 shadow-[0_0_30px_rgba(245,158,11,0.8)] flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
            <Trophy className="w-10 h-10 text-amber-300 animate-bounce" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-black text-white">MATCH FINISHED!</h2>
          <p className="text-sm font-bold text-amber-300 mt-1">
            🎉 Champion: {winnerPlayer ? winnerPlayer.name : COLOR_NAMES[winner]}!
          </p>
        </div>

        {/* Podium Rank List */}
        <div className="w-full flex flex-col gap-2">
          {gameState.winners.map((color, idx) => {
            const player = gameState.players[color];
            return (
              <div
                key={color}
                className={`p-3 rounded-2xl border flex items-center justify-between font-bold ${COLOR_CLASSES[color]}`}
              >
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-300" />
                  <span className="text-xs uppercase">
                    #{idx + 1} Place: {player ? player.name : COLOR_NAMES[color]}
                  </span>
                </div>
                <span className="text-xs font-mono">FINISH</span>
              </div>
            );
          })}
        </div>

        {/* Restart Action */}
        <button
          type="button"
          onClick={onRestartGame}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <RotateCcw className="w-5 h-5" /> PLAY AGAIN
        </button>
      </div>
    </div>
  );
};
