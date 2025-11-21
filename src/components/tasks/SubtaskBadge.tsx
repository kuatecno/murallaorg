'use client';

import { CheckCircle2, Circle } from 'lucide-react';

interface SubtaskBadgeProps {
    completedCount: number;
    totalCount: number;
    size?: 'sm' | 'md';
}

export default function SubtaskBadge({
    completedCount,
    totalCount,
    size = 'md',
}: SubtaskBadgeProps) {
    if (totalCount === 0) return null;

    const percentage = (completedCount / totalCount) * 100;
    const isComplete = completedCount === totalCount;

    const sizeClasses = {
        sm: 'text-xs px-1.5 py-0.5',
        md: 'text-sm px-2 py-1',
    };

    const iconSize = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
    };

    // Color based on completion percentage
    const getColorClasses = () => {
        if (isComplete) {
            return 'bg-green-100 text-green-700 border-green-300';
        } else if (percentage >= 50) {
            return 'bg-blue-100 text-blue-700 border-blue-300';
        } else if (percentage > 0) {
            return 'bg-yellow-100 text-yellow-700 border-yellow-300';
        } else {
            return 'bg-gray-100 text-gray-600 border-gray-300';
        }
    };

    return (
        <div
            className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeClasses[size]} ${getColorClasses()}`}
            title={`${completedCount} of ${totalCount} subtasks completed (${Math.round(percentage)}%)`}
        >
            {isComplete ? (
                <CheckCircle2 className={iconSize[size]} />
            ) : (
                <Circle className={iconSize[size]} />
            )}
            <span>
                {completedCount}/{totalCount}
            </span>
        </div>
    );
}
