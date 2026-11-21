import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, ArrowUpDown } from 'lucide-react';
import client from '../api/client';
import ProjectCard from '../components/ProjectCard';
import ProjectModal from '../components/ProjectModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { useAuth } from '../context/AuthContext';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('deadline');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      let query = `?sort=${sortBy}`;
      if (statusFilter) query += `&status=${encodeURIComponent(statusFilter)}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;

      const res = await client.get(`/projects/${query}`);
      setProjects(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter, sortBy, search]);

  const canCreate = user?.role_name !== 'Team Member';

  const handleEdit = (proj) => {
    setEditingProject(proj);
    setModalOpen(true);
  };

  const handleDeletePrompt = (proj) => {
    setDeletingProject(proj);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProject) return;
    setDeleteLoading(true);
    try {
      await client.delete(`/projects/${deletingProject.project_id}/`);
      setDeleteModalOpen(false);
      setDeletingProject(null);
      fetchProjects();
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not delete project.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Projects
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Organize, monitor progress, and manage deliverables.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setEditingProject(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#121724] border border-[#1F293D] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#182133] border border-[#2B3852] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center space-x-2 flex-1 md:flex-initial">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-auto px-3 py-2 bg-[#182133] border border-[#2B3852] rounded-xl text-xs text-gray-300 focus:outline-none focus:border-purple-500"
            >
              <option value="">All Statuses</option>
              <option value="Not Started">Not Started</option>
              <option value="On Track">On Track</option>
              <option value="At Risk">At Risk</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center space-x-2 flex-1 md:flex-initial">
            <ArrowUpDown className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-auto px-3 py-2 bg-[#182133] border border-[#2B3852] rounded-xl text-xs text-gray-300 focus:outline-none focus:border-purple-500"
            >
              <option value="deadline">Deadline: Soonest</option>
              <option value="-deadline">Deadline: Latest</option>
              <option value="-created_at">Newest First</option>
              <option value="-progress_percent">Highest Progress</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center bg-[#121724] border border-[#1F293D] rounded-2xl">
          <p className="text-gray-400 text-sm">No projects found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => (
            <ProjectCard
              key={proj.project_id}
              project={proj}
              onEdit={() => handleEdit(proj)}
              onDelete={() => handleDeletePrompt(proj)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        project={editingProject}
        onSuccess={fetchProjects}
      />

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Project"
        message={`Are you sure you want to delete "${deletingProject?.project_name}"? All associated tasks will also be deleted.`}
        loading={deleteLoading}
      />
    </div>
  );
}
