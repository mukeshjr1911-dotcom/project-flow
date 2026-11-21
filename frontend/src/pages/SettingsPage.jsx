import React, { useState, useEffect } from 'react';
import { User, Lock, Sliders, Check, AlertCircle } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'password', 'preferences'

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    designation: '',
    profile_image: '',
  });
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [profileLoading, setProfileLoading] = useState(false);

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Preferences Form State
  const [prefForm, setPrefForm] = useState({
    email_notifications: true,
    reminder_hours: 24,
    default_period_days: 7,
  });
  const [prefMsg, setPrefMsg] = useState({ type: '', text: '' });
  const [prefLoading, setPrefLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        email: user.email || '',
        designation: user.designation || '',
        profile_image: user.profile_image || '',
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await client.get('/settings/preferences');
        setPrefForm({
          email_notifications: res.data.email_notifications ?? true,
          reminder_hours: res.data.reminder_hours ?? 24,
          default_period_days: res.data.default_period_days ?? 7,
        });
      } catch (e) {}
    };
    fetchPrefs();
  }, []);

  // 1. Profile Update (FR-60)
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const res = await client.put('/settings/profile', profileForm);
      updateUser(res.data);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: err.response?.data?.email || err.response?.data?.detail || 'Failed to update profile.',
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // 2. Change Password (FR-61)
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPasswordLoading(true);
    try {
      await client.put('/settings/password', {
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      });
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      const errorMsg =
        err.response?.data?.old_password ||
        err.response?.data?.new_password ||
        err.response?.data?.detail ||
        'Failed to change password.';
      setPasswordMsg({ type: 'error', text: Array.isArray(errorMsg) ? errorMsg[0] : errorMsg });
    } finally {
      setPasswordLoading(false);
    }
  };

  // 3. Preferences Update (FR-62)
  const handlePrefSubmit = async (e) => {
    e.preventDefault();
    setPrefLoading(true);
    setPrefMsg({ type: '', text: '' });
    try {
      await client.put('/settings/preferences', prefForm);
      setPrefMsg({ type: 'success', text: 'Preferences saved.' });
    } catch (err) {
      setPrefMsg({ type: 'error', text: 'Failed to save preferences.' });
    } finally {
      setPrefLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Settings
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Manage your account profile, credentials, and system preferences.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#1F293D] pb-3">
        {[
          { id: 'profile', label: 'Profile Details', icon: User },
          { id: 'password', label: 'Change Password', icon: Lock },
          { id: 'preferences', label: 'Preferences', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-[#161F30]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-[#121724] border border-[#1F293D] rounded-3xl p-7 shadow-xl">
        {/* Profile Details Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="space-y-5 max-w-xl">
            {profileMsg.text && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}
              >
                {profileMsg.type === 'success' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Designation / Job Title
              </label>
              <input
                type="text"
                value={profileForm.designation}
                onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                placeholder="e.g. Student / Lead Engineer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Profile Picture URL
              </label>
              <input
                type="text"
                value={profileForm.profile_image}
                onChange={(e) => setProfileForm({ ...profileForm, profile_image: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                placeholder="https://..."
              />
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
            >
              {profileLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        )}

        {/* Change Password Tab (FR-61) */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-xl">
            {passwordMsg.text && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}
              >
                {passwordMsg.type === 'success' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Current Password *
              </label>
              <input
                type="password"
                required
                value={passwordForm.old_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                New Password *
              </label>
              <input
                type="password"
                required
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Policy: minimum 8 characters with uppercase, lowercase, digit, and special character.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        {/* Preferences Tab (FR-62) */}
        {activeTab === 'preferences' && (
          <form onSubmit={handlePrefSubmit} className="space-y-6 max-w-xl">
            {prefMsg.text && (
              <div className="p-3.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-2">
                <Check className="w-4 h-4" />
                <span>{prefMsg.text}</span>
              </div>
            )}

            {/* Theme Toggle */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1C2538]">
              <div>
                <h4 className="text-sm font-bold text-white">Interface Theme</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Current theme is {theme === 'dark' ? 'Dark Mode (default)' : 'Light Mode'}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="px-4 py-2 rounded-xl bg-[#182133] border border-[#2B3852] text-xs font-bold text-purple-300 hover:border-purple-500 transition-colors"
              >
                Switch to {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
              </button>
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1C2538]">
              <div>
                <h4 className="text-sm font-bold text-white">Email Notifications</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Receive task assignments and deadline alert emails (console email in dev).
                </p>
              </div>
              <input
                type="checkbox"
                checked={prefForm.email_notifications}
                onChange={(e) =>
                  setPrefForm({ ...prefForm, email_notifications: e.target.checked })
                }
                className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
              />
            </div>

            {/* Reminder Hours */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Upcoming Deadline Reminder Window (Hours)
              </label>
              <input
                type="number"
                min="1"
                max="72"
                value={prefForm.reminder_hours}
                onChange={(e) =>
                  setPrefForm({ ...prefForm, reminder_hours: parseInt(e.target.value) || 24 })
                }
                className="w-full px-4 py-2.5 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              />
              <p className="text-[11px] text-gray-500 mt-1">Default is 24 hours.</p>
            </div>

            {/* Default Dashboard Period */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Default Dashboard Chart Period (Days)
              </label>
              <select
                value={prefForm.default_period_days}
                onChange={(e) =>
                  setPrefForm({ ...prefForm, default_period_days: parseInt(e.target.value) || 7 })
                }
                className="w-full px-3 py-2.5 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              >
                <option value={7}>7 Days</option>
                <option value={30}>30 Days</option>
                <option value={90}>90 Days</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={prefLoading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
            >
              {prefLoading ? 'Saving...' : 'Save Preferences'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
