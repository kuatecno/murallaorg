'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, Clock, Edit, Trash2, X, Repeat } from 'lucide-react';

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  dayOfWeek?: number;
  isRecurring: boolean;
  specificDate?: string;
  staff: Staff;
}

type ShiftFormData = {
  name: string;
  staffId: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  dayOfWeek: string;
  specificDate: string;
};

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState<ShiftFormData>({
    name: '',
    staffId: '',
    startTime: '09:00',
    endTime: '17:00',
    isRecurring: true,
    dayOfWeek: '1',
    specificDate: new Date().toISOString().split('T')[0]
  });
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    loadShifts();
    loadStaff();
  }, [router]);

  const loadShifts = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const response = await fetch('/api/staff/shifts', {
        headers: {
          'x-tenant-id': user.tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setShifts(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const response = await fetch('/api/staff', {
        headers: {
          'x-tenant-id': user.tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStaff(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading staff:', error);
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedShift(null);
    setFormData({
      name: '',
      staffId: staff.length > 0 ? staff[0].id : '',
      startTime: '09:00',
      endTime: '17:00',
      isRecurring: true,
      dayOfWeek: '1',
      specificDate: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const openEditModal = (shift: Shift) => {
    setIsEditMode(true);
    setSelectedShift(shift);

    const startTime = new Date(shift.startTime);
    const endTime = new Date(shift.endTime);

    setFormData({
      name: shift.name,
      staffId: shift.staff.id,
      startTime: `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`,
      endTime: `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`,
      isRecurring: shift.isRecurring,
      dayOfWeek: shift.dayOfWeek?.toString() || '1',
      specificDate: shift.specificDate ? new Date(shift.specificDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userData = localStorage.getItem('user');
    if (!userData) return;
    const user = JSON.parse(userData);

    // Build datetime from time inputs
    const today = new Date();
    const startDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(),
      parseInt(formData.startTime.split(':')[0]),
      parseInt(formData.startTime.split(':')[1])
    );
    const endDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(),
      parseInt(formData.endTime.split(':')[0]),
      parseInt(formData.endTime.split(':')[1])
    );

    const body: any = {
      name: formData.name,
      staffId: formData.staffId,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      isRecurring: formData.isRecurring
    };

    if (formData.isRecurring) {
      body.dayOfWeek = parseInt(formData.dayOfWeek);
    } else {
      body.specificDate = new Date(formData.specificDate).toISOString();
    }

    try {
      const url = isEditMode ? `/api/staff/shifts/${selectedShift?.id}` : '/api/staff/shifts';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user.tenantId,
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setIsModalOpen(false);
        loadShifts();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save shift');
      }
    } catch (error) {
      console.error('Error saving shift:', error);
      alert('Failed to save shift');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;

    const userData = localStorage.getItem('user');
    if (!userData) return;
    const user = JSON.parse(userData);

    try {
      const response = await fetch(`/api/staff/shifts/${id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': user.tenantId,
        }
      });

      if (response.ok) {
        loadShifts();
      }
    } catch (error) {
      console.error('Error deleting shift:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getDayName = (dayNum: number) => {
    return DAYS_OF_WEEK.find(d => d.value === dayNum)?.label || '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shifts...</p>
        </div>
      </div>
    );
  }

  const recurringShifts = shifts.filter(s => s.isRecurring);
  const oneTimeShifts = shifts.filter(s => !s.isRecurring);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Shift Scheduling</h1>
              <p className="text-gray-600 mt-1">Manage recurring and one-time shifts</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/staff')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Back to Staff
              </button>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Shift
              </button>
            </div>
          </div>
        </div>

        {/* Recurring Shifts */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center gap-2">
            <Repeat className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recurring Shifts</h3>
            <span className="text-sm text-gray-500">({recurringShifts.length})</span>
          </div>

          {recurringShifts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No recurring shifts scheduled</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {recurringShifts.map((shift) => (
                <li key={shift.id} className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{shift.name}</p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                            <span className="font-medium">{getDayName(shift.dayOfWeek!)}</span>
                            <span>•</span>
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(shift.startTime)} - {formatTime(shift.endTime)}</span>
                            <span>•</span>
                            <span>{shift.staff.firstName} {shift.staff.lastName}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(shift)}
                        className="p-2 text-gray-400 hover:text-blue-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(shift.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* One-Time Shifts */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">One-Time Shifts</h3>
            <span className="text-sm text-gray-500">({oneTimeShifts.length})</span>
          </div>

          {oneTimeShifts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No one-time shifts scheduled</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {oneTimeShifts.map((shift) => (
                <li key={shift.id} className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <Calendar className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{shift.name}</p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                            <span className="font-medium">
                              {new Date(shift.specificDate!).toLocaleDateString()}
                            </span>
                            <span>•</span>
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(shift.startTime)} - {formatTime(shift.endTime)}</span>
                            <span>•</span>
                            <span>{shift.staff.firstName} {shift.staff.lastName}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(shift)}
                        className="p-2 text-gray-400 hover:text-blue-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(shift.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isEditMode ? 'Edit Shift' : 'Create New Shift'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shift Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      style={{ color: '#111827' }}
                      placeholder="e.g., Morning Shift"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Staff Member
                    </label>
                    <select
                      value={formData.staffId}
                      onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      style={{ color: '#111827' }}
                      required
                    >
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.firstName} {member.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        style={{ color: '#111827' }}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        style={{ color: '#111827' }}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isRecurring}
                        onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Recurring Shift</span>
                    </label>
                  </div>

                  {formData.isRecurring ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Day of Week
                      </label>
                      <select
                        value={formData.dayOfWeek}
                        onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        style={{ color: '#111827' }}
                        required
                      >
                        {DAYS_OF_WEEK.map((day) => (
                          <option key={day.value} value={day.value}>
                            {day.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={formData.specificDate}
                        onChange={(e) => setFormData({ ...formData, specificDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        style={{ color: '#111827' }}
                        required
                      />
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      {isEditMode ? 'Save Changes' : 'Create Shift'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
