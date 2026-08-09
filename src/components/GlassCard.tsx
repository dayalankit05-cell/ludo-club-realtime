import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'red' | 'green' | 'yellow' | 'blue' | 'neutral';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glowColor = 'neutral',
}) => {
  const glowStyles = {
    red: 'border-red-500/30 shadow-[0_8px_32px_0_rgba(239,68,68,0.25)]',
    green: 'border-emerald-500/30 shadow-[0_8px_32px_0_rgba(16,185,129,0.25)]',
    yellow: 'border-amber-500/30 shadow-[0_8px_32px_0_rgba(245,158,11,0.25)]',
    blue: 'border-cyan-500/30 shadow-[0_8px_32px_0_rgba(6,182,212,0.25)]',
    neutral: 'border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)]',
  };

  return (
    <div
      className={`backdrop-blur-xl bg-slate-900/60 border rounded-2xl transition-all duration-300 ${glowStyles[glowColor]} ${className}`}
    >
      {children}
    </div>
  );
};
