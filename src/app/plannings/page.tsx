'use client';

import { useState, useMemo, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { Plus, LayoutGrid, List, Calendar, Clock, ArrowLeft, Filter, ClipboardList } from 'lucide-react';
import TaskBoard from '@/components/tasks/TaskBoard';
import TaskListView from '@/components/tasks/TaskListView';
import TaskModal from '@/components/tasks/TaskModal';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import CreateProjectModal from '@/components/projects/CreateProjectModal';
import EditProjectModal from '@/components/projects/EditProjectModal';
import TaskProcess from '@/components/tasks/TaskProcess';
import FilterBar from '@/components/tasks/FilterBar';
import { toast } from 'react-hot-toast';
import TaskTimeline from '@/components/tasks/TaskTimeline';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

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
  createdAt: string;
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
  status: string;
  taskCount?: number;
  completedTaskCount?: number;
  progress?: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PlanningPage() {
  // SWR Hooks
  const { data: tasksData, error: tasksError, isLoading: tasksLoading } = useSWR('/api/tasks', fetcher);
  const { data: projectsData, error: projectsError, isLoading: projectsLoading } = useSWR('/api/projects', fetcher);
  const { data: staffData } = useSWR('/api/staff', fetcher);

  // Derived State
  const tasks = useMemo(() => (tasksData?.tasks || []) as Task[], [tasksData]);
  const projects = useMemo(() => (projectsData?.projects?.map((p: any) => ({
    ...p,
    status: p.status || 'ACTIVE'
  })) || []) as Project[], [projectsData]);
  const staff = useMemo(() => (staffData?.staff || []) as { id: string; firstName: string; lastName: string }[], [staffData]);

  const loading = tasksLoading || projectsLoading;

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);

  // View State
  const [selectedProjectId, setSelectedProjectId] = useState<string | 'all'>('all');
  const [activeView, setActiveView] = useState<'board' | 'list' | 'timeline' | 'process'>('board');
  const [parentTaskId, setParentTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{
    assigneeId: string | null;
    priority: string | null;
    dateRange: { start: string | null; end: string | null };
  }>({
    assigneeId: null,
    priority: null,
    dateRange: { start: null, end: null },
  });
  const [sort, setSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({
    field: 'createdAt',
    direction: 'desc',
  });

  const refreshData = useCallback(() => {
    mutate('/api/tasks');
    mutate('/api/projects');
  }, []);

  const handleUpdateStatus = useCallback(async (taskId: string, newStatus: Task['status']) => {
    try {
      // Optimistic update could go here
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      mutate('/api/tasks'); // Revalidate
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  }, []);

  const handleUpdateTask = useCallback(async (id: string, updates: any) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update task');

      mutate('/api/tasks');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
      throw error;
    }
  }, []);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete task');

      mutate('/api/tasks');
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  }, []);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  }, []);

  const handleAddSubtask = useCallback((parentId: string) => {
    setParentTaskId(parentId);
    setIsTaskModalOpen(true);
  }, []);

  // Compute sidebar projects with stats
  const sidebarProjects = useMemo(() => projects.map(p => {
    const pTasks = tasks.filter(t => t.projectId === p.id);
    const completed = pTasks.filter(t => t.status === 'COMPLETED').length;
    return {
      ...p,
      taskCount: pTasks.length,
      completedTaskCount: completed,
      progress: pTasks.length ? Math.round((completed / pTasks.length) * 100) : 0,
      status: p.status || 'ACTIVE'
    };
  }), [projects, tasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter((task) => {
      // Project filter
      if (selectedProjectId !== 'all' && task.projectId !== selectedProjectId) return false;

      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // Assignee
      if (filters.assigneeId) {
        const hasAssignee = task.assignments?.some(a => a.staff.id === filters.assigneeId);
        if (!hasAssignee) return false;
      }

      // Priority
      if (filters.priority && task.priority !== filters.priority) return false;

      // Date Range
      if (filters.dateRange.start && task.dueDate) {
        if (new Date(task.dueDate) < new Date(filters.dateRange.start)) return false;
      }
      if (filters.dateRange.end && task.dueDate) {
        if (new Date(task.dueDate) > new Date(filters.dateRange.end)) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let valA: any = a[sort.field as keyof Task];
      let valB: any = b[sort.field as keyof Task];

      // Handle dates
      if (sort.field === 'dueDate' || sort.field === 'createdAt') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }

      // Handle priority (custom order)
      if (sort.field === 'priority') {
        const priorityOrder: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 };
        valA = priorityOrder[valA as string] || 0;
        valB = priorityOrder[valB as string] || 0;
      }

      // Handle string comparison
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sort.direction === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [tasks, selectedProjectId, searchQuery, filters, sort]);

  if (tasksError || projectsError) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        Failed to load data. Please try refreshing the page.
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      {loading ? (
        <div className="w-64 bg-white border-r border-gray-200 p-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-10 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ) : (
        <ProjectSidebar
          projects={sidebarProjects}
          selectedProjectId={selectedProjectId === 'all' ? null : selectedProjectId}
          onSelectProject={(id) => setSelectedProjectId(id || 'all')}
          onCreateProject={() => setIsCreateProjectModalOpen(true)}
          onEditProject={(project) => {
            setEditingProject(project);
            setIsEditProjectModalOpen(true);
          }}
          onDeleteProject={() => mutate('/api/projects')}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
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
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveView('board')}
                  className={`p-2 rounded-md transition-all ${activeView === 'board'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                  title="Board View"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setActiveView('list')}
                  className={`p-2 rounded-md transition-all ${activeView === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                  title="List View"
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setActiveView('timeline')}
                  className={`p-2 rounded-md transition-all ${activeView === 'timeline'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                  title="Timeline View"
                >
                  <Calendar className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setActiveView('process')}
                  className={`p-2 rounded-md transition-all ${activeView === 'process'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                  title="Process View"
                >
                  <Clock className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">New Task</span>
              </button>
            </div>
          </div>

          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filters={filters}
            onFilterChange={setFilters}
            sort={sort}
            onSortChange={setSort}
            staff={staff}
          />
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </div>
            ) : filteredTasks.length === 0 ? (
              <EmptyState
                title="No tasks found"
                description={
                  searchQuery || filters.assigneeId || filters.priority
                    ? "Try adjusting your filters or search query to find what you're looking for."
                    : "Get started by creating your first task for this project."
                }
                icon={ClipboardList}
                action={
                  !searchQuery && !filters.assigneeId && !filters.priority
                    ? {
                      label: "Create Task",
                      onClick: () => setIsTaskModalOpen(true),
                    }
                    : undefined
                }
              />
            ) : (
              <>
                {activeView === 'board' && (
                  <TaskBoard
                    tasks={filteredTasks}
                    projects={projects}
                    selectedProjectId={selectedProjectId}
                    onUpdateStatus={handleUpdateStatus}
                    onUpdateTask={handleUpdateTask}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                    onAddSubtask={handleAddSubtask}
                    onRefresh={refreshData}
                  />
                )}

                {activeView === 'list' && (
                  <TaskListView
                    tasks={filteredTasks}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                    onAddSubtask={handleAddSubtask}
                    onUpdateStatus={handleUpdateStatus}
                    onRefresh={refreshData}
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
              </>
            )}
          </ErrorBoundary>
        </main>
      </div>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setParentTaskId(null);
          setEditingTask(null);
        }}
        onTaskSaved={refreshData}
        defaultProjectId={selectedProjectId === 'all' ? null : selectedProjectId}
        parentTaskId={parentTaskId}
        task={editingTask}
      />

      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onProjectCreated={refreshData}
      />

      <EditProjectModal
        isOpen={isEditProjectModalOpen}
        project={editingProject}
        onClose={() => {
          setIsEditProjectModalOpen(false);
          setEditingProject(null);
        }}
        onProjectUpdated={refreshData}
      />
    </div>
  );
}
