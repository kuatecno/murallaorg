'use client';

import { ArrowRight, CheckCircle2, Circle, Clock, AlertCircle, CheckSquare } from 'lucide-react';

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

interface TaskProcessProps {
    tasks: Task[];
    onEditTask: (task: Task) => void;
}

const processStages = [
    {
        id: 'planning',
        label: 'Planning',
        statuses: ['TODO'] as Task['status'][],
        icon: Circle,
        color: 'text-slate-500',
        borderColor: 'border-slate-200',
        bgColor: 'bg-slate-50',
    },
    {
        id: 'development',
        label: 'Development',
        statuses: ['IN_PROGRESS'] as Task['status'][],
        icon: Clock,
        color: 'text-blue-500',
        borderColor: 'border-blue-200',
        bgColor: 'bg-blue-50',
    },
    {
        id: 'review',
        label: 'Review',
        statuses: ['IN_REVIEW'] as Task['status'][],
        icon: AlertCircle,
        color: 'text-amber-500',
        borderColor: 'border-amber-200',
        bgColor: 'bg-amber-50',
    },
    {
        id: 'completed',
        label: 'Completed',
        statuses: ['COMPLETED'] as Task['status'][],
        icon: CheckCircle2,
        color: 'text-emerald-500',
        borderColor: 'border-emerald-200',
        bgColor: 'bg-emerald-50',
    },
];

export default function TaskProcess({ tasks, onEditTask }: TaskProcessProps) {
    // Only show top-level tasks
    const topLevelTasks = tasks.filter((t) => !t.parentTaskId);

    const getStageProgress = (stage: typeof processStages[0]) => {
        const stageTasks = topLevelTasks.filter((t) => stage.statuses.includes(t.status));
        if (stageTasks.length === 0) return 0;
        const totalProgress = stageTasks.reduce((sum, t) => sum + t.progress, 0);
        return Math.round(totalProgress / stageTasks.length);
    };

    const getSubtaskInfo = (task: Task) => {
        const subtasks = task.subtasks || tasks.filter((t) => t.parentTaskId === task.id);
        const completed = subtasks.filter((t) => t.status === 'COMPLETED').length;
        return { total: subtasks.length, completed };
    };

    return (
        <div className="space-y-6">
            {/* Process Flow Overview */}
            <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Process Flow</h2>
                <div className="flex items-center justify-between overflow-x-auto pb-4">
                    {processStages.map((stage, index) => {
                        const Icon = stage.icon;
                        const stageTasks = topLevelTasks.filter((t) => stage.statuses.includes(t.status));
                        const progress = getStageProgress(stage);

                        return (
                            <div key={stage.id} className="flex items-center flex-1 min-w-[120px]">
                                <div className="flex flex-col items-center flex-1">
                                    <div
                                        className={`w-16 h-16 rounded-full border-4 ${progress === 100 ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-white'
                                            } flex items-center justify-center mb-3 shadow-sm transition-colors`}
                                    >
                                        <Icon className={`w-8 h-8 ${stage.color}`} />
                                    </div>
                                    <div className="text-gray-900 font-medium mb-1">{stage.label}</div>
                                    <div className="text-sm text-gray-500 mb-2">
                                        {stageTasks.length} task{stageTasks.length !== 1 ? 's' : ''}
                                    </div>
                                    <div className="w-full max-w-[100px]">
                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600 transition-all duration-500"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <div className="text-xs text-gray-400 text-center mt-1">
                                            {progress}%
                                        </div>
                                    </div>
                                </div>
                                {index < processStages.length - 1 && (
                                    <ArrowRight className="w-6 h-6 text-gray-300 mx-4 flex-shrink-0" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Detailed Stage Views */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {processStages.map((stage) => {
                    const stageTasks = topLevelTasks.filter((t) => stage.statuses.includes(t.status));
                    const Icon = stage.icon;

                    return (
                        <div key={stage.id} className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div
                                    className={`w-10 h-10 rounded-lg ${stage.bgColor} flex items-center justify-center`}
                                >
                                    <Icon className={`w-5 h-5 ${stage.color}`} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-gray-900 font-medium">{stage.label}</h3>
                                    <p className="text-sm text-gray-500">
                                        {stageTasks.length} active task{stageTasks.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {stageTasks.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                        No tasks in this stage
                                    </div>
                                ) : (
                                    stageTasks.map((task) => {
                                        const subtaskInfo = getSubtaskInfo(task);
                                        const assigneeName = task.assignments?.[0]?.staff.firstName || 'Unassigned';

                                        return (
                                            <div
                                                key={task.id}
                                                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer bg-gray-50/50"
                                                onClick={() => onEditTask(task)}
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1 min-w-0 mr-2">
                                                        <div className="text-gray-900 font-medium mb-1 truncate">{task.title}</div>
                                                        {task.description && (
                                                            <div className="text-xs text-gray-500 line-clamp-1">
                                                                {task.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span
                                                        className={`text-xs px-2 py-0.5 rounded border font-medium whitespace-nowrap ${task.priority === 'HIGH' || task.priority === 'URGENT'
                                                                ? 'border-red-200 text-red-700 bg-red-50'
                                                                : task.priority === 'MEDIUM'
                                                                    ? 'border-blue-200 text-blue-700 bg-blue-50'
                                                                    : 'border-gray-200 text-gray-700 bg-gray-50'
                                                            }`}
                                                    >
                                                        {task.priority}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between mt-3">
                                                    <div className="text-sm text-gray-600 flex items-center gap-1">
                                                        <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                                                            {assigneeName.charAt(0)}
                                                        </span>
                                                        <span className="text-xs">{assigneeName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {subtaskInfo.total > 0 && (
                                                            <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                                <CheckSquare className="w-3 h-3" />
                                                                {subtaskInfo.completed}/{subtaskInfo.total}
                                                            </span>
                                                        )}
                                                        <div className="text-xs font-medium text-gray-500">{task.progress}%</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
