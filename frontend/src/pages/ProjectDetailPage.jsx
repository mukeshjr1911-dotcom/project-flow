import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Users,
  CheckCircle2,
  Plus,
  Clock,
  UserPlus,
  Trash2,
  Edit2
} from 'lucide-react';
import client from '../api/client';
import TaskModal from '../components/TaskModal';
import ProjectModal from '../components/ProjectModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { useAuth } from '../context/AuthContext';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Add Member Modal
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [memberForm, setMemberForm] = useState({
    user: '',
    project_role: 'Team Member',
    responsibility: 'Developer',
  });

  // Remove Member Modal with task reassignment (FR-42)
  const [removeMemberTarget, setRemoveMemberTarget] = useState(null);
  const [reassignToUser, setReassignToUser] = useState('');

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const res = await client.get(`/projects/${id}/details/`);
      setProjectData(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load project details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const handleToggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'Completed' ? 'In Progress' : 'Completed';
    try {
      await client.patch(`/tasks/${task.task_id}/status/`, { status: nextStatus });
      fetchProjectDetails();
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not update task status.');
    }
  };

  const handleOpenAddMember = async () => {
    try {
      const res = await client.get('/team');
      setAllUsers(res.data || []);
      setAddMemberModalOpen(true);
    } catch (e) {}
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    try {
      await client.post('/project-members/', {
        project: id,
        user: memberForm.user,
        project_role: memberForm.project_role,
        responsibility: memberForm.responsibility,
      });
      setAddMemberModalOpen(false);
      fetchProjectDetails();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add member.');
    }
  };

  const handleRemoveMemberConfirm = async () => {
    if (!removeMemberTarget) return;
    try {
      let url = `/project-members/${removeMemberTarget.member_id}/`;
      if (reassignToUser) {
        url += `?reassign_to=${reassignToUser}`;
      }
      await client.delete(url);
      setRemoveMemberTarget(null);
      setReassignToUser('');
      fetchProjectDetails();
    } catch (err) {
      if (err.response?.data?.requires_reassignment) {
        alert(err.response.data.detail);
      } else {
        alert('Failed to remove member.');
      }
    }
  };

  const handleDeleteProject = async () => {
    setDeleteLoading(true);
    try {
      await client.delete(`/projects/${id}/`);
      navigate('/projects');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete project.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading && !projectData) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="p-8 text-center bg-[#121724] border border-red-500/30 rounded-2xl">
        <p className="text-red-400 font-medium mb-4">{error || 'Project not found.'}</p>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const { project, tasks = [], members = [], activities = [] } = projectData;
  const isOwnerOrAdmin = project.owner === user?.user_id || user?.role_name === 'Admin';
  const progress = parseFloat(project.progress_percent || 0);

  return (
    <div className="space-y-6">
      {/* Top back button & actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/projects')}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>

        {isOwnerOrAdmin && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setProjectModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#1E293B] hover:bg-[#2A364F] text-xs font-semibold text-white transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-400 border border-red-500/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Project Header Card */}
      <div className="bg-[#121724] border border-[#1F293D] rounded-3xl p-7 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#1C2538]">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                {project.project_name}
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                {project.status}
              </span>
            </div>
            <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
              {project.description || 'No description provided.'}
            </p>
          </div>

          {/* Key dates & owner */}
          <div className="flex items-center space-x-6 text-xs text-gray-400">
            <div>
              <span className="block text-[11px] font-semibold text-gray-500 uppercase">
                Start Date
              </span>
              <span className="font-bold text-gray-200">{project.start_date}</span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-gray-500 uppercase">
                Deadline
              </span>
              <span className="font-bold text-amber-400">{project.deadline}</span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-gray-500 uppercase">
                Manager
              </span>
              <span className="font-bold text-gray-200">{project.owner_name}</span>
            </div>
          </div>
        </div>

        {/* Progress row */}
        <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between text-xs font-bold text-gray-300 mb-2">
              <span>Overall Completion</span>
              <span className="text-purple-400">{progress}%</span>
            </div>
            <div className="w-full h-2.5 bg-[#1B2333] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs font-semibold">
            <span className="text-emerald-400">
              {project.completed_tasks_count} Completed
            </span>
            <span className="text-gray-400">
              {project.pending_tasks_count} Pending
            </span>
            <span className="text-red-400">
              {project.overdue_tasks_count} Overdue
            </span>
          </div>
        </div>
      </div>

      {/* Two columns: Tasks (left) and Members/Activity (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (8 cols): Tasks */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Tasks ({tasks.length})
            </h2>
            <button
              onClick={() => {
                setEditingTask(null);
                setTaskModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>

          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="p-8 text-center bg-[#121724] border border-[#1F293D] rounded-2xl">
                <p className="text-gray-400 text-xs">No tasks added yet.</p>
              </div>
            ) : (
              tasks.map((task) => {
                const isCompleted = task.status === 'Completed';
                return (
                  <div
                    key={task.task_id}
                    className="p-4 bg-[#121724] border border-[#1F293D] hover:border-[#2C3B54] rounded-2xl flex items-center justify-between transition-colors shadow-md"
                  >
                    <div className="flex items-start space-x-3.5 min-w-0 pr-4">
                      <button
                        onClick={() => handleToggleTaskStatus(task)}
                        className="mt-0.5 text-gray-500 hover:text-purple-400 transition-colors shrink-0"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-purple-500 fill-purple-500/20" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-500 hover:border-purple-400" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <p
                          className={`text-sm font-semibold truncate ${
                            isCompleted ? 'line-through text-gray-500' : 'text-white'
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center space-x-3 text-[11px] text-gray-400 mt-1">
                          <span>Assignee: <strong className="text-gray-300">{task.assignee_name}</strong></span>
                          <span>•</span>
                          <span className={task.is_overdue ? 'text-red-400 font-bold' : ''}>
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                          task.priority === 'Critical'
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : task.priority === 'High'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        }`}
                      >
                        {task.priority}
                      </span>
                      <button
                        onClick={() => {
                          setEditingTask(task);
                          setTaskModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E293B]"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right (4 cols): Team Members & Recent Activities */}
        <div className="lg:col-span-4 space-y-6">
          {/* Members Panel */}
          <div className="bg-[#121724] border border-[#1F293D] rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Team Members ({members.length})
              </h3>
              {isOwnerOrAdmin && (
                <button
                  onClick={handleOpenAddMember}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-purple-400 hover:text-purple-300"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {members.map((m) => (
                <div
                  key={m.member_id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#161D2E] border border-[#202B3F]"
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-full bg-purple-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {m.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {m.full_name}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {m.responsibility || m.project_role}
                      </p>
                    </div>
                  </div>

                  {isOwnerOrAdmin && m.user_id !== project.owner && (
                    <button
                      onClick={() => setRemoveMemberTarget(m)}
                      title="Remove member"
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Activities Panel */}
          <div className="bg-[#121724] border border-[#1F293D] rounded-2xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-white tracking-tight mb-4">
              Project History
            </h3>
            <div className="space-y-3">
              {activities.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No activity yet.</p>
              ) : (
                activities.slice(0, 6).map((a) => (
                  <div key={a.activity_id} className="text-xs text-gray-300">
                    <p className="font-medium text-white">{a.action}</p>
                    <span className="text-[10px] text-gray-500">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        task={editingTask}
        defaultProjectId={id}
        onSuccess={fetchProjectDetails}
      />

      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        project={project}
        onSuccess={fetchProjectDetails}
      />

      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        message={`Are you sure you want to permanently delete "${project.project_name}"?`}
        loading={deleteLoading}
      />

      {/* Add Member Modal */}
      {addMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#121724] border border-[#232F46] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-4">Add Member to Project</h3>
            <form onSubmit={handleAddMemberSubmit} className="space-y-4">
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
                  <option value="">Select User</option>
                  {allUsers.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.full_name} ({u.email})
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
                  placeholder="e.g. Frontend Developer"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#1F293D]">
                <button
                  type="button"
                  onClick={() => setAddMemberModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl shadow-lg shadow-purple-600/30"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Member with Task Reassignment Modal (FR-42) */}
      {removeMemberTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#121724] border border-[#232F46] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2">Remove Team Member</h3>
            <p className="text-xs text-gray-300 mb-4 leading-relaxed">
              Are you sure you want to remove <strong>{removeMemberTarget.full_name}</strong> from this project?
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Reassign Open Tasks To:
              </label>
              <select
                value={reassignToUser}
                onChange={(e) => setReassignToUser(e.target.value)}
                className="w-full px-3 py-2 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">None / Keep unchanged</option>
                {members
                  .filter((m) => m.user_id !== removeMemberTarget.user_id)
                  .map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.full_name} ({m.responsibility || m.project_role})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-[#1F293D]">
              <button
                type="button"
                onClick={() => setRemoveMemberTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveMemberConfirm}
                className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
