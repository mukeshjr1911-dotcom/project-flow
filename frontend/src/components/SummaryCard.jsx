import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export default function SummaryCard({
  icon: Icon,
  iconBg = 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  title,
  value,
  badgeText,
  badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  isOverdue = false,
}) {
  return (
    <div className="bg-[#121724] border border-[#1F293D] rounded-2xl p-5 hover:border-[#2E3C57] transition-all duration-200 shadow-lg">
      <div className="flex items-center space-x-4">
        {/* Icon box */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className="w-6 h-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-white tracking-tight">
              {value}
            </span>
            {badgeText && (
              <span className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-md border ${badgeColor}`}>
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                {badgeText}
              </span>
            )}
          </div>
          <p className={`text-xs font-medium mt-0.5 truncate ${isOverdue ? 'text-red-400 font-semibold' : 'text-gray-400'}`}>
            {title}
          </p>
        </div>
      </div>
    </div>
  );
}
