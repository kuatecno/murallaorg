'use client';

import { useState } from 'react';
import {
    MoreVertical,
    Edit,
    Trash,
    ArrowRight,
    Calendar,
    User,
    Plus,
    CheckSquare,
    Clock,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import SubtaskBadge from './SubtaskBadge';

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

interface TaskCardProps {
    task: Task;
    allTasks: Task[];
    projects: Project[];
    showProjectBadge?: boolean;
    onUpdateStatus: (id: string, status: Task['status']) => void;
    onEdit: (task: Task) => void;
    onDelete: (id: string) => void;
    onAddSubtask: (parentId: string) => void;
    onRefresh: () => void;
}

const priorityColors = {
    LOW: 'bg-slate-100 text-slate-700 border-slate-300',
    MEDIUM: 'bg-blue-100 text-blue-700 border-blue-300',
    HIGH: 'bg-amber-100 text-amber-700 border-amber-300',
    URGENT: 'bg-red-100 text-red-700 border-red-300',
};

const statusOptions: {
    value: Task['status'];
    label: string;
}[] = [
        { value: 'TODO', label: 'To Do' },
        { value: 'IN_PROGRESS', label: 'In Progress' },
        { value: 'IN_REVIEW', label: 'Review' },
        { value: 'COMPLETED', label: 'Completed' },
    ];

export default function TaskCard({
    task,
    allTasks,
    projects,
    showProjectBadge = false,
    onUpdateStatus,
    onEdit,
    onDelete,
    onAddSubtask,
    onRefresh,
}: TaskCardProps) {
    const [showSubtasks, setShowSubtasks] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const subtasks = task.subtasks || allTasks.filter((t) => t.parentTaskId === task.id);
    const completedSubtasks = subtasks.filter((t) => t.status === 'COMPLETED').length;
    const project = task.project || projects.find((p) => p.id === task.projectId);

    // Calculate aggregated progress from subtasks
    const aggregatedProgress = subtasks.length > 0
        ? Math.round(subtasks.reduce((sum, st) => sum + st.progress, 0) / subtasks.length)
        : task.progress;

    // Check if parent progress is out of sync with subtasks
    const isProgressOutOfSync = subtasks.length > 0 && Math.abs(task.progress - aggregatedProgress) > 5;

    const formatDate = (date: string) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
        }).format(new Date(date));
    };

    const handleStatusChange = async (newStatus: Task['status']) => {
        try {
            await onUpdateStatus(task.id, newStatus);
            toast.success('Task status updated');
            setShowMenu(false);
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this task?')) {
            try {
                await onDelete(task.id);
                toast.success('Task deleted');
            } catch (error) {
                toast.error('Failed to delete task');
            }
        }
        setShowMenu(false);
    };

    const assignees = task.assignments?.map((a) => a.staff) || [];

    return (
        <div className="p-4 bg-white hover:shadow-lg transition-all duration-200 border border-gray-200 rounded-lg group relative">
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 flex-1 leading-snug">
                        {task.title}
                    </h4>
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                        >
                            <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[160px]">
                                <button
                                    onClick={() => {
                                        onEdit(task);
                                        setShowMenu(false);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit Task
                                </button>
                                <button
                                    onClick={() => {
                                        onAddSubtask(task.id);
                                        setShowMenu(false);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Subtask
                                </button>
                                {isProgressOutOfSync && (
                                    <button
                                        onClick={async () => {
                                            try {
                                                await fetch(`/api/tasks/${task.id}/progress`, {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ progress: aggregatedProgress }),
                                                });
                                                toast.success('Progress synced with subtasks');
                                                onRefresh();
                                                setShowMenu(false);
                                            } catch (error) {
                                                toast.error('Failed to sync progress');
                                            }
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-blue-600"
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                        Sync Progress ({aggregatedProgress}%)
                                    </button>
                                )}
                                <div className="border-t border-gray-200 my-1" />
                                {statusOptions
                                    .filter((s) => s.value !== task.status)
                                    .map((status) => (
                                        <button
                                            key={status.value}
                                            onClick={() => handleStatusChange(status.value)}
                                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                        >
                                            <ArrowRight className="w-4 h-4" />
                                            Move to {status.label}
                                        </button>
                                    ))}
                                <div className="border-t border-gray-200 my-1" />
                                <button
                                    onClick={handleDelete}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                                >
                                    <Trash className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {task.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                        {task.description}
                    </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                    <span
                        className={`text-xs px-2 py-1 rounded-md border font-medium ${priorityColors[task.priority]
                            }`}
                    >
                        {task.priority}
                    </span>
                    {showProjectBadge && project && (
                        <span className="text-xs px-2 py-1 rounded-md border border-gray-300 text-gray-700 flex items-center gap-1">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: project.color }}
                            />
                            {project.name}
                        </span>
                    )}
                    {subtasks.length > 0 && (
                        <button
                            onClick={() => setShowSubtasks(!showSubtasks)}
                            className="hover:scale-105 transition-transform"
                        >
                            <SubtaskBadge
                                completedCount={completedSubtasks}
                                totalCount={subtasks.length}
                                size="sm"
                            />
                        </button>
                    )}
                </div>

                {showSubtasks && subtasks.length > 0 && (
                    <div className="pl-3 border-l-2 border-gray-200 space-y-2">
                        {subtasks.map((subtask) => (
                            <div
                                key={subtask.id}
                                className="text-sm cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                                onClick={() => onEdit(subtask)}
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`w-2 h-2 rounded-full ${subtask.status === 'COMPLETED'
                                            ? 'bg-emerald-500'
                                            : 'bg-gray-300'
                                            }`}
                                    />
                                    <span
                                        className={
                                            subtask.status === 'COMPLETED'
                                                ? 'line-through text-gray-500 text-xs'
                                                : 'text-gray-700 text-xs'
                                        }
                                    >
                                        {subtask.title}
                                    </span>
                                    <span className="ml-auto text-xs text-gray-500">
                                        {subtask.progress}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Progress</span>
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{task.progress}%</span>
                            {isProgressOutOfSync && (
                                <span
                                    className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300"
                                    title={`Subtasks average: ${aggregatedProgress}%`}
                                >
                                    ≈{aggregatedProgress}%
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 transition-all"
                            style={{ width: `${task.progress}%` }}
                        />
                    </div>
                    {isProgressOutOfSync && (
                        <div className="text-xs text-amber-600 flex items-center gap-1">
                            <span className="font-medium">⚠</span>
                            <span>Progress differs from subtasks average ({aggregatedProgress}%)</span>
                        </div>
                    )}
                </div>

                {(task.startDate || task.dueDate) && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {task.startDate && formatDate(task.startDate)}
                        {task.startDate && task.dueDate && ' - '}
                        {task.dueDate && formatDate(task.dueDate)}
                    </div>
                )}

                {task.estimatedHours && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        {task.estimatedHours}h estimated
                    </div>
                )}

                {assignees.length > 0 && (
                    <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                        <div className="flex -space-x-2">
                            {assignees.slice(0, 3).map((assignee) => (
                                <div
                                    key={assignee.id}
                                    className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center border-2 border-white font-medium"
                                    title={`${assignee.firstName} ${assignee.lastName}`}
                                >
                                    {assignee.firstName.charAt(0)}
                                    {assignee.lastName.charAt(0)}
                                </div>
                            ))}
                            {assignees.length > 3 && (
                                <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 text-xs flex items-center justify-center border-2 border-white font-medium">
                                    +{assignees.length - 3}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Click outside handler */}
            {showMenu && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setShowMenu(false)}
                />
            )}
        </div>
    );
}
