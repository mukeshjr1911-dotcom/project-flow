import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export default function ProjectChart({ data = [], period = 7, onPeriodChange }) {
  const periods = [
    { label: '7D', value: 7 },
    { label: '30D', value: 30 },
    { label: '90D', value: 90 },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#182133] border border-[#2E3C57] p-2.5 rounded-xl shadow-xl">
          <p className="text-xs font-semibold text-gray-300">{label}</p>
          <p className="text-sm font-extrabold text-purple-400 mt-1">
            {payload[0].value}% Completion
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#121724] border border-[#1F293D] rounded-2xl p-5 shadow-lg">
      {/* Header with 7D / 30D / 90D toggles matching screenshot */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-bold text-white tracking-tight">
          Project Overview
        </h3>

        <div className="flex items-center space-x-1 bg-[#0E131F] p-1 rounded-xl border border-[#1F293D]">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => onPeriodChange && onPeriodChange(p.value)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                period === p.value
                  ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-600/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recharts Area / Line Chart matching screenshot */}
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              stroke="#475569"
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              axisLine={{ stroke: '#1F293D' }}
              tickLine={false}
            />
            <YAxis
              stroke="#475569"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(val) => `${val}%`}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="progress"
              stroke="#8B5CF6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#purpleGradient)"
              dot={{ stroke: '#8B5CF6', strokeWidth: 2, r: 4, fill: '#0E131F' }}
              activeDot={{ stroke: '#A78BFA', strokeWidth: 3, r: 6, fill: '#7C3AED' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
