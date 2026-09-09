"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

interface MttrItem {
  project?: string;
  hour?: string;
  avg_resolution_minutes?: number;
  mttr_minutes?: number;
}

interface MttrChartProps {
  data?: MttrItem[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0B0E14]/80 backdrop-blur-md border border-emerald-500/30 p-3 rounded-xl shadow-lg shadow-emerald-500/10">
        <p className="text-[#8A94A6] text-xs font-mono mb-1">{label}</p>
        <p className="text-emerald-400 font-bold text-sm">
          {payload[0].value} <span className="text-[#8A94A6] text-xs font-normal">minutes MTTR</span>
        </p>
      </div>
    );
  }
  return null;
};

export const MttrChart: React.FC<MttrChartProps> = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-[#0B0E14]/50 border border-[#1F293D] rounded-xl p-8 text-center text-[#8A94A6] font-mono text-sm shadow-inner">
        No MTTR resolution trends available yet.
      </div>
    );
  }

  const formattedData = data.map((item, idx) => ({
    hour: item.hour ? item.hour.substring(11, 16) : `H${idx}`,
    avg_resolution_minutes: Number((item.avg_resolution_minutes ?? item.mttr_minutes ?? 0).toFixed(1)),
  }));

  return (
    <div className="bg-[#0B0E14]/40 backdrop-blur-sm border border-[#1F293D] rounded-xl p-5 shadow-xl space-y-2 transition-all hover:border-[#1F293D]">
      <div className="h-64 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMttr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.4} />
            <XAxis 
              dataKey="hour" 
              stroke="#64748b" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false} 
              dy={10}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              unit="m"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#334155', opacity: 0.2 }} />
            <Bar
              dataKey="avg_resolution_minutes"
              radius={[6, 6, 0, 0]}
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
            >
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="url(#colorMttr)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MttrChart;
