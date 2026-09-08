"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface CrashRateItem {
  project?: string;
  service?: string;
  hour?: string;
  total_crashes?: number;
  crash_count?: number;
}

interface CrashRateChartProps {
  data?: CrashRateItem[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-md border border-amber-500/30 p-3 rounded-xl shadow-lg shadow-amber-500/10">
        <p className="text-slate-300 text-xs font-mono mb-1">{label}</p>
        <p className="text-amber-400 font-bold text-sm">
          {payload[0].value} <span className="text-slate-400 text-xs font-normal">Crashes</span>
        </p>
      </div>
    );
  }
  return null;
};

export const CrashRateChart: React.FC<CrashRateChartProps> = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-400 font-mono text-sm shadow-inner">
        No crash rate data recorded for this time window.
      </div>
    );
  }

  const formattedData = data.map((item, idx) => ({
    hour: item.hour ? item.hour.substring(11, 16) : `H${idx}`,
    crash_count: item.total_crashes ?? item.crash_count ?? 0,
    service: item.service || item.project || "encoder-worker",
  }));

  return (
    <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800 rounded-xl p-5 shadow-xl space-y-2 transition-all hover:border-slate-700">
      <div className="h-64 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCrash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
              allowDecimals={false} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area
              type="monotone"
              dataKey="crash_count"
              stroke="#fbbf24"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorCrash)"
              activeDot={{ r: 6, fill: "#fbbf24", stroke: "#0f172a", strokeWidth: 2 }}
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CrashRateChart;
