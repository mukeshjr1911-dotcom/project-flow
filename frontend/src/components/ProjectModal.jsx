import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import client from '../api/client';

export default function ProjectModal({ isOpen, onClose, project = null, onSuccess }) {
  const [formData, setFormData] = useState({
    project_name: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    deadline: '',
    status: 'Not Started',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        project_name: project.project_name || '',
        description: project.description || '',
        start_date: project.start_date || new Date().toISOString().split('T')[0],
        deadline: project.deadline || '',
        status: project.status || 'Not Started',
      });
    } else {
      setFormData({
        project_name: '',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        deadline: '',
        status: 'Not Started',
      });
    }
    setErrors({});
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // FR-24: validate deadline cannot precede start date
    if (formData.start_date && formData.deadline && formData.deadline < formData.start_date) {
      setErrors({ deadline: ['Project deadline cannot precede the start date.'] });
      return;
    }

    setLoading(true);
    try {
      if (project?.project_id) {
        await client.put(`/projects/${project.project_id}/`, formData);
      } else {
        await client.post('/projects/', formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
      } else {
        setErrors({ non_field_errors: ['Something went wrong. Please try again.'] });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#121724] border border-[#232F46] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E293B]"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-5">
          {project ? 'Edit Project' : 'Create New Project'}
        </h2>

        {errors.non_field_errors && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
            {errors.non_field_errors.join(' ')}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              placeholder="e.g. Online Quiz System"
            />
            {errors.project_name && (
              <p className="text-xs text-red-400 mt-1">{errors.project_name[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              placeholder="Brief summary of the project goals..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              />
              {errors.start_date && (
                <p className="text-xs text-red-400 mt-1">{errors.start_date[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Deadline *
              </label>
              <input
                type="date"
                required
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3 py-2 bg-[#182133] border border-[#2B3852] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
              />
              {errors.deadline && (
                <p className="text-xs text-red-400 mt-1">{errors.deadline[0]}</p>
              )}
            </div>
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
              <option value="Not Started">Not Started</option>
              <option value="On Track">On Track</option>
              <option value="At Risk">At Risk</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
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
              {loading ? 'Saving...' : project ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
