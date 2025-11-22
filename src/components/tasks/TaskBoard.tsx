'use client';

import { useState, useMemo } from 'react';
import { LayoutGrid, FolderKanban } from 'lucide-react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
    DropAnimation,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import SortableTask from './SortableTask';
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
    createdAt: string;
    order?: number;
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

interface TaskBoardProps {
    tasks: Task[];
    projects: Project[];
    selectedProjectId: string | 'all';
    onUpdateStatus: (id: string, status: Task['status']) => void;
    onUpdateTask?: (id: string, updates: Partial<Task>) => Promise<void>;
    onEditTask: (task: Task) => void;
    onDeleteTask: (id: string) => void;
    onAddSubtask: (parentId: string) => void;
    onRefresh: () => void;
}

const statusColumns: {
    id: Task['status'];
    label: string;
    color: string;
    bgColor: string;
}[] = [
        {
            id: 'TODO',
            label: 'To Do',
            color: '#64748B',
            bgColor: 'bg-slate-50',
        },
        {
            id: 'IN_PROGRESS',
            label: 'In Progress',
            color: '#3B82F6',
            bgColor: 'bg-blue-50',
        },
        {
            id: 'IN_REVIEW',
            label: 'Review',
            color: '#F59E0B',
            bgColor: 'bg-amber-50',
        },
        {
            id: 'COMPLETED',
            label: 'Completed',
            color: '#10B981',
            bgColor: 'bg-emerald-50',
        },
    ];

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
};

export default function TaskBoard({
    tasks,
    projects,
    selectedProjectId,
    onUpdateStatus,
    onUpdateTask,
    onEditTask,
    onDeleteTask,
    onAddSubtask,
    onRefresh,
}: TaskBoardProps) {
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [groupBy, setGroupBy] = useState<'status' | 'project'>('status');

    // Only show top-level tasks (not subtasks)
    const topLevelTasks = useMemo(() =>
        tasks.filter((task) => !task.parentTaskId).sort((a, b) => (a.order || 0) - (b.order || 0)),
        [tasks]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Require slight movement to start drag
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const columns = useMemo(() => {
        if (groupBy === 'status') return statusColumns;

        // Project columns
        const projectCols = projects.map(p => ({
            id: p.id,
            label: p.name,
            color: p.color,
            bgColor: 'bg-gray-50', // We could generate a light version of project color
            type: 'project'
        }));

        // Add "No Project" column
        projectCols.push({
            id: 'unassigned',
            label: 'No Project',
            color: '#94a3b8',
            bgColor: 'bg-slate-50',
            type: 'project'
        });

        return projectCols;
    }, [groupBy, projects]);

    // Group tasks
    const tasksByColumn = useMemo(() => {
        const grouped: Record<string, Task[]> = {};
        columns.forEach((col) => {
            if (groupBy === 'status') {
                grouped[col.id] = topLevelTasks.filter((task) => task.status === col.id);
            } else {
                if (col.id === 'unassigned') {
                    grouped[col.id] = topLevelTasks.filter((task) => !task.projectId);
                } else {
                    grouped[col.id] = topLevelTasks.filter((task) => task.projectId === col.id);
                }
            }
        });
        return grouped;
    }, [topLevelTasks, columns, groupBy]);

    const onDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = tasks.find((t) => t.id === active.id);
        if (task) {
            setActiveTask(task);
        }
    };

    const onDragOver = (event: DragOverEvent) => {
        // We handle visual updates via local state or just rely on dnd-kit's overlay
    };

    const onDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Find the task and the column it was dropped into
        const activeTask = tasks.find((t) => t.id === activeId);
        if (!activeTask) return;

        // Check if dropped on a column (empty column case)
        const isOverColumn = columns.some(col => col.id === overId);

        // Check if dropped on another task
        const overTask = tasks.find((t) => t.id === overId);

        if (isOverColumn) {
            if (groupBy === 'status') {
                const newStatus = overId as Task['status'];
                if (newStatus !== activeTask.status) {
                    try {
                        await onUpdateStatus(activeId, newStatus);
                    } catch (error) {
                        toast.error('Failed to update task status');
                    }
                }
            } else {
                // Project grouping
                const newProjectId = overId === 'unassigned' ? null : overId;
                // Only update if project changed
                // Note: projectId can be undefined in task but null in our logic
                const currentProjectId = activeTask.projectId || null;

                if (newProjectId !== currentProjectId) {
                    if (onUpdateTask) {
                        try {
                            // We need to cast undefined to null for the API if needed, but Partial<Task> expects string | undefined
                            // So we pass undefined if null
                            await onUpdateTask(activeId, { projectId: newProjectId || undefined });
                            toast.success('Task moved to project');
                        } catch (error) {
                            toast.error('Failed to update task project');
                        }
                    } else {
                        toast.error('Project updates not supported in this view');
                    }
                }
            }
        } else if (overTask) {
            // Dropped on another task
            if (groupBy === 'status') {
                const newStatus = overTask.status;
                if (newStatus !== activeTask.status) {
                    try {
                        await onUpdateStatus(activeId, newStatus);
                    } catch (error) {
                        toast.error('Failed to update task status');
                    }
                }
            } else {
                // Project grouping - adopt target task's project
                const newProjectId = overTask.projectId || null;
                const currentProjectId = activeTask.projectId || null;

                if (newProjectId !== currentProjectId) {
                    if (onUpdateTask) {
                        try {
                            await onUpdateTask(activeId, { projectId: newProjectId || undefined });
                            toast.success('Task moved to project');
                        } catch (error) {
                            toast.error('Failed to update task project');
                        }
                    }
                }
            }
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setGroupBy('status')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${groupBy === 'status'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <LayoutGrid className="w-4 h-4 inline-block mr-2" />
                        Status
                    </button>
                    <button
                        onClick={() => setGroupBy('project')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${groupBy === 'project'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <FolderKanban className="w-4 h-4 inline-block mr-2" />
                        Project
                    </button>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
            >
                <div className="flex-1 overflow-x-auto">
                    <div className="flex gap-6 h-full min-w-[1000px] pb-4">
                        {columns.map((column) => (
                            <div
                                key={column.id}
                                className="flex-1 min-w-[300px] flex flex-col bg-gray-50/50 rounded-xl border border-gray-100"
                            >
                                {/* Column Header */}
                                <div className={`p-4 border-b border-gray-100 rounded-t-xl ${column.bgColor}`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: column.color }}
                                            />
                                            {column.label}
                                        </h3>
                                        <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-100">
                                            {tasksByColumn[column.id]?.length || 0}
                                        </span>
                                    </div>
                                </div>

                                {/* Column Content */}
                                <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
                                    <SortableContext
                                        id={column.id}
                                        items={tasksByColumn[column.id]?.map((t) => t.id) || []}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-3 min-h-[100px]">
                                            {tasksByColumn[column.id]?.map((task) => (
                                                <SortableTask
                                                    key={task.id}
                                                    task={task}
                                                    allTasks={tasks}
                                                    projects={projects}
                                                    onUpdateStatus={onUpdateStatus}
                                                    onEdit={onEditTask}
                                                    onDelete={onDeleteTask}
                                                    onAddSubtask={onAddSubtask}
                                                    onRefresh={onRefresh}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DragOverlay dropAnimation={dropAnimation}>
                    {activeTask ? (
                        <div className="transform rotate-2 cursor-grabbing">
                            <TaskCard
                                task={activeTask}
                                allTasks={tasks}
                                projects={projects}
                                onUpdateStatus={onUpdateStatus}
                                onEdit={onEditTask}
                                onDelete={onDeleteTask}
                                onAddSubtask={onAddSubtask}
                                onRefresh={onRefresh}
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
