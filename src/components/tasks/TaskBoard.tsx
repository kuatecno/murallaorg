'use client';

import { useState } from 'react';
import { LayoutGrid, FolderKanban } from 'lucide-react';
import TaskCard from './TaskCard';

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

export default function TaskBoard({
    tasks,
    projects,
    selectedProjectId,
    onUpdateStatus,
    onEditTask,
    onDeleteTask,
    onAddSubtask,
    onRefresh,
}: TaskBoardProps) {
    const [groupBy, setGroupBy] = useState<'status' | 'project'>('status');

    // Only show top-level tasks (not subtasks)
    const topLevelTasks = tasks.filter((task) => !task.parentTaskId);

    // Determine if we're viewing all projects
    const isAllProjects = selectedProjectId === 'all';

    // Render by status (default view)
    if (groupBy === 'status') {
        return (
            <div>
                {isAllProjects && (
                    <div className="mb-4 flex items-center justify-end gap-2">
                        <span className="text-sm text-gray-600">Group by:</span>
                        <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                            <button
                                onClick={() => setGroupBy('status')}
                                className="px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 bg-blue-600 text-white"
                            >
                                <LayoutGrid className="w-4 h-4" />
                                Status
                            </button>
                            <button
                                onClick={() => setGroupBy('project')}
                                className="px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 text-gray-700 hover:bg-gray-100"
                            >
                                <FolderKanban className="w-4 h-4" />
                                Project
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {statusColumns.map((column) => {
                        const columnTasks = topLevelTasks.filter(
                            (task) => task.status === column.id
                        );
                        return (
                            <div
                                key={column.id}
                                className={`rounded-xl ${column.bgColor} p-4 min-h-[500px] border border-gray-200/50`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {column.label}
                                    </h3>
                                    <span className="px-2.5 py-1 rounded-full bg-white text-sm text-gray-600 shadow-sm font-medium">
                                        {columnTasks.length}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {columnTasks.map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            allTasks={tasks}
                                            projects={projects}
                                            showProjectBadge={isAllProjects}
                                            onUpdateStatus={onUpdateStatus}
                                            onEdit={onEditTask}
                                            onDelete={onDeleteTask}
                                            onAddSubtask={onAddSubtask}
                                            onRefresh={onRefresh}
                                        />
                                    ))}
                                    {columnTasks.length === 0 && (
                                        <div className="text-center py-8 text-gray-400 text-sm">
                                            No tasks
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Render by project
    return (
        <div>
            <div className="mb-4 flex items-center justify-end gap-2">
                <span className="text-sm text-gray-600">Group by:</span>
                <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                    <button
                        onClick={() => setGroupBy('status')}
                        className="px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 text-gray-700 hover:bg-gray-100"
                    >
                        <LayoutGrid className="w-4 h-4" />
                        Status
                    </button>
                    <button
                        onClick={() => setGroupBy('project')}
                        className="px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 bg-blue-600 text-white"
                    >
                        <FolderKanban className="w-4 h-4" />
                        Project
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {projects.map((project) => {
                    const projectTasks = topLevelTasks.filter(
                        (task) => task.projectId === project.id
                    );
                    const completedTasks = projectTasks.filter(
                        (t) => t.status === 'COMPLETED'
                    ).length;
                    const progress =
                        projectTasks.length > 0
                            ? Math.round(
                                (projectTasks.reduce((sum, t) => sum + t.progress, 0) /
                                    projectTasks.length)
                            )
                            : 0;

                    return (
                        <div
                            key={project.id}
                            className="rounded-xl bg-white p-4 min-h-[500px] border border-gray-200 shadow-sm"
                        >
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: project.color }}
                                    />
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {project.name}
                                    </h3>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                                    <span>{projectTasks.length} tasks</span>
                                    <span>{completedTasks} completed</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full transition-all"
                                        style={{
                                            width: `${progress}%`,
                                            backgroundColor: project.color,
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                {projectTasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        allTasks={tasks}
                                        projects={projects}
                                        showProjectBadge={false}
                                        onUpdateStatus={onUpdateStatus}
                                        onEdit={onEditTask}
                                        onDelete={onDeleteTask}
                                        onAddSubtask={onAddSubtask}
                                        onRefresh={onRefresh}
                                    />
                                ))}
                                {projectTasks.length === 0 && (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        No tasks in this project
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
