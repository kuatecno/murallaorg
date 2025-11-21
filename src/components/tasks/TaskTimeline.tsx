'use client';

import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

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
    dependencies?: any[];
}

interface TaskTimelineProps {
    tasks: Task[];
    onEditTask: (task: Task) => void;
}

export default function TaskTimeline({ tasks, onEditTask }: TaskTimelineProps) {
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

    // Only show top-level tasks
    const topLevelTasks = tasks.filter((t) => !t.parentTaskId);

    const { minDate, maxDate, totalDays, weeks } = useMemo(() => {
        if (tasks.length === 0) {
            return { minDate: new Date(), maxDate: new Date(), totalDays: 30, weeks: [] };
        }

        const dates = tasks.flatMap((t) => {
            const d = [];
            if (t.startDate) d.push(new Date(t.startDate));
            if (t.dueDate) d.push(new Date(t.dueDate));
            return d;
        });

        if (dates.length === 0) {
            return { minDate: new Date(), maxDate: new Date(), totalDays: 30, weeks: [] };
        }

        const min = new Date(Math.min(...dates.map((d) => d.getTime())));
        const max = new Date(Math.max(...dates.map((d) => d.getTime())));

        min.setDate(min.getDate() - 2);
        max.setDate(max.getDate() + 2);

        const total = Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24));

        const weekArray: Date[] = [];
        const current = new Date(min);
        while (current <= max) {
            weekArray.push(new Date(current));
            current.setDate(current.getDate() + 7);
        }

        return { minDate: min, maxDate: max, totalDays: total, weeks: weekArray };
    }, [tasks]);

    const getTaskPosition = (task: Task) => {
        const start = task.startDate ? new Date(task.startDate) : new Date();
        const end = task.dueDate ? new Date(task.dueDate) : new Date();

        // If no dates, default to today and 1 day duration
        if (!task.startDate && !task.dueDate) {
            start.setTime(new Date().getTime());
            end.setTime(new Date().getTime() + 86400000);
        } else if (!task.startDate) {
            start.setTime(end.getTime() - 86400000);
        } else if (!task.dueDate) {
            end.setTime(start.getTime() + 86400000);
        }

        const startTime = start.getTime();
        const endTime = end.getTime();
        const minTime = minDate.getTime();

        const startOffset = (startTime - minTime) / (1000 * 60 * 60 * 24);
        const duration = Math.max(1, (endTime - startTime) / (1000 * 60 * 60 * 24));

        return {
            left: `${(startOffset / totalDays) * 100}%`,
            width: `${(duration / totalDays) * 100}%`,
        };
    };

    const priorityColors = {
        LOW: 'bg-slate-400',
        MEDIUM: 'bg-blue-400',
        HIGH: 'bg-amber-400',
        URGENT: 'bg-red-400',
    };

    const statusColors = {
        TODO: 'bg-slate-500',
        IN_PROGRESS: 'bg-blue-500',
        IN_REVIEW: 'bg-amber-500',
        COMPLETED: 'bg-emerald-500',
        CANCELLED: 'bg-gray-500',
    };

    const toggleExpand = (taskId: string) => {
        const newExpanded = new Set(expandedTasks);
        if (newExpanded.has(taskId)) {
            newExpanded.delete(taskId);
        } else {
            newExpanded.add(taskId);
        }
        setExpandedTasks(newExpanded);
    };

    const renderTask = (task: Task, depth: number = 0) => {
        const position = getTaskPosition(task);
        const subtasks = task.subtasks || tasks.filter((t) => t.parentTaskId === task.id);
        const hasSubtasks = subtasks.length > 0;
        const isExpanded = expandedTasks.has(task.id);
        const assigneeName = task.assignments?.[0]?.staff.firstName || 'Unassigned';

        return (
            <div key={task.id}>
                <div className="flex items-center group py-1">
                    <div className="w-64 flex-shrink-0 pr-4 border-r border-gray-100">
                        <div
                            className="cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => onEditTask(task)}
                            style={{ paddingLeft: `${depth * 20}px` }}
                        >
                            <div className="flex items-center gap-1 mb-1">
                                {hasSubtasks && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleExpand(task.id);
                                        }}
                                        className="hover:bg-slate-200 rounded p-0.5"
                                    >
                                        {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-gray-500" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-gray-500" />
                                        )}
                                    </button>
                                )}
                                <span className={`text-sm font-medium text-gray-900 truncate ${!hasSubtasks ? 'ml-5' : ''}`}>
                                    {task.title}
                                </span>
                            </div>
                            <div className="flex items-center gap-2" style={{ paddingLeft: hasSubtasks ? '20px' : '0' }}>
                                <span className="text-xs px-1.5 py-0.5 rounded border border-gray-200 text-gray-600 bg-gray-50">
                                    {assigneeName}
                                </span>
                                <div
                                    className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`}
                                    title={`Priority: ${task.priority}`}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 relative h-10">
                        {/* Grid lines are rendered in the parent container, but we need to ensure alignment */}

                        {/* Task bar */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 h-6 rounded-md cursor-pointer transition-all hover:scale-105 hover:shadow-md z-10"
                            style={{
                                left: position.left,
                                width: position.width,
                            }}
                            onClick={() => onEditTask(task)}
                        >
                            <div
                                className={`h-full rounded-md ${statusColors[task.status]} flex items-center px-2 text-white text-xs shadow overflow-hidden`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className="truncate font-medium">{task.progress}%</span>
                                </div>
                            </div>
                            {/* Progress overlay */}
                            <div
                                className="absolute inset-0 bg-white/20 rounded-l-md"
                                style={{ width: `${task.progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Render subtasks if expanded */}
                {isExpanded && subtasks.map(subtask => renderTask(subtask, depth + 1))}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Project Timeline</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Gantt chart visualization of all tasks
                        </p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-emerald-500" />
                            <span className="text-gray-600">Completed</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-blue-500" />
                            <span className="text-gray-600">In Progress</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-slate-500" />
                            <span className="text-gray-600">Planned</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <div className="min-w-[800px] p-4">
                    {/* Timeline header */}
                    <div className="flex border-b border-gray-200 pb-3 mb-2">
                        <div className="w-64 flex-shrink-0 font-medium text-sm text-gray-500 pl-2">Task Name</div>
                        <div className="flex-1 relative h-6">
                            <div className="flex justify-between text-xs text-gray-500 absolute inset-0">
                                {weeks.map((week, i) => (
                                    <div key={i} className="flex-1 text-center border-l border-gray-100 first:border-l-0">
                                        {week.toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Grid Background */}
                    <div className="relative">
                        <div className="absolute inset-0 flex pointer-events-none ml-64 h-full">
                            {weeks.map((_, i) => (
                                <div
                                    key={i}
                                    className="flex-1 border-l border-gray-100 first:border-l-0 h-full"
                                />
                            ))}
                        </div>

                        {/* Tasks */}
                        <div className="space-y-1 relative z-0">
                            {topLevelTasks.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    No tasks found with dates. Add start and due dates to see them on the timeline.
                                </div>
                            ) : (
                                topLevelTasks.map((task) => renderTask(task))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
