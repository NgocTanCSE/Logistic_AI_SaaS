'use client';
import { memo } from 'react';

export interface StatCardProps {
  title: string;
  value: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon: React.ReactNode;
}

export const StatCard = memo(function StatCard({ title, value, trend, icon }: StatCardProps) {
  return (
    <div className="glass-panel p-6 flex flex-col relative overflow-hidden group hover:border-primary/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all duration-300">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-500"></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <h3 className="text-sm font-medium text-inkSoft uppercase tracking-wider">{title}</h3>
        <div className="p-2 rounded-xl bg-surface/50 border border-border/50 text-primary">
          {icon}
        </div>
      </div>
      
      <div className="flex items-end gap-3 relative z-10">
        <div className="text-3xl font-bold text-ink tracking-tight">{value}</div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium mb-1 ${trend.isPositive ? 'text-moss' : 'text-ember'}`}>
            <svg 
              className={`w-4 h-4 ${trend.isPositive ? '' : 'rotate-180'}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>{trend.value}</span>
          </div>
        )}
      </div>
    </div>
  );
});
