import React, { useState, useEffect } from 'react';
import { Users, Mail, Briefcase, CheckCircle2, Clock, Hourglass, Plus, Shield } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function TeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Member Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({
    user: '',
    project: '',
    project_role: 'Team Member',
    responsibility: 'Developer',
  });

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const res = await client.get('/team');
      setMembers(res.data || []);
      const projRes = await client.get('/projects/');
      setProjects(projRes.data.results || projRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await client.post('/project-members/', memberForm);
      setAddModalOpen(false);
      fetchTeam();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add team member.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Team
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage members, responsibilities, and monitor individual workloads.
          </p>
        </div>

        {user?.role_name !== 'Team Member' && (
          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add to Project</span>
          </button>
        )}
      </div>

      {/* Members Directory Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="p-12 text-center bg-[#121724] border border-[#1F293D] rounded-2xl">
          <p className="text-gray-400 text-sm">No team members found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((m) => {
            const workload = m.workload || {};
            const total = workload.total_tasks || 0;
            const completed = workload.completed_tasks || 0;
            const pending = workload.pending_tasks || 0;
            const overdue = workload.overdue_tasks || 0;

            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div
                key={m.user_id}
                className="bg-[#121724] border border-[#1F293D] rounded-2xl p-6 shadow-lg flex flex-col justify-between hover:border-[#2C3B54] transition-all"
              >
                <div>
                  {/* Member Profile Header */}
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-md">
                      {m.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-bold text-white truncate">
                          {m.full_name}
                        </h3>
                        {m.system_role === 'Admin' && (
                          <span title="Administrator">
                            <Shield className="w-3.5 h-3.5 text-purple-400" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-purple-400 font-medium">
                        {m.designation || m.system_role}
                      </p>
                      <div className="flex items-center space-x-1.5 text-xs text-gray-400 mt-1">
                        <Mail className="w-3.5 h-3.5 text-gray-500" />
                        <span className="truncate">{m.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Responsibilities */}
                  {m.responsibilities?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        Responsibilities
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {m.responsibilities.map((r, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-[#182133] border border-[#2B3852] text-[11px] text-gray-300 font-medium"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Projects involved */}
                  <div className="mb-5">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Assigned Projects ({m.projects?.length || 0})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.projects?.map((p) => (
                        <span
                          key={p.id}
                          className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px] font-medium"
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Workload Stats & Completion bar */}
                <div className="pt-4 border-t border-[#1C2538] space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-[#161D2E]">
                      <span className="block text-sm font-extrabold text-white">
                        {total}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        Assigned
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#161D2E]">
                      <span className="block text-sm font-extrabold text-emerald-400">
                        {completed}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        Done
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#161D2E]">
                      <span className="block text-sm font-extrabold text-red-400">
                        {overdue}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        Overdue
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 mb-1">
                      <span>Completion Rate</span>
                      <span className="text-gray-200">{completionRate}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1B2333] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Member to Project Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#121724] border border-[#232F46] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-4">Add Member to Project</h3>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Select User *
                </label>
                <select
                  required
                  value={memberForm.user}
                  onChange={(e) => setMemberForm({ ...memberForm, user: e.target.value })}
                  className="w-full px-3 py-2 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Choose User</option>
                  {members.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Select Project *
                </label>
                <select
                  required
                  value={memberForm.project}
                  onChange={(e) => setMemberForm({ ...memberForm, project: e.target.value })}
                  className="w-full px-3 py-2 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Choose Project</option>
                  {projects.map((p) => (
                    <option key={p.project_id} value={p.project_id}>
                      {p.project_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Project Role *
                </label>
                <select
                  value={memberForm.project_role}
                  onChange={(e) => setMemberForm({ ...memberForm, project_role: e.target.value })}
                  className="w-full px-3 py-2 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Team Member">Team Member</option>
                  <option value="Project Manager">Project Manager</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Responsibility (e.g. Designer, Developer, Tester)
                </label>
                <input
                  type="text"
                  value={memberForm.responsibility}
                  onChange={(e) => setMemberForm({ ...memberForm, responsibility: e.target.value })}
                  className="w-full px-3 py-2 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  placeholder="e.g. Lead Frontend Developer"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#1F293D]">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl shadow-lg shadow-purple-600/30"
                >
                  Assign to Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
