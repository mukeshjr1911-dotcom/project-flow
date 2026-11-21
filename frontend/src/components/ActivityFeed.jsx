import React from 'react';
import { CheckCircle2, PlusCircle, UserPlus, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const getActivityStyle = (action) => {
  const lower = (action || '').toLowerCase();
  if (lower.includes('completed')) {
    return {
      icon: CheckCircle2,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    };
  }
  if (lower.includes('new project') || lower.includes('created')) {
    return {
      icon: PlusCircle,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    };
  }
  if (lower.includes('joined') || lower.includes('member') || lower.includes('assigned')) {
    return {
      icon: UserPlus,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    };
  }
  return {
    icon: Activity,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  };
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const past = new Date(dateStr);
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  return `${diffDays}d ago`;
};

export default function ActivityFeed({ activities = [] }) {
  return (
    <div className="bg-[#121724] border border-[#1F293D] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white tracking-tight">
            Activity Feed
          </h3>
          <Link
            to="/projects"
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors flex items-center space-x-1"
          >
            <span>View All</span>
            <span>→</span>
          </Link>
        </div>

        {/* Activity list matching screenshot */}
        <div className="space-y-3.5">
          {activities.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">No recent activities.</p>
          ) : (
            activities.slice(0, 5).map((act) => {
              const { icon: Icon, color } = getActivityStyle(act.action);
              return (
                <div
                  key={act.activity_id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-[#182133] transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-medium text-gray-200 truncate">
                      {act.action}
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-gray-500 shrink-0">
                    {formatTimeAgo(act.created_at)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
