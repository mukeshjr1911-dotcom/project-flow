import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  Hourglass,
  ArrowRight,
  Plus
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import SummaryCard from '../components/SummaryCard';
import ProjectCard from '../components/ProjectCard';
import UpcomingTasks from '../components/UpcomingTasks';
import MiniCalendar from '../components/MiniCalendar';
import ProjectChart from '../components/ProjectChart';
import ActivityFeed from '../components/ActivityFeed';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState(7);
  const [error, setError] = useState(null);

  const fetchDashboardData = async (period = chartPeriod) => {
    try {
      setLoading(true);
      const res = await client.get(`/dashboard/summary?period=${period}`);
      setData(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(chartPeriod);
  }, [chartPeriod]);

  const handleToggleTask = async (task) => {
    try {
      const nextStatus = task.status === 'Completed' ? 'In Progress' : 'Completed';
      await client.patch(`/tasks/${task.task_id}/status/`, { status: nextStatus });
      fetchDashboardData(chartPeriod);
    } catch (err) {
      alert('Could not update task status.');
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center bg-[#121724] border border-red-500/30 rounded-2xl">
        <p className="text-red-400 font-medium mb-4">{error}</p>
        <button
          onClick={() => fetchDashboardData()}
          className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const user = data?.user || {};
  const summary = data?.summary || {};
  const myProjects = data?.my_projects || [];
  const upcomingTasks = data?.upcoming_tasks || [];
  const activityFeed = data?.activity_feed || [];
  const chartData = data?.chart_data || [];
  const miniCalendar = data?.mini_calendar || {};

  return (
    <div className="space-y-6">
      {/* 1. Hero Greeting Banner matching screenshot */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#111625] via-[#1A2238] to-[#121829] border border-[#232F46] p-7 md:p-9 shadow-2xl">
        {/* Dark mountain backdrop artwork illustration */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none mix-blend-screen bg-cover bg-right"
          style={{
            backgroundImage: `radial-gradient(circle at 80% 30%, rgba(139, 92, 246, 0.25) 0%, transparent 60%), linear-gradient(to bottom, transparent 40%, #0B0F19 100%)`,
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left Greeting & Action */}
          <div className="space-y-4 max-w-lg">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {user.greeting || 'Good Evening'},{' '}
              <span className="text-[#A78BFA] bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                {user.full_name?.split(' ')[0] || 'Mukesh'}
              </span>{' '}
              👋
            </h1>
            <p className="text-sm md:text-base text-gray-300 font-medium">
              Turn your plans into progress.
            </p>
            <div className="pt-1">
              <Link
                to="/projects"
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-bold shadow-lg shadow-purple-600/30 transition-all transform hover:-translate-y-0.5"
              >
                <span>View Projects</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Inspirational Quote */}
          <div className="hidden lg:block text-right pr-4">
            <blockquote className="text-sm italic text-gray-400 max-w-xs font-serif leading-relaxed">
              "A great project starts with a clear plan."
            </blockquote>
          </div>
        </div>
      </div>

      {/* 2. Four Summary Cards matching screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={FolderKanban}
          iconBg="bg-purple-600/15 text-purple-400 border border-purple-500/20"
          value={summary.total_projects}
          title="Total Projects"
          badgeText={summary.projects_growth}
        />
        <SummaryCard
          icon={CheckCircle2}
          iconBg="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
          value={summary.tasks_completed}
          title="Tasks Completed"
          badgeText={summary.completed_growth}
        />
        <SummaryCard
          icon={Clock}
          iconBg="bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
          value={summary.pending_tasks}
          title="Pending Tasks"
        />
        <SummaryCard
          icon={Hourglass}
          iconBg="bg-red-500/15 text-red-400 border border-red-500/20"
          value={summary.overdue_tasks}
          title="Overdue Tasks"
          isOverdue={true}
        />
      </div>

      {/* 3. Main Dashboard Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column (8 cols): My Projects, Chart, Activity */}
        <div className="xl:col-span-8 space-y-6">
          {/* My Projects Header & Cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white tracking-tight">
                My Projects
              </h2>
              <Link
                to="/projects"
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors flex items-center space-x-1"
              >
                <span>View All</span>
                <span>→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myProjects.slice(0, 3).map((project) => (
                <ProjectCard key={project.project_id} project={project} />
              ))}
            </div>
          </div>

          {/* Lower Grid: Project Overview Chart & Activity Feed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProjectChart
              data={chartData}
              period={chartPeriod}
              onPeriodChange={(newPeriod) => setChartPeriod(newPeriod)}
            />
            <ActivityFeed activities={activityFeed} />
          </div>
        </div>

        {/* Right Column (4 cols): Upcoming Tasks & Mini Calendar */}
        <div className="xl:col-span-4 space-y-6">
          <UpcomingTasks
            tasks={upcomingTasks}
            onToggleTask={handleToggleTask}
          />
          <MiniCalendar deadlineDays={miniCalendar.deadline_days || []} />
        </div>
      </div>
    </div>
  );
}
