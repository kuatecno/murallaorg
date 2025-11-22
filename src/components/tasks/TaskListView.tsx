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
    ChevronLeft,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from 'date-fns';

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

// Calendar Picker Component
interface CalendarPickerProps {
    selectedDate: Date | null;
    onSelect: (date: Date) => void;
    onClose: () => void;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({ selectedDate, onSelect, onClose }) => {
    const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
    
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    
    const handleDateSelect = (date: Date) => {
        onSelect(date);
        onClose();
    };
    
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 min-w-[280px]"
        >
            <div className="flex items-center justify-between mb-3">
                <button
                    onClick={handlePrevMonth}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <div className="text-sm font-semibold text-gray-900">
                    {format(currentMonth, 'MMMM yyyy')}
                </div>
                <button
                    onClick={handleNextMonth}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                        {day}
                    </div>
                ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
                {days.map((day, idx) => {
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isCurrentDay = isToday(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    
                    return (
                        <button
                            key={idx}
                            onClick={() => handleDateSelect(day)}
                            className={`
                                p-2 text-sm rounded-lg transition-all hover:bg-blue-50
                                ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                                ${isCurrentDay && !isSelected ? 'bg-blue-100 text-blue-600 font-semibold' : ''}
                                ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                            `}
                        >
                            {format(day, 'd')}
                        </button>
                    );
                })}
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                <button
                    onClick={onClose}
                    className="flex-1 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={() => handleDateSelect(new Date())}
                    className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium"
                >
                    Today
                </button>
            </div>
        </motion.div>
    );
};

// Edit Popover Component
interface EditPopoverProps {
    title: string;
    value: string;
    onSave: (value: string) => void;
    onClose: () => void;
    isLoading?: boolean;
    multiline?: boolean;
    position?: 'left' | 'right' | 'center';
}

const EditPopover: React.FC<EditPopoverProps> = ({ 
    title, 
    value, 
    onSave, 
    onClose, 
    isLoading = false,
    multiline = false,
    position = 'left'
}) => {
    const [editValue, setEditValue] = useState(value);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    
    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);
    
    const handleSave = () => {
        if (editValue.trim()) {
            onSave(editValue);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) {
            e.preventDefault();
            handleSave();
        }
        if (e.key === 'Escape') {
            onClose();
        }
    };
    
    const positionClasses = {
        left: 'left-0',
        right: 'right-0',
        center: 'left-1/2 -translate-x-1/2'
    };
    
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute z-50 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 min-w-[320px] ${positionClasses[position]}`}
        >
            <div className="text-xs font-semibold text-gray-700 mb-2">{title}</div>
            {multiline ? (
                <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                />
            ) : (
                <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            )}
            <div className="flex gap-2 mt-3">
                <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={isLoading || !editValue.trim()}
                    className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving...
                        </>
                    ) : (
                        'Save'
                    )}
                </button>
            </div>
        </motion.div>
    );
};

// Staff Assignment Popover Component
interface StaffAssignmentPopoverProps {
    staff: { id: string; firstName: string; lastName: string }[];
    selectedIds: string[];
    onSave: (ids: string[]) => void;
    onClose: () => void;
    isLoading?: boolean;
}

const StaffAssignmentPopover: React.FC<StaffAssignmentPopoverProps> = ({ 
    staff, 
    selectedIds, 
    onSave, 
    onClose, 
    isLoading = false 
}) => {
    const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));
    
    const toggleStaff = (id: string) => {
        const newSelected = new Set(selected);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelected(newSelected);
    };
    
    const handleSave = () => {
        onSave(Array.from(selected));
    };
    
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 mt-2 top-full left-0 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 min-w-[280px] max-h-[400px] overflow-y-auto"
        >
            <div className="text-xs font-semibold text-gray-700 mb-3">Assign Staff Members</div>
            <div className="space-y-1 mb-3">
                {staff.length > 0 ? (
                    staff.map((member) => {
                        const isSelected = selected.has(member.id);
                        return (
                            <motion.button
                                key={member.id}
                                onClick={() => toggleStaff(member.id)}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                disabled={isLoading}
                                className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all flex items-center gap-3 ${
                                    isSelected
                                        ? 'bg-blue-50 border-2 border-blue-500 text-blue-700'
                                        : 'bg-gray-50 border-2 border-gray-200 text-gray-700 hover:bg-gray-100'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 ${
                                    isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                                }`}>
                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div className="flex-1">
                                    {member.firstName} {member.lastName}
                                </div>
                            </motion.button>
                        );
                    })
                ) : (
                    <p className="text-xs text-gray-500 text-center py-4">No staff members available</p>
                )}
            </div>
            <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving...
                        </>
                    ) : (
                        `Assign${selected.size > 0 ? ` (${selected.size})` : ''}`
                    )}
                </button>
            </div>
        </motion.div>
    );
};

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
    
    // Popover states
    const [activePopover, setActivePopover] = useState<{ taskId: string; field: string } | null>(null);
    const [savingFields, setSavingFields] = useState<Set<string>>(new Set());
    
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
    
    const openPopover = (taskId: string, field: string) => {
        setActivePopover({ taskId, field });
    };
    
    const closePopover = () => {
        setActivePopover(null);
    };
    
    const saveField = async (taskId: string, field: string, value: any) => {
        const fieldKey = `${taskId}-${field}`;
        setSavingFields(prev => new Set(prev).add(fieldKey));
        
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value }),
            });

            if (!response.ok) throw new Error(`Failed to update ${field}`);

            toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
            onRefresh();
            closePopover();
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
        const isPopoverOpen = (field: string) => activePopover?.taskId === task.id && activePopover?.field === field;
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
                        <div className="flex-1 min-w-0 relative">
                                <div className="flex items-center gap-2 mb-1">
                                    <motion.span 
                                        onClick={() => openPopover(task.id, 'title')}
                                        whileHover={{ scale: 1.01 }}
                                        className="text-gray-900 truncate font-medium cursor-pointer hover:text-blue-600 hover:bg-blue-50/80 px-2 py-1 rounded-lg transition-all duration-200"
                                    >
                                        {task.title}
                                    </motion.span>
                                    {hasSubtasks && (
                                        <span className="text-xs px-1.5 py-0.5 rounded-md border border-gray-300 text-gray-600 bg-gray-50 font-medium">
                                            {completedSubtasks}/{subtasks.length}
                                        </span>
                                    )}
                                </div>
                                <AnimatePresence>
                                    {isPopoverOpen('title') && (
                                        <EditPopover
                                            title="Edit Task Title"
                                            value={task.title}
                                            onSave={(value) => saveField(task.id, 'title', value)}
                                            onClose={closePopover}
                                            isLoading={isSavingField('title')}
                                            position="left"
                                        />
                                    )}
                                </AnimatePresence>
                            {task.description && (
                                <>
                                    <motion.p 
                                        onClick={() => openPopover(task.id, 'description')}
                                        whileHover={{ scale: 1.01 }}
                                        className="text-xs text-gray-600 truncate cursor-pointer hover:text-blue-600 hover:bg-blue-50/80 px-2 py-1 rounded-lg transition-all duration-200 mt-0.5"
                                    >
                                        {task.description}
                                    </motion.p>
                                    <AnimatePresence>
                                        {isPopoverOpen('description') && (
                                            <EditPopover
                                                title="Edit Description"
                                                value={task.description}
                                                onSave={(value) => saveField(task.id, 'description', value)}
                                                onClose={closePopover}
                                                isLoading={isSavingField('description')}
                                                multiline
                                                position="left"
                                            />
                                        )}
                                    </AnimatePresence>
                                </>
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
                    <div className="col-span-1 flex items-center relative">
                        <motion.span 
                            onClick={() => openPopover(task.id, 'priority')}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`text-xs px-3 py-1.5 rounded-lg border-2 font-semibold cursor-pointer hover:shadow-md transition-all duration-200 ${priorityColors[task.priority]}`}
                        >
                            {task.priority}
                        </motion.span>
                        <AnimatePresence>
                            {isPopoverOpen('priority') && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    className="absolute z-50 mt-2 top-full left-0 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 min-w-[180px]"
                                >
                                    <div className="text-xs font-semibold text-gray-700 mb-2">Set Priority</div>
                                    <div className="flex flex-col gap-1">
                                        {priorityOptions.map((option) => (
                                            <motion.button
                                                key={option.value}
                                                onClick={() => {
                                                    saveField(task.id, 'priority', option.value);
                                                }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                disabled={isSavingField('priority')}
                                                className={`text-xs px-3 py-2 rounded-lg border-2 font-semibold text-left transition-all ${
                                                    task.priority === option.value
                                                        ? priorityColors[option.value as Task['priority']] + ' ring-2 ring-blue-400'
                                                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {option.label}
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Assignee */}
                    <div className="col-span-2 flex items-center gap-1.5 text-sm text-gray-700 relative">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                        <motion.div 
                            onClick={() => openPopover(task.id, 'assignedStaff')}
                            whileHover={{ scale: 1.02 }}
                            className="flex -space-x-2 cursor-pointer"
                        >
                            {assignees.length > 0 ? (
                                <>
                                    {assignees.slice(0, 2).map((assignee) => (
                                        <motion.div
                                            key={assignee.id}
                                            whileHover={{ scale: 1.1, zIndex: 10 }}
                                            className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs flex items-center justify-center border-2 border-white font-medium shadow-sm"
                                            title={`${assignee.firstName} ${assignee.lastName}`}
                                        >
                                            {assignee.firstName.charAt(0)}
                                            {assignee.lastName.charAt(0)}
                                        </motion.div>
                                    ))}
                                    {assignees.length > 2 && (
                                        <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 text-xs flex items-center justify-center border-2 border-white font-medium shadow-sm">
                                            +{assignees.length - 2}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <span className="text-xs text-gray-400 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">Click to assign</span>
                            )}
                        </motion.div>
                        <AnimatePresence>
                            {isPopoverOpen('assignedStaff') && (
                                <StaffAssignmentPopover
                                    staff={staff}
                                    selectedIds={assignees.map(a => a.id)}
                                    onSave={(ids) => saveField(task.id, 'assignedStaff', ids)}
                                    onClose={closePopover}
                                    isLoading={isSavingField('assignedStaff')}
                                />
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Due Date */}
                    <div className="col-span-2 flex items-center gap-1.5 text-sm text-gray-700 relative">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        <motion.span 
                            onClick={() => openPopover(task.id, 'dueDate')}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="truncate text-xs cursor-pointer hover:text-blue-600 hover:bg-blue-50/80 px-2 py-1 rounded-lg transition-all duration-200 font-medium"
                        >
                            {formatDate(task.dueDate)}
                        </motion.span>
                        <AnimatePresence>
                            {isPopoverOpen('dueDate') && (
                                <CalendarPicker
                                    selectedDate={task.dueDate ? new Date(task.dueDate) : null}
                                    onSelect={(date) => saveField(task.id, 'dueDate', date.toISOString().split('T')[0])}
                                    onClose={closePopover}
                                />
                            )}
                        </AnimatePresence>
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
    }, [tasks, activePopover, savingFields, expandedTasks, staff, onUpdateStatus, openPopover, closePopover, saveField, toggleExpand, onAddSubtask, onDeleteTask, onEditTask, setActiveMenu, activeMenu, handleProgressUpdate, updatingProgress]);

    return (
        <>
            {/* Backdrop for popovers */}
            <AnimatePresence>
                {activePopover && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-black/5"
                        onClick={closePopover}
                    />
                )}
            </AnimatePresence>
            
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden relative z-0">
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
        </>
    );
}
