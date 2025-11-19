'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Users, MessageSquare, Link2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

export default function CreateTaskModal({ isOpen, onClose, onTaskCreated }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [createChatSpace, setCreateChatSpace] = useState(true);
  const [useExistingSpace, setUseExistingSpace] = useState(false);
  const [existingSpaceId, setExistingSpaceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchStaff();
      resetForm();
    }
  }, [isOpen]);

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/staff');
      if (!response.ok) throw new Error('Failed to fetch staff');
      
      const data = await response.json();
      setStaff(data.staff || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setDueDate('');
    setSelectedStaff([]);
    setCreateChatSpace(true);
    setUseExistingSpace(false);
    setExistingSpaceId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Task title is required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          dueDate: dueDate || undefined,
          assignedStaff: selectedStaff,
          createGoogleChatSpace: createChatSpace && !useExistingSpace,
          existingGoogleChatSpaceId: useExistingSpace ? existingSpaceId : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create task');
      }

      const data = await response.json();
      
      if (data.task.googleChatSpaceId) {
        toast.success('Task created with Google Chat space!', {
          duration: 4000,
        });
      } else {
        toast.success('Task created successfully!');
      }

      onTaskCreated();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create task');
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStaffSelection = (staffId: string) => {
    setSelectedStaff(prev => 
      prev.includes(staffId)
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create New Task</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter task description..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Priority and Due Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Assign Staff */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Staff
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {staff.length === 0 ? (
                  <p className="text-gray-500 text-sm">No staff members available</p>
                ) : (
                  <div className="space-y-2">
                    {staff.map((member) => (
                      <label
                        key={member.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStaff.includes(member.id)}
                          onChange={() => toggleStaffSelection(member.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center">
                            {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {member.firstName} {member.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {selectedStaff.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  {selectedStaff.length} staff member{selectedStaff.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Google Chat Integration */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Google Chat Integration
              </label>

              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={createChatSpace}
                  onChange={(e) => {
                    setCreateChatSpace(e.target.checked);
                    if (!e.target.checked) {
                      setUseExistingSpace(false);
                      setExistingSpaceId('');
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <Link2 className="w-4 h-4" />
                    Post to Google Chat
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Share this task in Google Chat for collaboration
                  </div>
                </div>
              </label>

              {createChatSpace && (
                <div className="ml-7 space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={!useExistingSpace}
                      onChange={() => {
                        setUseExistingSpace(false);
                        setExistingSpaceId('');
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Create new Chat space</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={useExistingSpace}
                      onChange={() => setUseExistingSpace(true)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Use existing Chat space</span>
                  </label>

                  {useExistingSpace && (
                    <div className="ml-6">
                      <input
                        type="text"
                        value={existingSpaceId}
                        onChange={(e) => setExistingSpaceId(e.target.value)}
                        placeholder="Enter space ID (e.g., AAQA_in1rlk)"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Find the space ID in the Chat URL: chat/space/<strong>SPACE_ID</strong>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
