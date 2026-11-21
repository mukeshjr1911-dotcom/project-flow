import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Moon, Sun, Menu, CheckCircle2, Clock, FolderKanban, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import client from '../api/client';

export default function Topbar({ onMenuClick }) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await client.get('/notifications/');
      setNotifications(res.data.results || res.data || []);
      const countRes = await client.get('/notifications/unread_count/');
      setUnreadCount(countRes.data.unread_count || 0);
    } catch (e) {
      // Ignore background fetch error
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await client.get(`/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data);
        setSearchOpen(true);
      } catch (err) {
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      await client.patch(`/notifications/${id}/mark_read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {}
  };

  const markAllAsRead = async () => {
    try {
      await client.post('/notifications/mark-all-read/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {}
  };

  return (
    <header className="sticky top-0 z-30 h-20 bg-[#0B0F19]/90 backdrop-blur-md border-b border-[#1F293D]/70 px-6 flex items-center justify-between">
      {/* Left: Mobile Menu Toggle & Search Bar */}
      <div className="flex items-center space-x-4 flex-1 max-w-xl">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#161F30]"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Global Search Input matching screenshot */}
        <div ref={searchRef} className="relative w-full">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search projects, tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults) setSearchOpen(true);
              }}
              className="w-full pl-11 pr-4 py-2.5 rounded-full bg-[#131A29] border border-[#232F46] text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            />
          </div>

          {/* Search Results Dropdown */}
          {searchOpen && searchResults && (
            <div className="absolute left-0 right-0 mt-2 bg-[#121724] border border-[#232F46] rounded-2xl shadow-2xl p-4 max-h-96 overflow-y-auto z-50">
              {isSearching ? (
                <p className="text-xs text-gray-400 text-center py-2">Searching...</p>
              ) : (
                <>
                  {/* Projects section */}
                  {searchResults.projects?.length > 0 && (
                    <div className="mb-4">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">
                        Projects
                      </span>
                      <div className="mt-2 space-y-1">
                        {searchResults.projects.map((p) => (
                          <div
                            key={p.project_id}
                            onClick={() => {
                              navigate(`/projects/${p.project_id}`);
                              setSearchOpen(false);
                            }}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-[#1C2538] cursor-pointer"
                          >
                            <div className="flex items-center space-x-2.5">
                              <FolderKanban className="w-4 h-4 text-purple-400" />
                              <span className="text-sm font-medium text-white">
                                {p.project_name}
                              </span>
                            </div>
                            <span className="text-xs text-purple-400 font-semibold">
                              {p.progress_percent}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tasks section */}
                  {searchResults.tasks?.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">
                        Tasks
                      </span>
                      <div className="mt-2 space-y-1">
                        {searchResults.tasks.map((t) => (
                          <div
                            key={t.task_id}
                            onClick={() => {
                              navigate(`/tasks?highlight=${t.task_id}`);
                              setSearchOpen(false);
                            }}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-[#1C2538] cursor-pointer"
                          >
                            <div className="flex items-center space-x-2.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span className="text-sm font-medium text-white">
                                {t.title}
                              </span>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                              {t.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.projects?.length === 0 && searchResults.tasks?.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">
                      No matching projects or tasks found.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Notification Bell & Theme Toggle */}
      <div className="flex items-center space-x-3">
        {/* Notification Bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2.5 rounded-xl bg-[#131A29] border border-[#232F46] text-gray-300 hover:text-white hover:border-purple-500 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-purple-500 rounded-full ring-2 ring-[#0B0F19] animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown Modal */}
          {notifOpen && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#121724] border border-[#232F46] rounded-2xl shadow-2xl p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F293D]">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-purple-400 hover:text-purple-300 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="mt-3 max-h-80 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">
                    No notifications yet.
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.notification_id}
                      onClick={() => !n.is_read && markAsRead(n.notification_id)}
                      className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                        n.is_read
                          ? 'bg-[#0E131F]/50 border-transparent text-gray-400'
                          : 'bg-[#182133] border-purple-500/30 text-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-xs font-semibold leading-relaxed">
                          {n.message}
                        </p>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-purple-400 ml-2 shrink-0 mt-1" />
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 block">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className="p-2.5 rounded-xl bg-[#131A29] border border-[#232F46] text-gray-300 hover:text-white hover:border-purple-500 transition-colors"
        >
          {theme === 'dark' ? (
            <Moon className="w-5 h-5 text-purple-400" />
          ) : (
            <Sun className="w-5 h-5 text-amber-400" />
          )}
        </button>
      </div>
    </header>
  );
}
