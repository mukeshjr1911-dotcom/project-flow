import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  MessageSquare,
  MoreVertical,
  Calendar,
  AlertTriangle,
  User,
  Trash2,
  Edit2,
  X
} from 'lucide-react';
import client from '../api/client';
import TaskModal from '../components/TaskModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { useAuth } from '../context/AuthContext';

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [viewTab, setViewTab] = useState('all'); // 'all', 'pending', 'completed', 'overdue'
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Comments drawer
  const [commentsDrawerTask, setCommentsDrawerTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      let query = `?view=${viewTab}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (projectFilter) query += `&project=${projectFilter}`;
      if (priorityFilter) query += `&priority=${priorityFilter}`;

      const res = await client.get(`/tasks/${query}`);
      setTasks(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await client.get('/projects/');
      setProjects(res.data.results || res.data || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [viewTab, search, projectFilter, priorityFilter]);

  const handleStatusChange = async (task, newStatus) => {
    try {
      await client.patch(`/tasks/${task.task_id}/status/`, { status: newStatus });
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not update task status.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTask) return;
    setDeleteLoading(true);
    try {
      await client.delete(`/tasks/${deletingTask.task_id}/`);
      setDeleteModalOpen(false);
      setDeletingTask(null);
      fetchTasks();
    } catch (err) {
      alert('Failed to delete task.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openComments = async (task) => {
    setCommentsDrawerTask(task);
    try {
      const res = await client.get(`/tasks/${task.task_id}/comments/`);
      setComments(res.data || []);
    } catch (e) {}
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !commentsDrawerTask) return;
    setCommentLoading(true);
    try {
      const res = await client.post(`/tasks/${commentsDrawerTask.task_id}/comments/`, {
        comment_text: newComment,
      });
      setComments([...comments, res.data]);
      setNewComment('');
    } catch (err) {
      alert('Failed to post comment.');
    } finally {
      setCommentLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Tasks
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Track units of work, manage deadlines, and update status.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingTask(null);
            setTaskModalOpen(true);
          }}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Tabs: All, Pending, Completed, Overdue */}
      <div className="flex items-center space-x-2 border-b border-[#1F293D] pb-3 overflow-x-auto">
        {[
          { id: 'all', label: 'All Tasks' },
          { id: 'pending', label: 'Pending' },
          { id: 'completed', label: 'Completed' },
          { id: 'overdue', label: 'Overdue' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              viewTab === tab.id
                ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-600/30'
                : 'text-gray-400 hover:text-white hover:bg-[#161F30]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#121724] border border-[#1F293D] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#182133] border border-[#2B3852] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Project filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full md:w-auto px-3 py-2 bg-[#182133] border border-[#2B3852] rounded-xl text-xs text-gray-300 focus:outline-none focus:border-purple-500"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.project_id} value={p.project_id}>
                {p.project_name}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full md:w-auto px-3 py-2 bg-[#182133] border border-[#2B3852] rounded-xl text-xs text-gray-300 focus:outline-none focus:border-purple-500"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center bg-[#121724] border border-[#1F293D] rounded-2xl">
          <p className="text-gray-400 text-sm">No tasks found in this view.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isCompleted = task.status === 'Completed';
            return (
              <div
                key={task.task_id}
                className="bg-[#121724] border border-[#1F293D] hover:border-[#2C3B54] rounded-2xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-md"
              >
                {/* Left: Checkbox & Info */}
                <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                  <button
                    onClick={() =>
                      handleStatusChange(
                        task,
                        isCompleted ? 'In Progress' : 'Completed'
                      )
                    }
                    className="mt-0.5 text-gray-500 hover:text-purple-400 transition-colors shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-purple-500 fill-purple-500/20" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-500 hover:border-purple-400" />
                    )}
                  </button>

                  <div className="min-w-0 space-y-1">
                    <p
                      className={`text-sm font-semibold truncate ${
                        isCompleted ? 'line-through text-gray-500' : 'text-white'
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-gray-400 line-clamp-1">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 pt-0.5">
                      <span className="font-medium text-purple-400">
                        {task.project_name}
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <User className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-300">{task.assignee_name}</span>
                      </span>
                      <span>•</span>
                      <span
                        className={`flex items-center space-x-1 ${
                          task.is_overdue ? 'text-red-400 font-bold' : ''
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(task.due_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </span>
                      {task.is_overdue && (
                        <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 font-bold text-[10px]">
                          OVERDUE
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Status selector, Priority badge, Comments & Actions */}
                <div className="flex items-center space-x-3 self-end md:self-auto shrink-0">
                  {/* Status Dropdown */}
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task, e.target.value)}
                    className="px-2.5 py-1 rounded-xl bg-[#182133] border border-[#2B3852] text-xs font-semibold text-gray-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="In Review">In Review</option>
                    <option value="Completed">Completed</option>
                  </select>

                  {/* Priority Tag */}
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                      task.priority === 'Critical'
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : task.priority === 'High'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    }`}
                  >
                    {task.priority}
                  </span>

                  {/* Comments button */}
                  <button
                    onClick={() => openComments(task)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E293B] relative"
                    title="View Comments"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {task.comments_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                        {task.comments_count}
                      </span>
                    )}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => {
                      setEditingTask(task);
                      setTaskModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E293B]"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      setDeletingTask(task);
                      setDeleteModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        task={editingTask}
        onSuccess={fetchTasks}
      />

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Task"
        message={`Are you sure you want to delete "${deletingTask?.title}"?`}
        loading={deleteLoading}
      />

      {/* Comments Drawer (FR-37) */}
      {commentsDrawerTask && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#121724] border-l border-[#232F46] h-full flex flex-col p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#1F293D]">
              <div className="min-w-0 pr-3">
                <h3 className="text-sm font-bold text-white truncate">
                  Comments: {commentsDrawerTask.title}
                </h3>
                <p className="text-xs text-gray-400">{commentsDrawerTask.project_name}</p>
              </div>
              <button
                onClick={() => setCommentsDrawerTask(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E293B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comment List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {comments.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-8">
                  No comments yet. Start the conversation!
                </p>
              ) : (
                comments.map((c) => (
                  <div key={c.comment_id} className="p-3 bg-[#182133] rounded-xl border border-[#232F46]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-purple-300">
                        {c.author_name}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-200 leading-relaxed">
                      {c.comment_text}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Post Comment Input */}
            <form onSubmit={handleAddComment} className="pt-3 border-t border-[#1F293D] flex space-x-2">
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#182133] border border-[#2B3852] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={commentLoading || !newComment.trim()}
                className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
