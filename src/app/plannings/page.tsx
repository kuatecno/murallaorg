'use client';

import { useState, useEffect } from 'react';
import { Plus, Filter, Search, LayoutGrid, List, Calendar, GitGraph } from 'lucide-react';
import { toast } from 'react-hot-toast';
import TaskBoard from '@/components/tasks/TaskBoard';
import TaskListView from '@/components/tasks/TaskListView';
import TaskModal from '@/components/tasks/TaskModal';
import TaskTimeline from '@/components/tasks/TaskTimeline';
import TaskProcess from '@/components/tasks/TaskProcess';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import CreateProjectModal from '@/components/projects/CreateProjectModal';
import EditProjectModal from '@/components/projects/EditProjectModal';

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
  description?: string;
  color: string;
  status: string;
  startDate?: string;
  endDate?: string;
  taskCount?: number;
  completedTaskCount?: number;
  progress?: number;
}

export default function PlanningPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | 'all'>('all');
  const [activeView, setActiveView] = useState<'board' | 'list' | 'timeline' | 'process'>('board');
  const [parentTaskId, setParentTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/projects'),
      ]);

      if (!tasksRes.ok || !projectsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const tasksData = await tasksRes.json();
      const projectsData = await projectsRes.json();

      setTasks(tasksData.tasks || []);
      setProjects(projectsData.projects || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      setTasks(tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete task');

      setTasks(tasks.filter((t) => t.id !== taskId));
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleAddSubtask = (parentId: string) => {
    setParentTaskId(parentId);
    setIsTaskModalOpen(true);
  };

  // Compute sidebar projects with stats
  const sidebarProjects = projects.map(p => {
    const pTasks = tasks.filter(t => t.projectId === p.id);
    const completed = pTasks.filter(t => t.status === 'COMPLETED').length;
    return {
      ...p,
      taskCount: pTasks.length,
      completedTaskCount: completed,
      progress: pTasks.length ? Math.round((completed / pTasks.length) * 100) : 0,
      status: p.status || 'ACTIVE'
    };
  });

  const filteredTasks = tasks.filter((task) => {
    const matchesProject = selectedProjectId === 'all' || task.projectId === selectedProjectId;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProject && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <ProjectSidebar
        projects={sidebarProjects}
        selectedProjectId={selectedProjectId === 'all' ? null : selectedProjectId}
        onSelectProject={(id) => setSelectedProjectId(id || 'all')}
        onCreateProject={() => setIsCreateProjectModalOpen(true)}
        onEditProject={(project) => {
          setEditingProject(project);
          setIsEditProjectModalOpen(true);
        }}
        onDeleteProject={() => fetchData()}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedProjectId === 'all'
                  ? 'All Tasks'
                  : projects.find((p) => p.id === selectedProjectId)?.name || 'Tasks'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage and track your project tasks
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
                />
              </div>

              <button
                onClick={() => {
                  setEditingTask(null);
                  setParentTaskId(null);
                  setIsTaskModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                New Task
              </button>
            </div>
          </div>

          {/* View Switcher */}
          <div className="flex items-center gap-2 mt-6 border-b border-gray-200">
            <button
              onClick={() => setActiveView('board')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeView === 'board'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Board
            </button>
            <button
              onClick={() => setActiveView('list')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeView === 'list'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setActiveView('timeline')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeView === 'timeline'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <Calendar className="w-4 h-4" />
              Timeline
            </button>
            <button
              onClick={() => setActiveView('process')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeView === 'process'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <GitGraph className="w-4 h-4" />
              Process
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
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
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onAddSubtask={handleAddSubtask}
              onUpdateStatus={handleUpdateStatus}
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
        </main>
      </div>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setParentTaskId(null);
          setEditingTask(null);
        }}
        onTaskSaved={fetchData}
        defaultProjectId={selectedProjectId === 'all' ? null : selectedProjectId}
        parentTaskId={parentTaskId}
        task={editingTask}
      />

      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onProjectCreated={fetchData}
      />

      <EditProjectModal
        isOpen={isEditProjectModalOpen}
        project={editingProject}
        onClose={() => {
          setIsEditProjectModalOpen(false);
          setEditingProject(null);
        }}
        onProjectUpdated={fetchData}
      />
    </div>
  );
}
