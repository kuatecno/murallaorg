'use client';

import { useState, useEffect } from 'react';
import { X, FolderKanban } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate?: string;
  dueDate?: string;
  progress: number;
  projectId?: string;
  parentTaskId?: string;
  estimatedHours?: number;
  assignments?: {
    staff: {
      id: string;
    };
  }[];
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskSaved: () => void;
  task?: Task | null;
  defaultProjectId?: string | null;
  parentTaskId?: string | null;
}

export default function TaskModal({
  isOpen,
  onClose,
  onTaskSaved,
  task,
  defaultProjectId,
  parentTaskId
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [status, setStatus] = useState<'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED'>('TODO');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [estimatedHours, setEstimatedHours] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchStaff();
      fetchProjects();
      if (task) {
        populateForm(task);
      } else {
        resetForm();
      }
    }
  }, [isOpen, task]);

  useEffect(() => {
    if (!task && defaultProjectId) {
      setProjectId(defaultProjectId);
    }
  }, [defaultProjectId, task]);

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/staff');
      if (!response.ok) throw new Error('Failed to fetch staff');

      const data = await response.json();
      setStaff(data.staff || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');

      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const populateForm = (task: Task) => {
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setStatus(task.status);
    setStartDate(task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '');
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    setProjectId(task.projectId || '');
    setProgress(task.progress);
    setEstimatedHours(task.estimatedHours ? task.estimatedHours.toString() : '');
    setSelectedStaff(task.assignments?.map(a => a.staff.id) || []);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setStatus('TODO');
    setStartDate('');
    setDueDate('');
    setProjectId(defaultProjectId || '');
    setProgress(0);
    setEstimatedHours('');
    setSelectedStaff([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Task title is required');
      return;
    }

    if (startDate && dueDate && new Date(startDate) > new Date(dueDate)) {
      toast.error('Start date must be before due date');
      return;
    }

    setLoading(true);

    try {
      const url = task ? `/api/tasks/${task.id}` : '/api/tasks';
      const method = task ? 'PUT' : 'POST';

      const body: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        projectId: projectId || undefined,
        progress,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        assignedStaff: selectedStaff, // Send IDs to be handled by API
      };

      if (!task) {
        body.parentTaskId = parentTaskId || undefined;
      } else {
        body.status = status; // Allow updating status when editing
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${task ? 'update' : 'create'} task`);
      }

      toast.success(`Task ${task ? 'updated' : 'created'} successfully!`);

      onTaskSaved();
      onClose();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${task ? 'update' : 'create'} task`);
      console.error('Error saving task:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStaffSelection = (staffId: string) => {
    setSelectedStaff(prev =>
      prev.includes(staffId)
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {task ? 'Edit Task' : parentTaskId ? 'Create Subtask' : 'Create New Task'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter task description..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Project */}
            {!parentTaskId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FolderKanban className="w-4 h-4" />
                  Project
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No Project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              {/* Status (Only for Edit) */}
              {task && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={startDate}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Progress and Estimated Hours */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Progress (%)
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={(e) => setProgress(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-center text-sm font-medium text-gray-700">
                    {progress}%
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="e.g., 8"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Assign Staff */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Staff
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {staff.length === 0 ? (
                  <p className="text-gray-500 text-sm">No staff members available</p>
                ) : (
                  <div className="space-y-2">
                    {staff.map((member) => (
                      <label
                        key={member.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStaff.includes(member.id)}
                          onChange={() => toggleStaffSelection(member.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center">
                            {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {member.firstName} {member.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {selectedStaff.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  {selectedStaff.length} staff member{selectedStaff.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
