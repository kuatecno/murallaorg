'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskCard from './TaskCard';

interface SortableTaskProps {
    task: any;
    allTasks: any[];
    projects: any[];
    onUpdateStatus: (id: string, status: any) => void;
    onEdit: (task: any) => void;
    onDelete: (id: string) => void;
    onAddSubtask: (parentId: string) => void;
    onRefresh: () => void;
}

export default function SortableTask({
    task,
    allTasks,
    projects,
    onUpdateStatus,
    onEdit,
    onDelete,
    onAddSubtask,
    onRefresh,
}: SortableTaskProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id, data: { type: 'Task', task } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <TaskCard
                task={task}
                allTasks={allTasks}
                projects={projects}
                onUpdateStatus={onUpdateStatus}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddSubtask={onAddSubtask}
                onRefresh={onRefresh}
            />
        </div>
    );
}
