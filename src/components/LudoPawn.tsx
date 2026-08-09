import React from 'react';
import { motion } from 'motion/react';
import { PlayerColor } from '../types';

interface LudoPawnProps {
  color: PlayerColor;
  isMovable?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  tokenId?: number;
  badgeCount?: number;
}

const PAWN_THEMES: Record<
  PlayerColor,
  {
    gradient: string;
    headGradient: string;
    border: string;
    glow: string;
    symbol: string;
    teamName: string;
    accent: string;
    ringColor: string;
  }
> = {
  red: {
    gradient: 'from-rose-500 via-red-600 to-red-900',
    headGradient: 'from-rose-200 via-red-400 to-rose-700',
    border: 'border-rose-300',
    glow: 'shadow-[0_0_20px_rgba(244,63,94,0.9)]',
    symbol: '👒',
    teamName: 'LUFFY TEAM',
    accent: 'bg-rose-500',
    ringColor: 'rgba(244,63,94,0.8)',
  },
  green: {
    gradient: 'from-emerald-400 via-emerald-600 to-teal-900',
    headGradient: 'from-emerald-200 via-emerald-400 to-teal-700',
    border: 'border-emerald-300',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.9)]',
    symbol: '⚔️',
    teamName: 'ZORO TEAM',
    accent: 'bg-emerald-500',
    ringColor: 'rgba(16,185,129,0.8)',
  },
  yellow: {
    gradient: 'from-amber-300 via-yellow-500 to-amber-900',
    headGradient: 'from-amber-100 via-yellow-300 to-amber-600',
    border: 'border-amber-200',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.9)]',
    symbol: '🚬',
    teamName: 'SANJI TEAM',
    accent: 'bg-amber-400',
    ringColor: 'rgba(245,158,11,0.8)',
  },
  blue: {
    gradient: 'from-cyan-300 via-blue-600 to-indigo-900',
    headGradient: 'from-cyan-100 via-blue-400 to-indigo-700',
    border: 'border-cyan-300',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.9)]',
    symbol: '☀️',
    teamName: 'JIMBEI TEAM',
    accent: 'bg-cyan-400',
    ringColor: 'rgba(6,182,212,0.8)',
  },
};

export const LudoPawn: React.FC<LudoPawnProps> = ({
  color,
  isMovable = false,
  onClick,
  size = 'md',
  tokenId,
  badgeCount,
}) => {
  const theme = PAWN_THEMES[color];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!isMovable && !onClick}
      whileHover={isMovable ? { scale: 1.28, zIndex: 50 } : {}}
      whileTap={isMovable ? { scale: 0.92 } : {}}
      animate={
        isMovable
          ? {
              y: [0, -8, 0],
              scale: [1, 1.15, 1],
            }
          : {}
      }
      transition={
        isMovable
          ? {
              y: { repeat: Infinity, duration: 0.5, ease: 'easeInOut' },
              scale: { repeat: Infinity, duration: 1.0, ease: 'easeInOut' },
            }
          : {}
      }
      className={`relative group flex items-center justify-center select-none ${
        isMovable ? 'cursor-pointer z-40 pointer-events-auto' : 'cursor-default pointer-events-none'
      }`}
    >
      {/* Pulsing Target Ring when Movable */}
      {isMovable && (
        <>
          <motion.div
            animate={{
              scale: [1, 1.9, 1],
              opacity: [0.9, 0.1, 0.9],
            }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className={`absolute inset-0 rounded-full bg-gradient-to-r ${theme.gradient} blur-md opacity-80 -z-10`}
          />
          <span className="absolute -top-4 text-[11px] font-black animate-bounce text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] z-50">
            👇
          </span>
        </>
      )}

      {/* Glossy 3D Pawn SVG Graphic */}
      <div className={`relative flex items-center justify-center drop-shadow-2xl ${theme.glow}`}>
        <svg
          viewBox="0 0 60 75"
          className="w-full h-full max-w-[40px] max-h-[50px] filter drop-shadow-[0_6px_8px_rgba(0,0,0,0.8)] overflow-visible"
        >
          <defs>
            {/* Glossy Head Radial Gradient */}
            <radialGradient id={`pawnHead-${color}`} cx="30%" cy="25%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop
                offset="45%"
                stopColor={
                  color === 'yellow'
                    ? '#f59e0b'
                    : color === 'red'
                    ? '#f43f5e'
                    : color === 'green'
                    ? '#10b981'
                    : '#06b6d4'
                }
              />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
            </radialGradient>

            {/* Glossy Body Linear Gradient */}
            <linearGradient id={`pawnBody-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                stopColor={
                  color === 'yellow'
                    ? '#fde047'
                    : color === 'red'
                    ? '#fb7185'
                    : color === 'green'
                    ? '#34d399'
                    : '#38bdf8'
                }
              />
              <stop
                offset="50%"
                stopColor={
                  color === 'yellow'
                    ? '#d97706'
                    : color === 'red'
                    ? '#e11d48'
                    : color === 'green'
                    ? '#059669'
                    : '#0284c7'
                }
              />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
          </defs>

          {/* Oval Drop Shadow on Base */}
          <ellipse cx="30" cy="70" rx="23" ry="5" fill="#000000" opacity="0.6" />

          {/* Flared Base Base Plate */}
          <path
            d="M 8 66 Q 30 73 52 66 L 45 52 Q 30 57 15 52 Z"
            fill={`url(#pawnBody-${color})`}
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />

          {/* Metallic Mid Ring */}
          <ellipse
            cx="30"
            cy="52"
            rx="15"
            ry="4.5"
            fill={`url(#pawnBody-${color})`}
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeOpacity="0.8"
          />

          {/* Waist Cone Body */}
          <path
            d="M 15 52 C 19 38, 22 28, 24 23 L 36 23 C 38 28, 41 38, 45 52 Z"
            fill={`url(#pawnBody-${color})`}
          />

          {/* Collar Gold Ring */}
          <ellipse
            cx="30"
            cy="23"
            rx="8.5"
            ry="2.8"
            fill="#fef08a"
            stroke="#ffffff"
            strokeWidth="1"
          />

          {/* 3D Glossy Spherical Head */}
          <circle
            cx="30"
            cy="14"
            r="12.5"
            fill={`url(#pawnHead-${color})`}
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeOpacity="0.85"
          />

          {/* Specular Light Curved Reflection Arc */}
          <path
            d="M 23 8 A 8 8 0 0 1 33 7"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.9"
          />

          {/* ================= ONE PIECE CHARACTER VISUAL OVERLAYS ================= */}

          {/* RED TEAM: LUFFY'S STRAWHAT */}
          {color === 'red' && (
            <g id="luffy-strawhat">
              {/* Strawhat Brim */}
              <ellipse cx="30" cy="7.5" rx="20" ry="4.5" fill="#facc15" stroke="#78350f" strokeWidth="1.2" />
              <ellipse cx="30" cy="8.2" rx="19" ry="3.8" fill="#eab308" />

              {/* Strawhat Dome Crown */}
              <path
                d="M 18 7.5 C 18 -2, 42 -2, 42 7.5 Z"
                fill="#fde047"
                stroke="#78350f"
                strokeWidth="1.2"
              />

              {/* Luffy's Iconic Red Ribbon Band */}
              <path
                d="M 18.2 7 C 22 8.5, 38 8.5, 41.8 7 L 42 5 C 38 6.5, 22 6.5, 18 5 Z"
                fill="#dc2626"
              />
            </g>
          )}

          {/* GREEN TEAM: ZORO'S 3 SWORDS (SANTORYU) */}
          {color === 'green' && (
            <g id="zoro-three-swords">
              {/* Sword 1: Top-Left to Bottom-Right Katana */}
              <line x1="6" y1="24" x2="54" y2="58" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="6" y1="24" x2="54" y2="58" stroke="#f8fafc" strokeWidth="1" strokeLinecap="round" />
              <ellipse cx="14" cy="30" rx="3" ry="2" fill="#f59e0b" transform="rotate(35 14 30)" />
              <line x1="6" y1="24" x2="12" y2="28.5" stroke="#7e22ce" strokeWidth="4" strokeLinecap="round" />

              {/* Sword 2: Top-Right to Bottom-Left Katana */}
              <line x1="54" y1="24" x2="6" y2="58" stroke="#047857" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="54" y1="24" x2="6" y2="58" stroke="#f8fafc" strokeWidth="1" strokeLinecap="round" />
              <ellipse cx="46" cy="30" rx="3" ry="2" fill="#f59e0b" transform="rotate(-35 46 30)" />
              <line x1="54" y1="24" x2="48" y2="28.5" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />

              {/* Sword 3: Horizontal Katana Held in Mouth */}
              <line x1="2" y1="16" x2="58" y2="16" stroke="#e2e8f0" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="12" y1="16" x2="56" y2="16" stroke="#38bdf8" strokeWidth="0.8" strokeLinecap="round" />
              <ellipse cx="44" cy="16" rx="2" ry="3.5" fill="#f59e0b" />
              <line x1="45" y1="16" x2="57" y2="16" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            </g>
          )}

          {/* YELLOW TEAM: SANJI'S CIGARETTE & SMOKE */}
          {color === 'yellow' && (
            <g id="sanji-cigarette">
              {/* Sanji's Curly Eyebrow Accent */}
              <path
                d="M 33 10 Q 25 7 26 12 Q 28 14 31 12"
                fill="none"
                stroke="#b45309"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              {/* Lit Cigarette Sticking Out from Mouth */}
              <line x1="28" y1="18" x2="23" y2="19.5" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="23" y1="19.5" x2="10" y2="23.5" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="9" cy="23.8" r="2" fill="#ef4444" />
              <circle cx="9" cy="23.8" r="1" fill="#fef08a" />

              {/* Animated Smoke Wisps Floating Up */}
              <path
                d="M 8 22 Q 4 16 8 10 Q 12 5 7 0"
                stroke="#ffffff"
                strokeWidth="1.2"
                fill="none"
                opacity="0.85"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {/* BLUE TEAM: JIMBEI'S SUN PIRATES TATTOO MARK */}
          {color === 'blue' && (
            <g id="jimbei-sun-mark">
              {/* Sun Pirates Flame Rays Around Center (30, 38) */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                const rad = (angle * Math.PI) / 180;
                const x1 = 30 + Math.cos(rad) * 4.5;
                const y1 = 38 + Math.sin(rad) * 4.5;
                const x2 = 30 + Math.cos(rad) * 11;
                const y2 = 38 + Math.sin(rad) * 11;
                const cx = 30 + Math.cos(rad + 0.35) * 8;
                const cy = 38 + Math.sin(rad + 0.35) * 8;
                return (
                  <path
                    key={`sun-ray-${angle}`}
                    d={`M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`}
                    stroke="#ef4444"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    fill="none"
                  />
                );
              })}

              {/* Central Red Sun Disc */}
              <circle cx="30" cy="38" r="4.8" fill="#dc2626" stroke="#7f1d1d" strokeWidth="0.8" />
              <circle cx="30" cy="38" r="2.5" fill="#ef4444" />
            </g>
          )}

          {/* Symbol Badge on Body */}
          <text
            x="30"
            y={color === 'blue' ? '49' : '43'}
            fontSize="9"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#ffffff"
            style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.9)' }}
          >
            {theme.symbol}
          </text>
        </svg>

        {/* Token Number Badge */}
        {tokenId !== undefined && (
          <span className="absolute -bottom-1 text-[8px] sm:text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-950/95 text-white border border-amber-300 shadow-md">
            #{tokenId + 1}
          </span>
        )}

        {/* Stack Counter Badge for Multiple Pawns */}
        {badgeCount && badgeCount > 1 && (
          <span className="absolute -top-1 -right-1 text-[9px] font-black w-4.5 h-4.5 rounded-full bg-amber-400 text-slate-950 border-2 border-slate-900 shadow-xl flex items-center justify-center animate-bounce">
            {badgeCount}
          </span>
        )}
      </div>
    </motion.button>
  );
};
