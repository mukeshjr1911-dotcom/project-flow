import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import client from '../api/client';

export default function TaskModal({
  isOpen,
  onClose,
  task = null,
  defaultProjectId = null,
  defaultDate = null,
  onSuccess,
}) {
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project: defaultProjectId || '',
    assignee: '',
    priority: 'Medium',
    status: 'To Do',
    start_date: new Date().toISOString().split('T')[0],
    due_date: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await client.get('/projects/');
        setProjects(res.data.results || res.data || []);
      } catch (e) {}
    };
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  // Fetch project members whenever selected project changes
  useEffect(() => {
    const fetchMembers = async () => {
      if (!formData.project) {
        setMembers([]);
        return;
      }
      try {
        const res = await client.get(`/project-members/?project=${formData.project}`);
        setMembers(res.data.results || res.data || []);
      } catch (e) {}
    };
    if (formData.project) {
      fetchMembers();
    }
  }, [formData.project]);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        project: task.project || '',
        assignee: task.assignee || '',
        priority: task.priority || 'Medium',
        status: task.status || 'To Do',
        start_date: task.start_date || new Date().toISOString().split('T')[0],
        due_date: task.due_date ? task.due_date.substring(0, 16) : '',
      });
    } else {
      let initialDue = '';
      if (defaultDate) {
        initialDue = `${defaultDate}T18:00`;
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(18, 0, 0, 0);
        initialDue = tomorrow.toISOString().substring(0, 16);
      }

      setFormData({
        title: '',
        description: '',
        project: defaultProjectId || (projects[0]?.project_id || ''),
        assignee: '',
        priority: 'Medium',
        status: 'To Do',
        start_date: new Date().toISOString().split('T')[0],
        due_date: initialDue,
      });
    }
    setErrors({});
  }, [task, isOpen, defaultProjectId, defaultDate, projects]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (task?.task_id) {
        await client.put(`/tasks/${task.task_id}/`, formData);
      } else {
        await client.post('/tasks/', formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
      } else {
        setErrors({ non_field_errors: ['Failed to save task.'] });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#121724] border border-[#232F46] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E293B]"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-5">
          {task ? 'Edit Task' : 'Create New Task'}
        </h2>

        {errors.non_field_errors && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
            {errors.non_field_errors.join(' ')}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              placeholder="e.g. Design UI Layout"
            />
            {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title[0]}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              placeholder="Details about requirements or acceptance criteria..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Project *
              </label>
              <select
                required
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value, assignee: '' })}
                className="w-full px-3 py-2.5 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.project_id} value={p.project_id}>
                    {p.project_name}
                  </option>
                ))}
              </select>
              {errors.project && <p className="text-xs text-red-400 mt-1">{errors.project[0]}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Assignee * (Project Member)
              </label>
              <select
                required
                value={formData.assignee}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">Select Assignee</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.full_name} ({m.responsibility || m.project_role})
                  </option>
                ))}
              </select>
              {errors.assignee && <p className="text-xs text-red-400 mt-1">{errors.assignee[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Priority *
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="In Review">In Review</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Due Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              />
              {errors.due_date && <p className="text-xs text-red-400 mt-1">{errors.due_date[0]}</p>}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[#1F293D]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#1E293B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
