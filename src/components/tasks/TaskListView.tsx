'use client';

import { useState } from 'react';
import {
    ChevronRight,
    ChevronDown,
    Plus,
    Edit,
    Trash,
    Calendar,
    User,
    MoreVertical,
    ArrowRight,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

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
    assignments?: {
        staff: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
        };
    }[];
    subtasks?: Task[];
}

interface TaskListViewProps {
    tasks: Task[];
    onEditTask: (task: Task) => void;
    onDeleteTask: (id: string) => void;
    onAddSubtask: (parentId: string) => void;
    onUpdateStatus: (id: string, status: Task['status']) => void;
}

const priorityColors = {
    LOW: 'bg-slate-100 text-slate-700 border-slate-300',
    MEDIUM: 'bg-blue-100 text-blue-700 border-blue-300',
    HIGH: 'bg-amber-100 text-amber-700 border-amber-300',
    URGENT: 'bg-red-100 text-red-700 border-red-300',
};

const statusColors = {
    TODO: 'bg-slate-100 text-slate-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    IN_REVIEW: 'bg-amber-100 text-amber-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-gray-100 text-gray-700',
};

const statusOptions: { value: Task['status']; label: string }[] = [
    { value: 'TODO', label: 'To Do' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'IN_REVIEW', label: 'Review' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
];

export default function TaskListView({
    tasks,
    onEditTask,
    onDeleteTask,
    onAddSubtask,
    onUpdateStatus,
}: TaskListViewProps) {
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
    const [sortBy, setSortBy] = useState<'none' | 'priority' | 'dueDate' | 'status'>('none');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    // Only show top-level tasks
    const topLevelTasks = tasks.filter((t) => !t.parentTaskId);

    const toggleExpand = (taskId: string) => {
        const newExpanded = new Set(expandedTasks);
        if (newExpanded.has(taskId)) {
            newExpanded.delete(taskId);
        } else {
            newExpanded.add(taskId);
        }
        setExpandedTasks(newExpanded);
    };

    const sortTasks = (tasksToSort: Task[]) => {
        const sorted = [...tasksToSort];
        switch (sortBy) {
            case 'priority':
                return sorted.sort((a, b) => {
                    const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                });
            case 'dueDate':
                return sorted.sort((a, b) => {
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                });
            case 'status':
                return sorted.sort((a, b) => a.status.localeCompare(b.status));
            default:
                return sorted;
        }
    };

    const sortedTopLevelTasks = sortTasks(topLevelTasks);

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(new Date(dateString));
    };

    const renderTaskRow = (task: Task, depth: number = 0) => {
        const subtasks = task.subtasks || tasks.filter((t) => t.parentTaskId === task.id);
        const hasSubtasks = subtasks.length > 0;
        const isExpanded = expandedTasks.has(task.id);
        const completedSubtasks = subtasks.filter((t) => t.status === 'COMPLETED').length;
        const assignees = task.assignments?.map((a) => a.staff) || [];

        return (
            <div key={task.id}>
                <div
                    className={`grid grid-cols-12 gap-4 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors group ${depth > 0 ? 'bg-gray-50/50' : ''
                        }`}
                >
                    {/* Task Name & Hierarchy */}
                    <div
                        className="col-span-4 flex items-center gap-2"
                        style={{ paddingLeft: `${depth * 24}px` }}
                    >
                        {hasSubtasks ? (
                            <button
                                onClick={() => toggleExpand(task.id)}
                                className="hover:bg-gray-200 rounded p-1 transition-colors flex-shrink-0"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-gray-600" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-600" />
                                )}
                            </button>
                        ) : (
                            <div className="w-6 h-6" />
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-gray-900 truncate font-medium">{task.title}</span>
                                {hasSubtasks && (
                                    <span className="text-xs px-1.5 py-0.5 rounded border border-gray-300 text-gray-600">
                                        {completedSubtasks}/{subtasks.length}
                                    </span>
                                )}
                            </div>
                            {task.description && (
                                <p className="text-xs text-gray-600 truncate">
                                    {task.description}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Status */}
                    <div className="col-span-2 flex items-center">
                        <select
                            value={task.status}
                            onChange={(e) => onUpdateStatus(task.id, e.target.value as Task['status'])}
                            className={`h-8 text-xs rounded border-0 px-2 py-1 font-medium cursor-pointer focus:ring-2 focus:ring-blue-500 ${statusColors[task.status]}`}
                        >
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Priority */}
                    <div className="col-span-1 flex items-center">
                        <span className={`text-xs px-2 py-1 rounded-md border font-medium ${priorityColors[task.priority]}`}>
                            {task.priority}
                        </span>
                    </div>

                    {/* Assignee */}
                    <div className="col-span-2 flex items-center gap-1.5 text-sm text-gray-700">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                        <div className="flex -space-x-2">
                            {assignees.length > 0 ? (
                                assignees.slice(0, 2).map((assignee) => (
                                    <div
                                        key={assignee.id}
                                        className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center border-2 border-white font-medium"
                                        title={`${assignee.firstName} ${assignee.lastName}`}
                                    >
                                        {assignee.firstName.charAt(0)}
                                        {assignee.lastName.charAt(0)}
                                    </div>
                                ))
                            ) : (
                                <span className="text-xs text-gray-400">Unassigned</span>
                            )}
                            {assignees.length > 2 && (
                                <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 text-xs flex items-center justify-center border-2 border-white font-medium">
                                    +{assignees.length - 2}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Due Date */}
                    <div className="col-span-2 flex items-center gap-1.5 text-sm text-gray-700">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        <span className="truncate text-xs">{formatDate(task.dueDate)}</span>
                    </div>

                    {/* Progress */}
                    <div className="col-span-1 flex items-center justify-end">
                        <div className="w-full max-w-[80px]">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-gray-600 ml-auto">
                                    {task.progress}%
                                </span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-600 transition-all"
                                    style={{ width: `${task.progress}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-end relative">
                        <button
                            onClick={() => setActiveMenu(activeMenu === task.id ? null : task.id)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>

                        {activeMenu === task.id && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setActiveMenu(null)}
                                />
                                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
                                    <button
                                        onClick={() => {
                                            onEditTask(task);
                                            setActiveMenu(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Edit Task
                                    </button>
                                    <button
                                        onClick={() => {
                                            onAddSubtask(task.id);
                                            setActiveMenu(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Subtask
                                    </button>
                                    <div className="border-t border-gray-200 my-1" />
                                    <button
                                        onClick={() => {
                                            if (confirm('Are you sure you want to delete this task?')) {
                                                onDeleteTask(task.id);
                                            }
                                            setActiveMenu(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                                    >
                                        <Trash className="w-4 h-4" />
                                        Delete Task
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Render subtasks if expanded */}
                {isExpanded &&
                    subtasks.map((subtask) => renderTaskRow(subtask, depth + 1))}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Task List</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Detailed view with subtask management
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Sort by:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="none">Default</option>
                            <option value="priority">Priority</option>
                            <option value="dueDate">Due Date</option>
                            <option value="status">Status</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200">
                <div className="col-span-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Task Name</div>
                <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</div>
                <div className="col-span-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</div>
                <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignee</div>
                <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</div>
                <div className="col-span-1 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Progress</div>
                <div className="col-span-1" />
            </div>

            {/* Task Rows */}
            <div className="overflow-x-auto min-h-[400px]">
                {sortedTopLevelTasks.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No tasks found. Create your first task to get started!
                    </div>
                ) : (
                    <div>
                        {sortedTopLevelTasks.map((task) => renderTaskRow(task))}
                    </div>
                )}
            </div>

            {/* Summary Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-6">
                        <span className="text-gray-600">
                            <span className="font-semibold text-gray-900">
                                {topLevelTasks.length}
                            </span>{' '}
                            main tasks
                        </span>
                        <span className="text-gray-600">
                            <span className="font-semibold text-gray-900">
                                {tasks.filter((t) => t.parentTaskId).length}
                            </span>{' '}
                            subtasks
                        </span>
                        <span className="text-gray-600">
                            <span className="font-semibold text-gray-900">
                                {tasks.filter((t) => t.status === 'COMPLETED').length}
                            </span>{' '}
                            completed
                        </span>
                    </div>
                    <div className="text-gray-600">
                        Overall progress:{' '}
                        <span className="font-semibold text-gray-900">
                            {tasks.length > 0
                                ? Math.round(
                                    tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length
                                )
                                : 0}
                            %
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
