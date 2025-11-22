'use client';

import { useState } from 'react';
import { Search, Filter, X, ArrowUpDown, Calendar, User } from 'lucide-react';

interface FilterBarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    filters: {
        assigneeId: string | null;
        priority: string | null;
        dateRange: { start: string | null; end: string | null };
    };
    onFilterChange: (filters: any) => void;
    sort: { field: string; direction: 'asc' | 'desc' };
    onSortChange: (sort: { field: string; direction: 'asc' | 'desc' }) => void;
    staff: { id: string; firstName: string; lastName: string }[];
}

export default function FilterBar({
    searchQuery,
    onSearchChange,
    filters,
    onFilterChange,
    sort,
    onSortChange,
    staff,
}: FilterBarProps) {
    const [showFilters, setShowFilters] = useState(false);

    const handleClearFilters = () => {
        onFilterChange({
            assigneeId: null,
            priority: null,
            dateRange: { start: null, end: null },
        });
        onSearchChange('');
    };

    const hasActiveFilters =
        filters.assigneeId ||
        filters.priority ||
        filters.dateRange.start ||
        filters.dateRange.end ||
        searchQuery;

    return (
        <div className="space-y-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Filter Toggle & Sort */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${showFilters || hasActiveFilters
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                        {hasActiveFilters && (
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                        )}
                    </button>

                    <div className="relative group">
                        <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg flex items-center gap-2 text-gray-700 hover:bg-gray-50">
                            <ArrowUpDown className="w-4 h-4" />
                            Sort: {sort.field === 'dueDate' ? 'Due Date' :
                                sort.field === 'priority' ? 'Priority' :
                                    sort.field === 'createdAt' ? 'Created' : 'Title'}
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg hidden group-hover:block z-10">
                            <div className="p-1">
                                {[
                                    { label: 'Title', value: 'title' },
                                    { label: 'Due Date', value: 'dueDate' },
                                    { label: 'Priority', value: 'priority' },
                                    { label: 'Created Date', value: 'createdAt' },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() =>
                                            onSortChange({
                                                field: option.value,
                                                direction:
                                                    sort.field === option.value && sort.direction === 'asc'
                                                        ? 'desc'
                                                        : 'asc',
                                            })
                                        }
                                        className={`w-full px-4 py-2 text-left text-sm rounded-md flex items-center justify-between ${sort.field === option.value
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        {option.label}
                                        {sort.field === option.value && (
                                            <span className="text-xs">
                                                {sort.direction === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
                <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Assignee Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Assignee
                            </label>
                            <select
                                value={filters.assigneeId || ''}
                                onChange={(e) =>
                                    onFilterChange({
                                        ...filters,
                                        assigneeId: e.target.value || null,
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Assignees</option>
                                {staff.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.firstName} {s.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Priority Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Priority
                            </label>
                            <select
                                value={filters.priority || ''}
                                onChange={(e) =>
                                    onFilterChange({
                                        ...filters,
                                        priority: e.target.value || null,
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Priorities</option>
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                            </select>
                        </div>

                        {/* Date Range Filter (Simplified for now) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Due Date
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={filters.dateRange.start || ''}
                                    onChange={(e) =>
                                        onFilterChange({
                                            ...filters,
                                            dateRange: { ...filters.dateRange, start: e.target.value || null },
                                        })
                                    }
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="self-center text-gray-400">-</span>
                                <input
                                    type="date"
                                    value={filters.dateRange.end || ''}
                                    onChange={(e) =>
                                        onFilterChange({
                                            ...filters,
                                            dateRange: { ...filters.dateRange, end: e.target.value || null },
                                        })
                                    }
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-gray-100">
                        <button
                            onClick={handleClearFilters}
                            className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                        >
                            <X className="w-4 h-4" />
                            Clear All Filters
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
