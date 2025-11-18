'use client';

import { useState, useEffect } from 'react';
import { Plus, Filter, Search, Calendar, User, MessageSquare, Link2, MoreHorizontal, RefreshCw, CheckCircle, AlertCircle, Clock, Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  completedAt?: string;
  googleChatSpaceId?: string;
  googleChatMessageId?: string;
  // Google Tasks sync fields
  googleTaskId?: string;
  googleTasksListId?: string;
  googleTasksUpdatedAt?: string;
  syncStatus?: 'PENDING' | 'SYNCED' | 'CONFLICT' | 'ERROR';
  syncDirection?: 'TO_GOOGLE' | 'FROM_GOOGLE' | 'BIDIRECTIONAL';
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignments: Array<{
    id: string;
    staffId: string;
    role: string;
    staff: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
  _count: {
    assignments: number;
    comments: number;
  };
}

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// Sync status component
const SyncStatusIndicator = ({ task, onSync }: { task: Task; onSync: () => void }) => {
  const getSyncIcon = () => {
    switch (task.syncStatus) {
      case 'SYNCED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'ERROR':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'CONFLICT':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSyncTooltip = () => {
    switch (task.syncStatus) {
      case 'SYNCED':
        return 'Synced with Google Tasks';
      case 'PENDING':
        return 'Sync pending';
      case 'ERROR':
        return 'Sync error occurred';
      case 'CONFLICT':
        return 'Sync conflict detected';
      default:
        return 'Not synced';
    }
  };

  const handleManualSync = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch('/api/tasks/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId: task.id }),
      });

      if (response.ok) {
        toast.success('Task synced successfully');
        // Refresh tasks list
        onSync();
      } else {
        toast.error('Failed to sync task');
      }
    } catch (error) {
      toast.error('Error syncing task');
    }
  };

  return (
    <div className="flex items-center space-x-2 group relative">
      <div className="flex items-center space-x-1" title={getSyncTooltip()}>
        {getSyncIcon()}
        {task.googleTaskId && (
          <Link2 className="w-3 h-3 text-blue-500" />
        )}
      </div>
      {task.syncStatus !== 'SYNCED' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleManualSync();
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          title="Manual sync"
        >
          <RefreshCw className="w-3 h-3 text-gray-500 hover:text-blue-500" />
        </button>
      )}
    </div>
  );
};

const statusColumns = [
  { id: 'TODO', title: 'To Do', color: 'bg-gray-100' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-50' },
  { id: 'IN_REVIEW', title: 'In Review', color: 'bg-yellow-50' },
  { id: 'COMPLETED', title: 'Completed', color: 'bg-green-50' },
  { id: 'CANCELLED', title: 'Cancelled', color: 'bg-red-50' },
];

const priorityColors = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

const priorityLabels = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export default function PlanningPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchStaff();
    fetchSyncStatus();
  }, [searchTerm, selectedPriority, selectedAssignee]);

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/tasks/sync/status');
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
    }
  };

  const handleGlobalSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/tasks/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direction: 'bidirectional' }),
      });

      if (response.ok) {
        toast.success('Global sync completed successfully');
        fetchTasks();
        fetchSyncStatus();
      } else {
        toast.error('Failed to complete global sync');
      }
    } catch (error) {
      toast.error('Error during global sync');
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedPriority) params.append('priority', selectedPriority);
      if (selectedAssignee) params.append('assignedTo', selectedAssignee);

      const response = await fetch(`/api/tasks?${params}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      
      const data = await response.json();
      setTasks(data.tasks);
    } catch (error) {
      toast.error('Failed to load tasks');
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/staff');
      if (!response.ok) throw new Error('Failed to fetch staff');
      
      const data = await response.json();
      setStaff(data.staff);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update task');

      const updatedTask = await response.json();
      setTasks(prev => prev.map(task => 
        task.id === taskId ? updatedTask.task : task
      ));
      
      toast.success('Task updated successfully');
    } catch (error) {
      toast.error('Failed to update task');
      console.error('Error updating task:', error);
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const getPriorityColor = (priority: string) => {
    return priorityColors[priority as keyof typeof priorityColors] || priorityColors.MEDIUM;
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'text-red-600';
    if (diffDays === 0) return 'text-orange-600';
    if (diffDays <= 3) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Task Planning</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Task
          </button>
        </div>

        {/* Google Tasks Sync Status */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">Google Tasks Sync</h3>
              </div>
              {syncStatus && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-gray-600">Synced: {syncStatus.SYNCED || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    <span className="text-gray-600">Pending: {syncStatus.PENDING || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-gray-600">Errors: {syncStatus.ERROR || 0}</span>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleGlobalSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Sync All Tasks
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Assignees</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.firstName} {member.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statusColumns.map((column) => (
          <div key={column.id} className={`${column.color} rounded-lg p-4`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{column.title}</h3>
              <span className="text-sm text-gray-600">
                {getTasksByStatus(column.id).length}
              </span>
            </div>

            <div className="space-y-3">
              {getTasksByStatus(column.id).map((task) => (
                <div
                  key={task.id}
                  className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedTask(task);
                    setShowTaskDetail(true);
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                      <SyncStatusIndicator task={task} onSync={() => { fetchTasks(); fetchSyncStatus(); }} />
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                      {priorityLabels[task.priority as keyof typeof priorityLabels]}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      {task.dueDate && (
                        <div className={`flex items-center gap-1 ${formatDueDate(task.dueDate)}`}>
                          <Calendar className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {task._count.assignments > 0 && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {task._count.assignments}
                        </div>
                      )}
                      {task._count.comments > 0 && (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {task._count.comments}
                        </div>
                      )}
                      {task.googleChatSpaceId && (
                        <Link2 className="w-3 h-3 text-blue-600" />
                      )}
                    </div>
                  </div>

                  {task.assignments.length > 0 && (
                    <div className="mt-3 flex -space-x-2">
                      {task.assignments.slice(0, 3).map((assignment) => (
                        <div
                          key={assignment.staffId}
                          className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center border-2 border-white"
                          title={`${assignment.staff.firstName} ${assignment.staff.lastName}`}
                        >
                          {assignment.staff.firstName.charAt(0)}{assignment.staff.lastName.charAt(0)}
                        </div>
                      ))}
                      {task.assignments.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-gray-500 text-white text-xs flex items-center justify-center border-2 border-white">
                          +{task.assignments.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Task Detail Modal */}
      {showTaskDetail && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedTask.title}</h2>
                <button
                  onClick={() => setShowTaskDetail(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <MoreHorizontal className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${getPriorityColor(selectedTask.priority)}`}>
                    {priorityLabels[selectedTask.priority as keyof typeof priorityLabels]}
                  </span>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => handleStatusChange(selectedTask.id, e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                  >
                    {statusColumns.map((col) => (
                      <option key={col.id} value={col.id}>{col.title}</option>
                    ))}
                  </select>
                </div>

                {selectedTask.description && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-600">{selectedTask.description}</p>
                  </div>
                )}

                {selectedTask.dueDate && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Due Date</h3>
                    <p className={`text-gray-600 ${formatDueDate(selectedTask.dueDate)}`}>
                      {new Date(selectedTask.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {selectedTask.assignments.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Assigned To</h3>
                    <div className="space-y-2">
                      {selectedTask.assignments.map((assignment) => (
                        <div key={assignment.id} className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center">
                            {assignment.staff.firstName.charAt(0)}{assignment.staff.lastName.charAt(0)}
                          </div>
                          <span className="text-gray-600">
                            {assignment.staff.firstName} {assignment.staff.lastName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTask.googleChatSpaceId && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Google Chat Integration</h3>
                    <a
                      href={`https://chat.google.com/room/${selectedTask.googleChatSpaceId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
                    >
                      <Link2 className="w-4 h-4" />
                      Open in Google Chat
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTaskCreated={fetchTasks}
      />
    </div>
  );
}
