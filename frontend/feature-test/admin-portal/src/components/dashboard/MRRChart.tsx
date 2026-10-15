'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export interface MRRChartProps {
  data?: { month: string; amount: number }[];
}

export function MRRChart({ data }: MRRChartProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center text-center">
        <p className="text-sm text-slate-500">No MRR data available yet.</p>
      </div>
    );
  }

  const safeData = data.map(item => ({
    month: item.month || 'Unknown',
    amount: typeof item.amount === 'number' ? item.amount : Number(item.amount) || 0
  }));

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={safeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="1 1" vertical={false} stroke="#e2e8f0" />
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
            tickFormatter={(value) => `$${Number(value) > 0 ? (Number(value)/1000).toFixed(1) : 0}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              color: '#1e293b',
            }}
            formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'MRR']}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#2563eb"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorMrr)"
            activeDot={{ r: 4, strokeWidth: 0, fill: '#2563eb' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
