import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
}

export const Card = ({ children, className = '', glass = true }: CardProps) => {
  return (
    <div className={`
      ${glass ? 'bg-white/10 backdrop-blur-xl border-white/10' : 'bg-zinc-900 border-zinc-800'}
      rounded-3xl border shadow-2xl overflow-hidden
      ${className}
    `}>
      {children}
    </div>
  );
};
