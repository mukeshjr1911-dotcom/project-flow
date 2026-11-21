import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Calendar,
  BarChart3,
  Settings,
  Crown,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Projects', path: '/projects', icon: FolderKanban },
  { name: 'Tasks', path: '/tasks', icon: CheckSquare },
  { name: 'Team', path: '/team', icon: Users },
  { name: 'Calendar', path: '/calendar', icon: Calendar },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'PF';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0E131F] border-r border-[#1F293D] flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo & Close for Mobile */}
        <div>
          <div className="flex items-center justify-between px-6 py-6 border-b border-[#1F293D]/60">
            <div className="flex items-center space-x-3">
              {/* Violet Flow Icon matching screenshot */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6D28D9] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-purple-600/30">
                <svg
                  className="w-6 h-6 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m4 12 5 5L20 7" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-white font-sans">
                ProjectFlow
              </span>
            </div>
            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="px-4 py-6 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    `flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#7C3AED] text-white shadow-lg shadow-purple-700/30'
                        : 'text-gray-400 hover:text-gray-100 hover:bg-[#161F30]'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Upgrade to Pro & User Profile */}
        <div className="p-4 space-y-4">
          {/* Upgrade to Pro Card (Disabled Placeholder per instructions) */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#181F30] to-[#111723] border border-[#232F46] p-4 text-center">
            <div className="w-9 h-9 mx-auto mb-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Crown className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white mb-0.5">Upgrade to Pro</h4>
            <p className="text-xs text-gray-400 mb-3">Unlock more features</p>
            <button
              disabled
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-[#7C3AED]/40 text-purple-300 cursor-not-allowed border border-purple-500/30 flex items-center justify-center space-x-1"
            >
              <span>Go Pro</span>
              <span>→</span>
            </button>
          </div>

          {/* User Card with Avatar, Name, Designation & Logout */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#131A29] border border-[#1F293D]">
            <div className="flex items-center space-x-3 overflow-hidden">
              {user?.profile_image ? (
                <img
                  src={user.profile_image}
                  alt={user.full_name}
                  className="w-10 h-10 rounded-full object-cover border border-purple-500/40"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 text-white font-bold text-sm flex items-center justify-center border border-purple-400/30 shrink-0">
                  {getInitials(user?.full_name)}
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">
                  {user?.full_name || 'Mukesh Kumar V'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user?.designation || user?.role_name || 'Student'}
                </p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Logout"
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
