'use client';

interface Activity {
  id: string | number;
  type: string;
  title?: string;
  message?: string;
  time?: string;
  desc?: string;
}

const typeStyles = {
  success: { bg: 'bg-moss/20', text: 'text-moss', border: 'border-moss/30', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.3)]' },
  warning: { bg: 'bg-accent/20', text: 'text-accent', border: 'border-accent/30', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.3)]' },
  error: { bg: 'bg-ember/20', text: 'text-ember', border: 'border-ember/30', glow: 'shadow-[0_0_10px_rgba(239,68,68,0.3)]' },
  info: { bg: 'bg-primary/20', text: 'text-primary', border: 'border-primary/30', glow: 'shadow-[0_0_10px_rgba(59,130,246,0.3)]' },
};

export function ActivityFeed({ activities }: { activities?: Activity[] }) {
  return (
    <div className="glass-panel p-6 h-[400px] flex flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-ink">Recent Alerts</h3>
        <p className="text-sm text-inkSoft">Real-time system events</p>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {activities && activities.length > 0 ? (
          activities.map((activity) => {
            const style = typeStyles[activity.type as keyof typeof typeStyles] || typeStyles.info;
            return (
              <div key={activity.id} className="relative pl-6 pb-4 border-l border-border/50 last:border-transparent last:pb-0">
                <div className={`absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full ${style.bg} ${style.border} border ${style.glow}`}></div>
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-semibold text-ink">{activity.title || activity.message}</h4>
                  <span className="text-xs font-medium text-inkSoft whitespace-nowrap ml-2">{activity.time}</span>
                </div>
                <p className="text-sm text-inkSoft/80 leading-snug">{activity.desc || ''}</p>
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center h-full text-inkSoft text-sm">
            No activities yet.
          </div>
        )}
      </div>
    </div>
  );
}
