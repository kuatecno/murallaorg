'use client';

import { useState, useEffect } from 'react';
import { X, Link2, AlertCircle } from 'lucide-react';

interface Task {
    id: string;
    title: string;
    status: string;
    priority: string;
    progress: number;
    project?: {
        id: string;
        name: string;
        color: string;
    };
}

interface DependencySelectorProps {
    taskId?: string;
    selectedDependencies: string[];
    onDependenciesChange: (dependencies: string[]) => void;
    availableTasks: Task[];
}

export default function DependencySelector({
    taskId,
    selectedDependencies,
    onDependenciesChange,
    availableTasks,
}: DependencySelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter out current task and already selected dependencies
    const filteredTasks = availableTasks.filter(task => {
        if (task.id === taskId) return false;
        if (selectedDependencies.includes(task.id)) return false;
        if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        return true;
    });

    const selectedTasks = availableTasks.filter(task =>
        selectedDependencies.includes(task.id)
    );

    const handleAddDependency = (taskId: string) => {
        onDependenciesChange([...selectedDependencies, taskId]);
        setSearchQuery('');
    };

    const handleRemoveDependency = (taskId: string) => {
        onDependenciesChange(selectedDependencies.filter(id => id !== taskId));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'TODO':
                return 'bg-gray-100 text-gray-700';
            case 'IN_PROGRESS':
                return 'bg-blue-100 text-blue-700';
            case 'IN_REVIEW':
                return 'bg-yellow-100 text-yellow-700';
            case 'COMPLETED':
                return 'bg-green-100 text-green-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'URGENT':
                return 'text-red-600';
            case 'HIGH':
                return 'text-orange-600';
            case 'MEDIUM':
                return 'text-yellow-600';
            case 'LOW':
                return 'text-gray-600';
            default:
                return 'text-gray-600';
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Dependencies
                <span className="text-gray-500 text-xs ml-2">(Tasks that must be completed first)</span>
            </label>

            {/* Selected Dependencies */}
            {selectedTasks.length > 0 && (
                <div className="mb-3 space-y-2">
                    {selectedTasks.map(task => (
                        <div
                            key={task.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <span className="text-sm font-medium text-gray-900 truncate">
                                        {task.title}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(task.status)}`}>
                                        {task.status.replace('_', ' ')}
                                    </span>
                                    {task.project && (
                                        <span className="text-xs text-gray-500">
                                            {task.project.name}
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-500">
                                        {task.progress}% complete
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemoveDependency(task.id)}
                                className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Dependency Dropdown */}
            <div className="relative">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Search tasks to add as dependencies..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                {isOpen && filteredTasks.length > 0 && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsOpen(false)}
                        />
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredTasks.map(task => (
                                <button
                                    key={task.id}
                                    type="button"
                                    onClick={() => {
                                        handleAddDependency(task.id);
                                        setIsOpen(false);
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900 truncate">
                                                {task.title}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(task.status)}`}>
                                                    {task.status.replace('_', ' ')}
                                                </span>
                                                <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                                {task.project && (
                                                    <span
                                                        className="text-xs px-2 py-0.5 rounded"
                                                        style={{
                                                            backgroundColor: `${task.project.color}20`,
                                                            color: task.project.color,
                                                        }}
                                                    >
                                                        {task.project.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {selectedDependencies.length === 0 && (
                <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    This task has no dependencies
                </p>
            )}
        </div>
    );
}
