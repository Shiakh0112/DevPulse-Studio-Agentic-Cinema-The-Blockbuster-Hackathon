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

interface ErrorTypeItem {
  project?: string;
  error_type?: string;
  total_occurrences?: number;
  occurrence_count?: number;
}

interface ErrorTypeChartProps {
  data?: ErrorTypeItem[];
}

// Premium vivid neon color palette
const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#10b981", "#3b82f6", "#f59e0b"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const color = payload[0].payload.fill || COLORS[0];
    return (
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-3 rounded-xl shadow-lg" style={{ borderColor: `${color}40`, boxShadow: `0 4px 20px ${color}20` }}>
        <p className="text-slate-300 text-xs font-mono mb-1">{label}</p>
        <p className="font-bold text-sm" style={{ color }}>
          {payload[0].value} <span className="text-slate-400 text-xs font-normal">Occurrences</span>
        </p>
      </div>
    );
  }
  return null;
};

export const ErrorTypeChart: React.FC<ErrorTypeChartProps> = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-400 font-mono text-sm shadow-inner">
        No error category distribution captured.
      </div>
    );
  }

  const formattedData = data.map((item, idx) => ({
    error_type: item.error_type || "UNKNOWN_ERROR",
    occurrence_count: item.total_occurrences ?? item.occurrence_count ?? 0,
    fill: COLORS[idx % COLORS.length]
  }));

  return (
    <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800 rounded-xl p-5 shadow-xl space-y-2 transition-all hover:border-slate-700">
      <div className="h-64 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={formattedData}
            margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} horizontal={false} />
            <XAxis 
              type="number" 
              stroke="#64748b" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false} 
              allowDecimals={false} 
            />
            <YAxis
              type="category"
              dataKey="error_type"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#334155', opacity: 0.2 }} />
            <Bar 
              dataKey="occurrence_count" 
              radius={[0, 6, 6, 0] as any}
              background={{ fill: '#334155', opacity: 0.3, radius: [0, 6, 6, 0] as any }}
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
            >
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ErrorTypeChart;
