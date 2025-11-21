'use client';

import { useState, useEffect } from 'react';
import { Plus, LayoutGrid, List, Calendar, Workflow } from 'lucide-react';
import { toast } from 'react-hot-toast';
import TaskBoard from '@/components/tasks/TaskBoard';
import TaskListView from '@/components/tasks/TaskListView';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';
import TaskTimeline from '@/components/tasks/TaskTimeline';
import TaskProcess from '@/components/tasks/TaskProcess';

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
      firstName: string;
      lastName: string;
      email: string;
    };
  }[];
  subtasks?: Task[];
  project?: {
    id: string;
    name: string;
    color: string;
  };
}

interface Project {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export default function PlanningPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | 'all'>('all');
  const [activeView, setActiveView] = useState<'board' | 'list' | 'timeline' | 'process'>('board');
  const [parentTaskId, setParentTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, projectsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/projects'),
      ]);

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks || []);
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: Task['status']) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update task');

      await fetchData();
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete task');

      await fetchData();
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  const handleEditTask = (task: Task) => {
    // TODO: Open edit modal
    toast('Edit modal coming soon!');
  };

  const handleAddSubtask = (parentId: string) => {
    setParentTaskId(parentId);
    setIsTaskModalOpen(true);
  };

  const filteredTasks = selectedProjectId === 'all'
    ? tasks
    : tasks.filter((t) => t.projectId === selectedProjectId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
              <p className="text-gray-600 text-sm mt-1">
                Smart task and process management across all projects
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Task
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* View Tabs */}
        <div className="bg-white rounded-lg shadow-sm p-1 mb-6 inline-flex gap-1">
          <button
            onClick={() => setActiveView('board')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeView === 'board'
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Board
          </button>
          <button
            onClick={() => setActiveView('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeView === 'list'
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            <List className="w-4 h-4" />
            List
          </button>
          <button
            onClick={() => setActiveView('timeline')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeView === 'timeline'
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            <Calendar className="w-4 h-4" />
            Timeline
          </button>
          <button
            onClick={() => setActiveView('process')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeView === 'process'
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            <Workflow className="w-4 h-4" />
            Process
          </button>
        </div>

        {/* Content */}
        {activeView === 'board' && (
          <TaskBoard
            tasks={filteredTasks}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onUpdateStatus={handleUpdateStatus}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onAddSubtask={handleAddSubtask}
            onRefresh={fetchData}
          />
        )}

        {activeView === 'list' && (
          <TaskListView
            tasks={filteredTasks}
            onUpdateStatus={handleUpdateStatus}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onAddSubtask={handleAddSubtask}
          />
        )}

        {activeView === 'timeline' && (
          <TaskTimeline
            tasks={filteredTasks}
            onEditTask={handleEditTask}
          />
        )}

        {activeView === 'process' && (
          <TaskProcess
            tasks={filteredTasks}
            onEditTask={handleEditTask}
          />
        )}
      </div>

      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setParentTaskId(null);
        }}
        onTaskCreated={fetchData}
        defaultProjectId={selectedProjectId === 'all' ? null : selectedProjectId}
        parentTaskId={parentTaskId}
      />
    </div>
  );
}
