'use client';

import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

export interface GrowthChartProps {
  data?: { month: string; tenants: number }[];
}

export function GrowthChart({ data }: GrowthChartProps) {
  // BƯỚC 4: Self-Audit & Testing - Defensive validation: Handle empty, null, or invalid data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-surface/30 rounded-xl border border-border/50">
        <div className="text-center">
          <svg className="w-10 h-10 text-inkSoft mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
          </svg>
          <p className="text-inkSoft text-sm">No growth data available yet.</p>
        </div>
      </div>
    );
  }

  // BƯỚC 1/4: Sanitize data (Ép kiểu an toàn, mặc định về 0 nếu dính lỗi type mismatch)
  const safeData = data.map(item => ({
    month: item.month || 'Unknown',
    tenants: typeof item.tenants === 'number' ? item.tenants : Number(item.tenants) || 0
  }));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      className="w-full h-full min-h-[300px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={safeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTenants" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#94a3b8' }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#94a3b8' }} 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(15, 23, 42, 0.95)', 
              borderRadius: '12px', 
              border: '1px solid rgba(255,255,255,0.1)', 
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              color: '#f8fafc',
              backdropFilter: 'blur(8px)'
            }}
            formatter={(value: any) => [Number(value), 'Tenants']}
            itemStyle={{ color: '#34d399', fontWeight: 600 }}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar 
            dataKey="tenants" 
            fill="url(#colorTenants)" 
            radius={[4, 4, 0, 0]} 
            barSize={24}
          />
          <Line 
            type="monotone" 
            dataKey="tenants" 
            stroke="#10b981" 
            strokeWidth={1.5}
            dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2, className: "shadow-[0_0_8px_#10b981]" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
