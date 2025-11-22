'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
    X,
    Check,
    Users,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';

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
}

interface TaskListViewProps {
    tasks: Task[];
    onEditTask: (task: Task) => void;
    onDeleteTask: (id: string) => void;
    onAddSubtask: (parentId: string) => void;
    onUpdateStatus: (id: string, status: Task['status']) => void;
    onRefresh: () => void;
    defaultProjectId?: string | null;
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

const priorityOptions: { value: Task['priority']; label: string }[] = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TaskListView({
    tasks,
    onEditTask,
    onDeleteTask,
    onAddSubtask,
    onUpdateStatus,
    onRefresh,
    defaultProjectId,
}: TaskListViewProps) {
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
    const [sortBy, setSortBy] = useState<'none' | 'priority' | 'dueDate' | 'status'>('none');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [updatingProgress, setUpdatingProgress] = useState<string | null>(null);
    
    // Inline editing states
    const [editingField, setEditingField] = useState<{ taskId: string; field: string } | null>(null);
    const [editValues, setEditValues] = useState<Record<string, any>>({});
    const [savingFields, setSavingFields] = useState<Set<string>>(new Set());
    
    // Debounced save for auto-save fields
    const debouncedSave = useRef<Record<string, NodeJS.Timeout>>({});
    
    // Quick add states
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickAddTask, setQuickAddTask] = useState({
        title: '',
        description: '',
        priority: 'MEDIUM' as Task['priority'],
        dueDate: '',
        assignedStaff: [] as string[],
    });
    
    // Staff data for assignment
    const { data: staffData } = useSWR('/api/staff', fetcher);
    const staff = useMemo(() => (
        (Array.isArray(staffData)
            ? staffData
            : staffData?.data || staffData?.staff || []) as { id: string; firstName: string; lastName: string }[]
    ), [staffData]);
    
    // Refs for inline editing
    const titleInputRef = useRef<HTMLInputElement>(null);
    const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

    const handleProgressUpdate = async (taskId: string, newProgress: number) => {
        setUpdatingProgress(taskId);
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ progress: newProgress }),
            });

            if (!response.ok) throw new Error('Failed to update progress');

            toast.success('Progress updated');
            onRefresh();
        } catch (error) {
            toast.error('Failed to update progress');
            console.error('Error updating progress:', error);
        } finally {
            setUpdatingProgress(null);
        }
    };
    
    const startEditing = (taskId: string, field: string, currentValue: any) => {
        setEditingField({ taskId, field });
        setEditValues({ ...editValues, [`${taskId}-${field}`]: currentValue });
        
        // Focus the appropriate input
        setTimeout(() => {
            if (field === 'title' && titleInputRef.current) {
                titleInputRef.current.focus();
                titleInputRef.current.select();
            } else if (field === 'description' && descriptionInputRef.current) {
                descriptionInputRef.current.focus();
                descriptionInputRef.current.select();
            }
        }, 0);
    };
    
    const cancelEditing = () => {
        setEditingField(null);
        setEditValues({});
    };
    
    const saveField = async (taskId: string, field: string, value?: any) => {
        const fieldValue = value !== undefined ? value : editValues[`${taskId}-${field}`];
        const fieldKey = `${taskId}-${field}`;
        
        // Clear any existing debounce timer
        if (debouncedSave.current[fieldKey]) {
            clearTimeout(debouncedSave.current[fieldKey]);
        }
        
        // For auto-save fields (priority, dueDate), use debouncing
        const autoSaveFields = ['priority', 'dueDate'];
        if (autoSaveFields.includes(field) && value !== undefined) {
            debouncedSave.current[fieldKey] = setTimeout(async () => {
                setSavingFields(prev => new Set(prev).add(fieldKey));
                
                try {
                    const response = await fetch(`/api/tasks/${taskId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ [field]: fieldValue }),
                    });

                    if (!response.ok) throw new Error(`Failed to update ${field}`);

                    toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
                    onRefresh();
                } catch (error) {
                    toast.error(`Failed to update ${field}`);
                    console.error(`Error updating ${field}:`, error);
                } finally {
                    setSavingFields(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(fieldKey);
                        return newSet;
                    });
                }
            }, 500);
            return;
        }
        
        // For manual save fields (title, description, assignedStaff)
        setSavingFields(prev => new Set(prev).add(fieldKey));
        
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: fieldValue }),
            });

            if (!response.ok) throw new Error(`Failed to update ${field}`);

            toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
            onRefresh();
            cancelEditing();
        } catch (error) {
            toast.error(`Failed to update ${field}`);
            console.error(`Error updating ${field}:`, error);
        } finally {
            setSavingFields(prev => {
                const newSet = new Set(prev);
                newSet.delete(fieldKey);
                return newSet;
            });
        }
    };
    
    const handleQuickAdd = async () => {
        if (!quickAddTask.title.trim()) {
            toast.error('Task title is required');
            return;
        }
        
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: quickAddTask.title.trim(),
                    description: quickAddTask.description.trim() || undefined,
                    priority: quickAddTask.priority,
                    dueDate: quickAddTask.dueDate || undefined,
                    projectId: defaultProjectId || undefined,
                    assignedStaff: quickAddTask.assignedStaff,
                }),
            });

            if (!response.ok) throw new Error('Failed to create task');

            toast.success('Task created successfully!');
            setQuickAddTask({
                title: '',
                description: '',
                priority: 'MEDIUM',
                dueDate: '',
                assignedStaff: [],
            });
            setShowQuickAdd(false);
            onRefresh();
        } catch (error) {
            toast.error('Failed to create task');
            console.error('Error creating task:', error);
        }
    };
    
    const updateTaskAssignment = async (taskId: string, staffIds: string[]) => {
        const fieldKey = `${taskId}-assignedStaff`;
        setSavingFields(prev => new Set(prev).add(fieldKey));
        
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignedStaff: staffIds }),
            });

            if (!response.ok) throw new Error('Failed to update assignments');

            toast.success('Assignments updated');
            onRefresh();
            cancelEditing();
        } catch (error) {
            toast.error('Failed to update assignments');
            console.error('Error updating assignments:', error);
        } finally {
            setSavingFields(prev => {
                const newSet = new Set(prev);
                newSet.delete(fieldKey);
                return newSet;
            });
        }
    };

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

    const renderTaskRow = useCallback((task: Task, depth: number = 0) => {
        const subtasks = task.subtasks || tasks.filter((t) => t.parentTaskId === task.id);
        const hasSubtasks = subtasks.length > 0;
        const isExpanded = expandedTasks.has(task.id);
        const completedSubtasks = subtasks.filter((t) => t.status === 'COMPLETED').length;
        const assignees = task.assignments?.map((a) => a.staff) || [];
        const isEditingField = (field: string) => editingField?.taskId === task.id && editingField?.field === field;
        const getEditValue = (field: string) => editValues[`${task.id}-${field}`] || task[field as keyof Task];
        const isSavingField = (field: string) => savingFields.has(`${task.id}-${field}`);

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
                            {isEditingField('title') ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={titleInputRef}
                                        type="text"
                                        value={getEditValue('title')}
                                        onChange={(e) => setEditValues({ ...editValues, [`${task.id}-title`]: e.target.value })}
                                        onBlur={() => saveField(task.id, 'title')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveField(task.id, 'title');
                                            if (e.key === 'Escape') cancelEditing();
                                        }}
                                        disabled={isSavingField('title')}
                                        className={`flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            isSavingField('title') 
                                                ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
                                                : 'border-blue-300'
                                        }`}
                                    />
                                    <button
                                        onClick={() => saveField(task.id, 'title')}
                                        disabled={isSavingField('title')}
                                        className={`p-1 rounded ${
                                            isSavingField('title')
                                                ? 'text-gray-400 cursor-not-allowed'
                                                : 'text-green-600 hover:text-green-700'
                                        }`}
                                    >
                                        {isSavingField('title') ? (
                                            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                                        ) : (
                                            <Check className="w-4 h-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={cancelEditing}
                                        disabled={isSavingField('title')}
                                        className={`p-1 rounded ${
                                            isSavingField('title')
                                                ? 'text-gray-400 cursor-not-allowed'
                                                : 'text-red-600 hover:text-red-700'
                                        }`}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 mb-1">
                                    <span 
                                        onClick={() => startEditing(task.id, 'title', task.title)}
                                        className="text-gray-900 truncate font-medium cursor-pointer hover:text-blue-600 hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
                                    >
                                        {task.title}
                                    </span>
                                    {hasSubtasks && (
                                        <span className="text-xs px-1.5 py-0.5 rounded border border-gray-300 text-gray-600">
                                            {completedSubtasks}/{subtasks.length}
                                        </span>
                                    )}
                                </div>
                            )}
                            {isEditingField('description') ? (
                                <div className="flex items-start gap-2 mt-1">
                                    <textarea
                                        ref={descriptionInputRef}
                                        value={getEditValue('description') || ''}
                                        onChange={(e) => setEditValues({ ...editValues, [`${task.id}-description`]: e.target.value })}
                                        onBlur={() => saveField(task.id, 'description')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') cancelEditing();
                                        }}
                                        className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        rows={2}
                                    />
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => saveField(task.id, 'description')}
                                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                                        >
                                            <Check className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={cancelEditing}
                                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                task.description && (
                                    <p 
                                        onClick={() => startEditing(task.id, 'description', task.description)}
                                        className="text-xs text-gray-600 truncate cursor-pointer hover:text-blue-600 hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
                                    >
                                        {task.description}
                                    </p>
                                )
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
                        {isEditingField('priority') ? (
                            <select
                                value={getEditValue('priority')}
                                onChange={(e) => {
                                    setEditValues({ ...editValues, [`${task.id}-priority`]: e.target.value });
                                    saveField(task.id, 'priority', e.target.value);
                                }}
                                disabled={isSavingField('priority')}
                                className={`text-xs px-2 py-1 rounded-md border font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    isSavingField('priority')
                                        ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                                        : 'border-blue-300'
                                }`}
                            >
                                {priorityOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <span 
                                onClick={() => startEditing(task.id, 'priority', task.priority)}
                                className={`text-xs px-2 py-1 rounded-md border font-medium cursor-pointer hover:opacity-80 transition-opacity ${priorityColors[task.priority]}`}
                            >
                                {task.priority}
                            </span>
                        )}
                    </div>

                    {/* Assignee */}
                    <div className="col-span-2 flex items-center gap-1.5 text-sm text-gray-700 relative">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                        {isEditingField('assignedStaff') ? (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[280px]">
                                <div className="mb-2">
                                    <label className="text-xs font-medium text-gray-700 mb-1 block">Assign Staff:</label>
                                    <select
                                        multiple
                                        value={getEditValue('assignedStaff') || []}
                                        onChange={(e) => {
                                            const selected = Array.from(e.target.selectedOptions, option => option.value);
                                            setEditValues({ ...editValues, [`${task.id}-assignedStaff`]: selected });
                                        }}
                                        disabled={isSavingField('assignedStaff')}
                                        className={`w-full text-xs px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            isSavingField('assignedStaff')
                                                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                                                : 'border-blue-300'
                                        }`}
                                        size={Math.min(6, Math.max(3, staff.length))}
                                    >
                                        {staff.map((member) => (
                                            <option key={member.id} value={member.id}>
                                                {member.firstName} {member.lastName}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={cancelEditing}
                                        disabled={isSavingField('assignedStaff')}
                                        className={`px-2 py-1 text-xs rounded ${
                                            isSavingField('assignedStaff')
                                                ? 'text-gray-400 cursor-not-allowed'
                                                : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => updateTaskAssignment(task.id, getEditValue('assignedStaff') || [])}
                                        disabled={isSavingField('assignedStaff')}
                                        className={`px-2 py-1 text-xs rounded ${
                                            isSavingField('assignedStaff')
                                                ? 'text-gray-400 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                    >
                                        {isSavingField('assignedStaff') ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div 
                                onClick={() => startEditing(task.id, 'assignedStaff', assignees.map(a => a.id))}
                                className="flex -space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                            >
                                {assignees.length > 0 ? (
                                    <>
                                        {assignees.slice(0, 2).map((assignee) => (
                                            <div
                                                key={assignee.id}
                                                className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center border-2 border-white font-medium"
                                                title={`${assignee.firstName} ${assignee.lastName}`}
                                            >
                                                {assignee.firstName.charAt(0)}
                                                {assignee.lastName.charAt(0)}
                                            </div>
                                        ))}
                                        {assignees.length > 2 && (
                                            <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 text-xs flex items-center justify-center border-2 border-white font-medium">
                                                +{assignees.length - 2}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-xs text-gray-400 hover:text-blue-600">Click to assign</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Due Date */}
                    <div className="col-span-2 flex items-center gap-1.5 text-sm text-gray-700">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        {isEditingField('dueDate') ? (
                            <input
                                type="date"
                                value={getEditValue('dueDate') || ''}
                                onChange={(e) => {
                                    setEditValues({ ...editValues, [`${task.id}-dueDate`]: e.target.value });
                                    saveField(task.id, 'dueDate', e.target.value);
                                }}
                                disabled={isSavingField('dueDate')}
                                className={`text-xs px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    isSavingField('dueDate')
                                        ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                                        : 'border-blue-300'
                                }`}
                            />
                        ) : (
                            <span 
                                onClick={() => startEditing(task.id, 'dueDate', task.dueDate)}
                                className="truncate text-xs cursor-pointer hover:text-blue-600 hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
                            >
                                {formatDate(task.dueDate)}
                            </span>
                        )}
                    </div>

                    {/* Progress */}
                    <div className="col-span-1 flex items-center justify-end">
                        <div className="w-full max-w-[120px] group">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-gray-600 ml-auto">
                                    {task.progress}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={task.progress}
                                onChange={(e) => handleProgressUpdate(task.id, parseInt(e.target.value))}
                                disabled={updatingProgress === task.id}
                                className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer disabled:opacity-50 
                                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 
                                [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:opacity-0 
                                [&::-webkit-slider-thumb]:group-hover:opacity-100 [&::-webkit-slider-thumb]:transition-opacity
                                [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full 
                                [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-0 
                                [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:opacity-0 
                                [&::-moz-range-thumb]:group-hover:opacity-100 [&::-moz-range-thumb]:transition-opacity"
                                style={{
                                    background: `linear-gradient(to right, #2563eb 0%, #2563eb ${task.progress}%, #e5e7eb ${task.progress}%, #e5e7eb 100%)`
                                }}
                                title={`Drag to update progress (${task.progress}%)`}
                            />
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
    }, [tasks, editingField, editValues, savingFields, expandedTasks, onUpdateStatus, startEditing, saveField, updateTaskAssignment, cancelEditing]);

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Task List</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Detailed view with inline editing and quick task creation
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowQuickAdd(!showQuickAdd)}
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Quick Add Task
                        </button>
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
            </div>

            {/* Quick Add Row */}
            {showQuickAdd && (
                <div className="grid grid-cols-12 gap-4 p-4 bg-blue-50 border-b-2 border-blue-200">
                    {/* Task Title */}
                    <div className="col-span-4">
                        <input
                            type="text"
                            placeholder="Task title..."
                            value={quickAddTask.title}
                            onChange={(e) => setQuickAddTask({ ...quickAddTask, title: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                        <select
                            value="TODO"
                            disabled
                            className="w-full h-8 text-xs rounded border-0 px-2 py-1 font-medium bg-gray-100 text-gray-500 cursor-not-allowed"
                        >
                            <option value="TODO">To Do</option>
                        </select>
                    </div>

                    {/* Priority */}
                    <div className="col-span-1">
                        <select
                            value={quickAddTask.priority}
                            onChange={(e) => setQuickAddTask({ ...quickAddTask, priority: e.target.value as Task['priority'] })}
                            className="w-full text-xs px-2 py-1 rounded-md border font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {priorityOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Assignee */}
                    <div className="col-span-2 relative">
                        <select
                            multiple
                            value={quickAddTask.assignedStaff}
                            onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, option => option.value);
                                setQuickAddTask({ ...quickAddTask, assignedStaff: selected });
                            }}
                            className="w-full text-xs px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            size={Math.min(4, Math.max(2, staff.length))}
                        >
                            {staff.map((member) => (
                                <option key={member.id} value={member.id}>
                                    {member.firstName} {member.lastName}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                    </div>

                    {/* Due Date */}
                    <div className="col-span-2">
                        <input
                            type="date"
                            value={quickAddTask.dueDate}
                            onChange={(e) => setQuickAddTask({ ...quickAddTask, dueDate: e.target.value })}
                            className="w-full text-xs px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-end gap-1">
                        <button
                            onClick={handleQuickAdd}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Create task"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => {
                                setShowQuickAdd(false);
                                setQuickAddTask({
                                    title: '',
                                    description: '',
                                    priority: 'MEDIUM',
                                    dueDate: '',
                                    assignedStaff: [],
                                });
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Cancel"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

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
