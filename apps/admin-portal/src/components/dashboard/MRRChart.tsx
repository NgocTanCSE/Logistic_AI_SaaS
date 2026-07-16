'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

export interface MRRChartProps {
  data?: { month: string; amount: number }[];
}

export function MRRChart({ data }: MRRChartProps) {
  // BƯỚC 4: Self-Audit & Testing - Defensive validation: Handle empty, null, or invalid data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-surface/30 rounded-xl border border-border/50">
        <div className="text-center">
          <svg className="w-10 h-10 text-inkSoft mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-inkSoft text-sm">No MRR data available yet.</p>
        </div>
      </div>
    );
  }

  // BƯỚC 1/4: Sanitize data (Ép kiểu an toàn)
  const safeData = data.map(item => ({
    month: item.month || 'Unknown',
    amount: typeof item.amount === 'number' ? item.amount : Number(item.amount) || 0
  }));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full h-full min-h-[300px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={safeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
            tickFormatter={(value) => `$${value > 0 ? (value/1000).toFixed(1) : 0}k`} 
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
            formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'MRR']}
            itemStyle={{ color: '#60a5fa', fontWeight: 600 }}
          />
          <Area 
            type="monotone" 
            dataKey="amount" 
            stroke="#3b82f6" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorMrr)" 
            activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6', className: "shadow-[0_0_12px_#3b82f6]" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
