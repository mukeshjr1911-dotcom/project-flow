import React, { useState, useEffect } from 'react';
import {
  Download,
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Filter,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import client from '../api/client';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('project-progress'); // 'project-progress', 'task-completion', 'team-performance'
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');

  // Fetch filter options
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const pRes = await client.get('/projects/');
        setProjects(pRes.data.results || pRes.data || []);
        const tRes = await client.get('/team');
        setTeamMembers(tRes.data || []);
      } catch (e) {}
    };
    fetchFilters();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      let query = `?format=json`;
      if (selectedProject) query += `&project=${selectedProject}`;
      if (selectedMember) query += `&member=${selectedMember}`;

      const res = await client.get(`/reports/${reportType}${query}`);
      setReportData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, selectedProject, selectedMember]);

  const handleExportCSV = () => {
    const baseURL = client.defaults.baseURL || 'http://localhost:8000/api';
    let url = `${baseURL}/reports/${reportType}?export=csv`;
    if (selectedProject) url += `&project=${selectedProject}`;
    if (selectedMember) url += `&member=${selectedMember}`;

    const token = localStorage.getItem('access_token');
    // Trigger browser download via fetch with auth header
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${reportType}_report.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => alert('CSV Export failed.'));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Reports & Analytics
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Data-driven insights, progress monitoring, and team performance metrics.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#182133] border border-[#2B3852] text-xs font-semibold text-gray-300 hover:text-white hover:border-purple-500 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Report Type Selector Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#1F293D] pb-3 overflow-x-auto">
        {[
          { id: 'project-progress', label: 'Project Progress Report', icon: TrendingUp },
          { id: 'task-completion', label: 'Task Completion Report', icon: PieIcon },
          { id: 'team-performance', label: 'Team Performance Report', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                reportType === tab.id
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

      {/* Filters */}
      <div className="bg-[#121724] border border-[#1F293D] rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-300">Filter By:</span>
        </div>

        {/* Project Filter */}
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="px-3 py-2 bg-[#182133] border border-[#2B3852] rounded-xl text-xs text-gray-300 focus:outline-none focus:border-purple-500"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.project_id} value={p.project_id}>
              {p.project_name}
            </option>
          ))}
        </select>

        {/* Member Filter (for tasks / team) */}
        <select
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          className="px-3 py-2 bg-[#182133] border border-[#2B3852] rounded-xl text-xs text-gray-300 focus:outline-none focus:border-purple-500"
        >
          <option value="">All Team Members</option>
          {teamMembers.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.full_name}
            </option>
          ))}
        </select>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !reportData ? (
        <p className="text-gray-400 text-center py-12">No data available.</p>
      ) : (
        <div className="space-y-6">
          {/* 1. PROJECT PROGRESS REPORT (FR-48) */}
          {reportType === 'project-progress' && (
            <>
              {/* Horizontal Bar Chart */}
              <div className="bg-[#121724] border border-[#1F293D] rounded-3xl p-6 shadow-xl">
                <h3 className="text-base font-bold text-white mb-6">
                  Project Completion Comparison
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={reportData.data}
                      margin={{ top: 10, right: 30, left: 80, bottom: 5 }}
                    >
                      <XAxis type="number" domain={[0, 100]} unit="%" stroke="#64748B" />
                      <YAxis
                        type="category"
                        dataKey="project_name"
                        stroke="#64748B"
                        tick={{ fill: '#F3F4F6', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#182133',
                          border: '1px solid #2E3C57',
                          borderRadius: '12px',
                        }}
                      />
                      <Bar dataKey="progress_percent" fill="#8B5CF6" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-[#121724] border border-[#1F293D] rounded-3xl p-6 shadow-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#1C2538] text-gray-400 font-bold uppercase">
                    <tr>
                      <th className="pb-3">Project Name</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Progress</th>
                      <th className="pb-3">Start Date</th>
                      <th className="pb-3">Deadline</th>
                      <th className="pb-3">Days Remaining</th>
                      <th className="pb-3">Total Tasks</th>
                      <th className="pb-3">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C2538] text-gray-200">
                    {reportData.data?.map((item) => (
                      <tr key={item.project_id} className="hover:bg-[#161D2E] transition-colors">
                        <td className="py-3.5 font-bold text-white">{item.project_name}</td>
                        <td className="py-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 font-bold text-purple-400">{item.progress_percent}%</td>
                        <td className="py-3.5 text-gray-400">{item.start_date}</td>
                        <td className="py-3.5 text-amber-400 font-medium">{item.deadline}</td>
                        <td className="py-3.5">
                          {item.days_remaining > 0 ? (
                            <span className="text-gray-300">{item.days_remaining} days</span>
                          ) : (
                            <span className="text-red-400 font-bold">Passed</span>
                          )}
                        </td>
                        <td className="py-3.5">{item.total_tasks}</td>
                        <td className="py-3.5 text-emerald-400 font-semibold">{item.completed_tasks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* 2. TASK COMPLETION REPORT (FR-49) */}
          {reportType === 'task-completion' && (
            <>
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-5 bg-[#121724] border border-[#1F293D] rounded-2xl">
                  <span className="text-2xl font-black text-white">{reportData.data?.total_tasks}</span>
                  <p className="text-xs text-gray-400 mt-1">Total Tasks</p>
                </div>
                <div className="p-5 bg-[#121724] border border-[#1F293D] rounded-2xl">
                  <span className="text-2xl font-black text-emerald-400">{reportData.data?.completed}</span>
                  <p className="text-xs text-gray-400 mt-1">Completed</p>
                </div>
                <div className="p-5 bg-[#121724] border border-[#1F293D] rounded-2xl">
                  <span className="text-2xl font-black text-indigo-400">{reportData.data?.pending}</span>
                  <p className="text-xs text-gray-400 mt-1">Pending</p>
                </div>
                <div className="p-5 bg-[#121724] border border-[#1F293D] rounded-2xl">
                  <span className="text-2xl font-black text-red-400">{reportData.data?.overdue}</span>
                  <p className="text-xs text-gray-400 mt-1">Overdue</p>
                </div>
              </div>

              {/* Visual Charts: Donut for Status & Bar for Priorities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Donut Chart */}
                <div className="bg-[#121724] border border-[#1F293D] rounded-3xl p-6 shadow-xl">
                  <h3 className="text-base font-bold text-white mb-4">
                    Status Distribution (Donut Chart)
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportData.data?.status_distribution}
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {reportData.data?.status_distribution?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Priority Breakdown Bar Chart */}
                <div className="bg-[#121724] border border-[#1F293D] rounded-3xl p-6 shadow-xl">
                  <h3 className="text-base font-bold text-white mb-4">
                    Priority Breakdown
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.data?.priority_distribution}>
                        <XAxis dataKey="name" stroke="#64748B" />
                        <YAxis stroke="#64748B" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#182133',
                            border: '1px solid #2E3C57',
                            borderRadius: '12px',
                          }}
                        />
                        <Bar dataKey="value" fill="#7C3AED" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 3. TEAM PERFORMANCE REPORT (FR-50) */}
          {reportType === 'team-performance' && (
            <>
              {/* Grouped Bar Chart */}
              <div className="bg-[#121724] border border-[#1F293D] rounded-3xl p-6 shadow-xl">
                <h3 className="text-base font-bold text-white mb-6">
                  Team Task Execution
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.data}>
                      <XAxis dataKey="full_name" stroke="#64748B" />
                      <YAxis stroke="#64748B" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#182133',
                          border: '1px solid #2E3C57',
                          borderRadius: '12px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="assigned_tasks" name="Assigned" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="completed_tasks" name="Completed" fill="#10B981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="overdue_tasks" name="Overdue" fill="#EF4444" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-[#121724] border border-[#1F293D] rounded-3xl p-6 shadow-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#1C2538] text-gray-400 font-bold uppercase">
                    <tr>
                      <th className="pb-3">Member</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Assigned Tasks</th>
                      <th className="pb-3">Completed</th>
                      <th className="pb-3">Pending</th>
                      <th className="pb-3">Overdue</th>
                      <th className="pb-3">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C2538] text-gray-200">
                    {reportData.data?.map((m) => (
                      <tr key={m.user_id} className="hover:bg-[#161D2E] transition-colors">
                        <td className="py-3.5 font-bold text-white">{m.full_name}</td>
                        <td className="py-3.5 text-gray-400">{m.email}</td>
                        <td className="py-3.5 font-semibold">{m.assigned_tasks}</td>
                        <td className="py-3.5 text-emerald-400 font-semibold">{m.completed_tasks}</td>
                        <td className="py-3.5 text-gray-300">{m.pending_tasks}</td>
                        <td className="py-3.5 text-red-400 font-semibold">{m.overdue_tasks}</td>
                        <td className="py-3.5 font-bold text-purple-400">{m.completion_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
