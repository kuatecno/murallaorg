/**
 * Task Utilities
 * Helper functions for task calculations and aggregations
 */

interface Task {
    id: string;
    progress: number;
    status: string;
    subtasks?: Task[];
}

/**
 * Calculate aggregated progress from subtasks
 * Returns the average progress of all subtasks
 */
export function calculateAggregatedProgress(subtasks: Task[]): number {
    if (!subtasks || subtasks.length === 0) {
        return 0;
    }

    const totalProgress = subtasks.reduce((sum, subtask) => {
        // Recursively calculate progress for nested subtasks
        if (subtask.subtasks && subtask.subtasks.length > 0) {
            return sum + calculateAggregatedProgress(subtask.subtasks);
        }
        return sum + subtask.progress;
    }, 0);

    return Math.round(totalProgress / subtasks.length);
}

/**
 * Calculate completion percentage based on status counts
 */
export function calculateCompletionPercentage(
    completedCount: number,
    totalCount: number
): number {
    if (totalCount === 0) return 0;
    return Math.round((completedCount / totalCount) * 100);
}

/**
 * Check if all subtasks are completed
 */
export function areAllSubtasksCompleted(subtasks: Task[]): boolean {
    if (!subtasks || subtasks.length === 0) {
        return false;
    }

    return subtasks.every(
        (subtask) =>
            subtask.status === 'COMPLETED' ||
            subtask.status === 'CANCELLED'
    );
}

/**
 * Get suggested progress based on subtasks
 * If subtasks exist, use their aggregated progress
 * Otherwise, return current progress
 */
export function getSuggestedProgress(
    currentProgress: number,
    subtasks?: Task[]
): number {
    if (!subtasks || subtasks.length === 0) {
        return currentProgress;
    }

    return calculateAggregatedProgress(subtasks);
}

/**
 * Get status color based on completion percentage
 */
export function getProgressColor(percentage: number): string {
    if (percentage === 100) return 'green';
    if (percentage >= 75) return 'blue';
    if (percentage >= 50) return 'yellow';
    if (percentage >= 25) return 'orange';
    return 'gray';
}
