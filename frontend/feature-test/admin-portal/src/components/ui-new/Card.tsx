import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
}

export const Card = ({ children, className = '', glass = false }: CardProps) => {
  const baseClass = glass
    ? 'bg-white border border-slate-200'
    : 'bg-white border border-slate-200';

  return (
    <div className={`
      ${baseClass}
      rounded-xl shadow-card overflow-hidden
      ${className}
    `}>
      {children}
    </div>
  );
};
