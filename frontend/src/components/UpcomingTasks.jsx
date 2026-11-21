import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UpcomingTasks({ tasks = [], onToggleTask }) {
  const formatDue = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffDays = Math.round((targetDay - today) / (1000 * 60 * 60 * 24));
    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (diffDays === 0) return `Today • ${timeStr}`;
    if (diffDays === 1) return `Tomorrow • ${timeStr}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} • ${timeStr}`;
  };

  return (
    <div className="bg-[#121724] border border-[#1F293D] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white tracking-tight">
            Upcoming Tasks
          </h3>
          <Link
            to="/tasks"
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors flex items-center space-x-1"
          >
            <span>View All</span>
            <span>→</span>
          </Link>
        </div>

        {/* Task list */}
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">No upcoming tasks.</p>
          ) : (
            tasks.map((task) => {
              const isCompleted = task.status === 'Completed';
              return (
                <div
                  key={task.task_id}
                  className="flex items-start space-x-3 p-2.5 rounded-xl hover:bg-[#182133] transition-colors group cursor-pointer"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleTask) onToggleTask(task);
                    }}
                    className="mt-0.5 text-gray-500 hover:text-purple-400 shrink-0 transition-colors"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-purple-500 fill-purple-500/20" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-500 group-hover:text-purple-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-semibold truncate ${
                        isCompleted
                          ? 'line-through text-gray-500'
                          : 'text-gray-200 group-hover:text-white'
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
                      {formatDue(task.due_date)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
