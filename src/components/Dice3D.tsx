import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound } from '../lib/audio';
import { PlayerColor } from '../types';

interface Dice3DProps {
  value: number | null;
  isMyTurn: boolean;
  hasRolled: boolean;
  onRoll: () => void;
  color?: PlayerColor;
  disabled?: boolean;
}

const COLOR_STYLES: Record<
  PlayerColor,
  {
    bg: string;
    border: string;
    glow: string;
    badge: string;
    dotBg: string;
    accentText: string;
  }
> = {
  red: {
    bg: 'from-rose-500 via-red-600 to-red-950',
    border: 'border-rose-400',
    glow: 'shadow-[0_0_30px_rgba(244,63,94,0.9)]',
    badge: 'bg-rose-500 text-white',
    dotBg: 'bg-slate-950',
    accentText: 'text-rose-400',
  },
  green: {
    bg: 'from-emerald-400 via-emerald-600 to-teal-950',
    border: 'border-emerald-300',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.9)]',
    badge: 'bg-emerald-500 text-white',
    dotBg: 'bg-slate-950',
    accentText: 'text-emerald-400',
  },
  yellow: {
    bg: 'from-amber-300 via-yellow-500 to-amber-950',
    border: 'border-amber-200',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.9)]',
    badge: 'bg-amber-400 text-slate-950 font-black',
    dotBg: 'bg-slate-950',
    accentText: 'text-amber-300',
  },
  blue: {
    bg: 'from-cyan-400 via-blue-600 to-indigo-950',
    border: 'border-cyan-300',
    glow: 'shadow-[0_0_30px_rgba(6,182,212,0.9)]',
    badge: 'bg-cyan-400 text-slate-950 font-black',
    dotBg: 'bg-slate-950',
    accentText: 'text-cyan-300',
  },
};

export const Dice3D: React.FC<Dice3DProps> = ({
  value,
  isMyTurn,
  hasRolled,
  onRoll,
  color = 'red',
  disabled = false,
}) => {
  const [isShuffling, setIsShuffling] = useState(false);
  const [displayValue, setDisplayValue] = useState<number>(value || 1);
  const shuffleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const style = COLOR_STYLES[color] || COLOR_STYLES.red;
  const canRoll = isMyTurn && !hasRolled && !disabled && !isShuffling;

  // Sync display value when state value changes externally
  useEffect(() => {
    if (!isShuffling && value) {
      setDisplayValue(value);
    }
  }, [value, isShuffling]);

  const triggerRoll = () => {
    if (!canRoll) return;

    setIsShuffling(true);

    let ticks = 0;
    const maxTicks = 16; // ~600ms total fast shuffle duration

    if (shuffleTimerRef.current) clearInterval(shuffleTimerRef.current);

    shuffleTimerRef.current = setInterval(() => {
      ticks++;
      // Pick random number 1..6 different from current display
      const nextNum = Math.floor(Math.random() * 6) + 1;
      setDisplayValue(nextNum);
      playSound.tick();

      if (ticks >= maxTicks) {
        if (shuffleTimerRef.current) clearInterval(shuffleTimerRef.current);
        onRoll();
        setIsShuffling(false);
        playSound.roll();
      }
    }, 38);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (shuffleTimerRef.current) clearInterval(shuffleTimerRef.current);
    };
  }, []);

  // Helper to render the dots corresponding to displayValue (1..6)
  const renderDiceDots = (num: number) => {
    const dotPositions: Record<number, string[]> = {
      1: ['col-start-2 row-start-2'],
      2: ['col-start-1 row-start-1', 'col-start-3 row-start-3'],
      3: ['col-start-1 row-start-1', 'col-start-2 row-start-2', 'col-start-3 row-start-3'],
      4: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
      5: [
        'col-start-1 row-start-1',
        'col-start-3 row-start-1',
        'col-start-2 row-start-2',
        'col-start-1 row-start-3',
        'col-start-3 row-start-3',
      ],
      6: [
        'col-start-1 row-start-1',
        'col-start-3 row-start-1',
        'col-start-1 row-start-2',
        'col-start-3 row-start-2',
        'col-start-1 row-start-3',
        'col-start-3 row-start-3',
      ],
    };

    const dots = dotPositions[num] || dotPositions[1];

    return (
      <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-full h-full p-2.5 place-items-center">
        {dots.map((pos, i) => (
          <motion.div
            key={`${num}-dot-${i}`}
            initial={{ scale: 0.5, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.05 }}
            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full ${style.dotBg} shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] border border-white/40 ${pos}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {/* Rapid Shuffling High-Tech Dice Container */}
      <div className="relative flex items-center justify-center p-1">
        {/* Pulsing Aura Light when trainable or rolling */}
        <AnimatePresence>
          {(canRoll || isShuffling) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: [0.6, 1, 0.6],
                scale: isShuffling ? [1, 1.3, 1] : [1, 1.15, 1],
              }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: isShuffling ? 0.3 : 1 }}
              className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${style.bg} blur-xl opacity-90 -z-10`}
            />
          )}
        </AnimatePresence>

        {/* Dice Body Button */}
        <motion.button
          type="button"
          onClick={triggerRoll}
          disabled={!canRoll}
          animate={
            isShuffling
              ? {
                  scale: [1, 1.18, 0.95, 1.1, 1],
                  rotate: [0, -8, 8, -5, 0],
                }
              : canRoll
              ? {
                  scale: [1, 1.06, 1],
                  y: [0, -3, 0],
                }
              : {}
          }
          transition={
            isShuffling
              ? { duration: 0.2, repeat: Infinity }
              : canRoll
              ? { duration: 1.1, repeat: Infinity }
              : {}
          }
          whileHover={canRoll ? { scale: 1.15 } : {}}
          whileTap={canRoll ? { scale: 0.9 } : {}}
          className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${style.bg} border-2 ${
            style.border
          } ${style.glow} shadow-2xl flex flex-col items-center justify-center overflow-hidden transition-all ${
            canRoll ? 'cursor-pointer pointer-events-auto' : 'cursor-not-allowed'
          }`}
        >
          {/* Subtle Inner Reflection Gloss */}
          <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />

          {/* Rapid Dot Grid */}
          <div className="w-full h-full relative z-10 flex items-center justify-center">
            {renderDiceDots(displayValue)}
          </div>

          {/* Big Number Corner Badge */}
          <div
            className={`absolute bottom-1 right-1 px-1.5 py-0.2 rounded-md ${style.badge} text-[11px] font-black tracking-tighter shadow-md z-20 border border-white/40`}
          >
            {displayValue}
          </div>
        </motion.button>
      </div>

      {/* Button Action / Roll Text */}
      {canRoll ? (
        <motion.button
          type="button"
          onClick={triggerRoll}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 0.9 }}
          className="px-3.5 py-1 rounded-full bg-slate-900 border-2 border-amber-400 text-amber-300 text-xs font-black tracking-wider shadow-xl flex items-center gap-1.5 cursor-pointer hover:bg-slate-800"
        >
          <span className="text-sm">🎲</span>
          <span>TAP TO ROLL</span>
        </motion.button>
      ) : isShuffling ? (
        <span className="text-xs font-black tracking-widest text-amber-300 animate-pulse flex items-center gap-1">
          <span>⚡</span> SHUFFLING...
        </span>
      ) : value ? (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-white/20 text-xs font-bold text-slate-200 shadow">
          <span className="text-slate-400">ROLLED:</span>
          <span className={`text-sm font-black ${style.accentText}`}>
            {value} {value === 6 ? '🎉 (EXTRA TURN!)' : ''}
          </span>
        </div>
      ) : (
        <span className="text-[11px] font-bold text-slate-400">WAITING FOR TURN...</span>
      )}
    </div>
  );
};
