'use client';

export interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { bg: string, text: string, dot: string, border: string }> = {
  // Order Statuses
  'CREATED': { bg: 'bg-cobalt/10', text: 'text-cobalt', dot: 'bg-cobalt', border: 'border-cobalt/20' },
  'IN_TRANSIT': { bg: 'bg-accent/10', text: 'text-accent', dot: 'bg-accent', border: 'border-accent/20' },
  'DELIVERED': { bg: 'bg-moss/10', text: 'text-moss', dot: 'bg-moss', border: 'border-moss/20' },
  'FAILED': { bg: 'bg-ember/10', text: 'text-ember', dot: 'bg-ember', border: 'border-ember/20' },
  // Inventory Statuses
  'AVAILABLE': { bg: 'bg-moss/10', text: 'text-moss', dot: 'bg-moss', border: 'border-moss/20' },
  'LOW_STOCK': { bg: 'bg-ember/10 animate-pulse', text: 'text-ember font-bold', dot: 'bg-ember shadow-[0_0_12px_#ef4444]', border: 'border-ember/40' },
  // Trip Statuses
  'PLANNING': { bg: 'bg-surface/50', text: 'text-inkSoft', dot: 'bg-inkSoft', border: 'border-border' },
  'DISPATCHED': { bg: 'bg-cobalt/10', text: 'text-cobalt', dot: 'bg-cobalt', border: 'border-cobalt/20' },
  'IN_PROGRESS': { bg: 'bg-accent/10', text: 'text-accent font-semibold', dot: 'bg-accent shadow-[0_0_10px_rgba(16,185,129,0.6)]', border: 'border-accent/30' },
  'COMPLETED': { bg: 'bg-moss/10', text: 'text-moss', dot: 'bg-moss', border: 'border-moss/20' },
  // Tenant Statuses
  'ACTIVE': { bg: 'bg-moss/10', text: 'text-moss', dot: 'bg-moss', border: 'border-moss/20' },
  'PENDING': { bg: 'bg-cobalt/10', text: 'text-cobalt', dot: 'bg-cobalt', border: 'border-cobalt/20' },
  'SUSPENDED': { bg: 'bg-ember/10 animate-pulse', text: 'text-ember font-bold', dot: 'bg-ember shadow-[0_0_10px_#ef4444]', border: 'border-ember/40' },
  // General Fallback
  'DEFAULT': { bg: 'bg-surface/50', text: 'text-inkSoft', dot: 'bg-inkSoft', border: 'border-border' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status.toUpperCase().replace(/\s+/g, '_');
  const config = statusConfig[normalizedStatus] || statusConfig['DEFAULT'];
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${config.bg} ${config.border} backdrop-blur-sm`}>
      <div className={`w-1.5 h-1.5 rounded-full ${config.dot} shadow-[0_0_8px_currentColor]`}></div>
      <span className={`text-[11px] font-semibold tracking-wider ${config.text}`}>
        {status.replace(/_/g, ' ')}
      </span>
    </div>
  );
}
