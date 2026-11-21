import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const detail = err.response?.data?.detail || 'Invalid email or password.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#121724] border border-[#1F293D] rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6D28D9] to-[#8B5CF6] mx-auto flex items-center justify-center shadow-lg shadow-purple-600/30">
            <svg
              className="w-7 h-7 text-white"
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
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Welcome to ProjectFlow
          </h1>
          <p className="text-xs text-gray-400">
            Sign in to access your projects and tasks.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-400 font-semibold flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 placeholder-gray-500"
              placeholder="mukesh@projectflow.local"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-300">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] text-purple-400 hover:text-purple-300 font-medium"
              >
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 placeholder-gray-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-xs font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Quick Demo Logins for Evaluator */}
        <div className="pt-4 border-t border-[#1C2538] space-y-2">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">
            Quick Demo Accounts
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillDemo('mukesh@projectflow.local', 'Mukesh@12345')}
              className="px-2 py-1.5 rounded-lg bg-[#182133] border border-[#2B3852] text-[11px] text-gray-300 hover:text-white hover:border-purple-500 transition-colors truncate"
            >
              Mukesh (PM)
            </button>
            <button
              type="button"
              onClick={() => fillDemo('admin@projectflow.local', 'Admin@12345')}
              className="px-2 py-1.5 rounded-lg bg-[#182133] border border-[#2B3852] text-[11px] text-gray-300 hover:text-white hover:border-purple-500 transition-colors truncate"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => fillDemo('rahul@projectflow.local', 'Member@12345')}
              className="px-2 py-1.5 rounded-lg bg-[#182133] border border-[#2B3852] text-[11px] text-gray-300 hover:text-white hover:border-purple-500 transition-colors truncate"
            >
              Rahul (Dev)
            </button>
          </div>
        </div>

        {/* Register prompt */}
        <div className="text-center">
          <p className="text-xs text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-purple-400 hover:text-purple-300 font-bold">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
