'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

export interface GrowthChartProps {
  data?: { month: string; tenants: number }[];
}

export function GrowthChart({ data }: GrowthChartProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center text-center">
        <p className="text-sm text-slate-500">No tenant growth data available yet.</p>
      </div>
    );
  }

  const safeData = data.map(item => ({
    month: item.month || 'Unknown',
    tenants: typeof item.tenants === 'number' ? item.tenants : Number(item.tenants) || 0
  }));

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={safeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              color: '#1e293b',
            }}
            formatter={(value: any) => [Number(value), 'Tenants']}
          />
          <Bar dataKey="tenants" radius={[4, 4, 0, 0]} fill="#0d9488">
            {safeData.map((_, i) => <Cell key={`cell-${i}`} fill={i % 2 === 0 ? '#0d9488' : '#2563eb'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
