'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, MessageSquare, Users, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ChatSpace {
  id: string;
  name: string;
  displayName: string;
  type: string;
}

export default function SpacesPage() {
  const router = useRouter();
  const [spaces, setSpaces] = useState<ChatSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSpace, setEditingSpace] = useState<ChatSpace | null>(null);
  const [spaceName, setSpaceName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    try {
      const response = await fetch('/api/chat/spaces');
      const data = await response.json();
      
      if (response.ok) {
        setSpaces(data.spaces || []);
      } else {
        toast.error(data.error || 'Failed to load spaces');
      }
    } catch (error) {
      console.error('Error fetching spaces:', error);
      toast.error('Failed to load spaces');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/chat/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: spaceName.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSpaces([...spaces, data.space]);
        toast.success('Space created successfully');
        setShowCreateModal(false);
        setSpaceName('');
      } else {
        toast.error(data.error || 'Failed to create space');
      }
    } catch (error) {
      toast.error('Error creating space');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpace || !spaceName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/chat/spaces/${editingSpace.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: spaceName.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSpaces(spaces.map(s => s.id === editingSpace.id ? data.space : s));
        toast.success('Space updated successfully');
        setEditingSpace(null);
        setSpaceName('');
      } else {
        toast.error(data.error || 'Failed to update space');
      }
    } catch (error) {
      toast.error('Error updating space');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSpace = async (space: ChatSpace) => {
    if (!confirm(`Are you sure you want to delete the space "${space.displayName}"? This action cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/chat/spaces/${space.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSpaces(spaces.filter(s => s.id !== space.id));
        toast.success('Space deleted successfully');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete space');
      }
    } catch (error) {
      toast.error('Error deleting space');
    }
  };

  const openCreateModal = () => {
    setSpaceName('');
    setShowCreateModal(true);
  };

  const openEditModal = (space: ChatSpace) => {
    setEditingSpace(space);
    setSpaceName(space.displayName);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Google Chat Spaces</h1>
              <p className="text-gray-600">Manage your team's chat spaces and project lists</p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Space
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : spaces.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No spaces found</h3>
            <p className="text-gray-500 mt-1 mb-6">Get started by creating your first Google Chat space.</p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Space
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spaces.map((space) => (
              <div key={space.id} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(space)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSpace(space)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{space.displayName}</h3>
                <p className="text-sm text-gray-500 mb-4">Type: {space.type}</p>
                
                <div className="flex items-center justify-between text-sm text-gray-500 border-t pt-4">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Google Chat
                  </span>
                  <a 
                    href={`https://mail.google.com/chat/u/0/#chat/space/${space.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Open in Chat &rarr;
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {(showCreateModal || editingSpace) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingSpace ? 'Edit Space' : 'Create New Space'}
              </h2>
              
              <form onSubmit={editingSpace ? handleUpdateSpace : handleCreateSpace}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Space Name
                  </label>
                  <input
                    type="text"
                    value={spaceName}
                    onChange={(e) => setSpaceName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Marketing Team"
                    autoFocus
                    required
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingSpace(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingSpace ? 'Save Changes' : 'Create Space'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

