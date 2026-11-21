import React from 'react';
import { Laptop, Code2, BarChart2, FolderKanban, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const getProjectIcon = (name) => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('quiz') || lower.includes('online')) {
    return {
      icon: Laptop,
      bg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    };
  }
  if (lower.includes('college') || lower.includes('portal') || lower.includes('web')) {
    return {
      icon: Code2,
      bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    };
  }
  if (lower.includes('analytics') || lower.includes('dashboard')) {
    return {
      icon: BarChart2,
      bg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    };
  }
  return {
    icon: FolderKanban,
    bg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  };
};

export default function ProjectCard({ project, onEdit, onDelete }) {
  const navigate = useNavigate();
  const { icon: Icon, bg } = getProjectIcon(project.project_name);
  const progress = parseFloat(project.progress_percent || 0);

  const isAtRisk = project.status === 'At Risk';
  const isCompleted = project.status === 'Completed';

  const statusColor = isAtRisk
    ? 'text-amber-400'
    : isCompleted
    ? 'text-blue-400'
    : 'text-emerald-400';

  const progressBg = isAtRisk
    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
    : 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6]';

  return (
    <div
      onClick={() => navigate(`/projects/${project.project_id}`)}
      className="group bg-[#121724] border border-[#1F293D] rounded-2xl p-5 hover:border-[#334155] transition-all duration-200 cursor-pointer shadow-lg flex flex-col justify-between"
    >
      <div>
        {/* Top: Icon & 3-dots */}
        <div className="flex items-center justify-between mb-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bg}`}>
            <Icon className="w-5 h-5" />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) onEdit(project);
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E293B] opacity-80 group-hover:opacity-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">
          {project.project_name}
        </h3>
        <p className="text-xs text-gray-400 line-clamp-2 mb-4 leading-relaxed">
          {project.description || 'No description provided.'}
        </p>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-gray-400">Progress</span>
            <span className="text-gray-200">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#1B2333] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressBg}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom: Members & Status Tag */}
      <div className="flex items-center justify-between pt-2 border-t border-[#1C2538]">
        {/* Member Avatars */}
        <div className="flex items-center -space-x-2">
          {project.members_summary?.slice(0, 3).map((m, idx) => (
            <div
              key={idx}
              title={m.full_name}
              className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-800 to-indigo-700 text-[10px] font-bold text-white flex items-center justify-center border-2 border-[#121724]"
            >
              {m.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase()}
            </div>
          ))}
          {project.members_count > 3 && (
            <div className="w-7 h-7 rounded-full bg-[#1E293B] text-[10px] font-bold text-gray-300 flex items-center justify-center border-2 border-[#121724]">
              +{project.members_count - 3}
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex items-center space-x-1.5">
          <span className={`w-2 h-2 rounded-full ${isAtRisk ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          <span className={`text-xs font-medium ${statusColor}`}>
            {project.status}
          </span>
        </div>
      </div>
    </div>
  );
}
