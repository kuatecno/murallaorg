'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, CheckCircle, XCircle, Clock, X } from 'lucide-react';

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  vacationDaysTotal: number;
  vacationDaysUsed: number;
}

interface PTORequest {
  id: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  requestedDate: string;
  approvedDate?: string;
  approvedBy?: string;
  staff: Staff;
}

type PTOFormData = {
  staffId: string;
  startDate: string;
  endDate: string;
  reason: string;
};

export default function PTOPage() {
  const [ptoRequests, setPTORequests] = useState<PTORequest[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<PTOFormData>({
    staffId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: ''
  });
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    loadPTORequests();
    loadStaff();
  }, [router]);

  const loadPTORequests = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const response = await fetch('/api/staff/pto', {
        headers: {
          'x-tenant-id': user.tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPTORequests(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading PTO requests:', error);
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
          if (data.data.length > 0) {
            setFormData(prev => ({ ...prev, staffId: data.data[0].id }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading staff:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userData = localStorage.getItem('user');
    if (!userData) return;
    const user = JSON.parse(userData);

    try {
      const response = await fetch('/api/staff/pto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user.tenantId,
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setIsModalOpen(false);
        setFormData({
          staffId: staff.length > 0 ? staff[0].id : '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          reason: ''
        });
        loadPTORequests();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create PTO request');
      }
    } catch (error) {
      console.error('Error creating PTO request:', error);
      alert('Failed to create PTO request');
    }
  };

  const handleApprove = async (id: string) => {
    const userData = localStorage.getItem('user');
    if (!userData) return;
    const user = JSON.parse(userData);

    try {
      const response = await fetch(`/api/staff/pto/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user.tenantId,
        },
        body: JSON.stringify({ approvedBy: user.id })
      });

      if (response.ok) {
        loadPTORequests();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to approve PTO request');
      }
    } catch (error) {
      console.error('Error approving PTO request:', error);
      alert('Failed to approve PTO request');
    }
  };

  const handleDeny = async (id: string) => {
    const reason = prompt('Reason for denial (optional):');
    if (reason === null) return; // User cancelled

    const userData = localStorage.getItem('user');
    if (!userData) return;
    const user = JSON.parse(userData);

    try {
      const response = await fetch(`/api/staff/pto/${id}/deny`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user.tenantId,
        },
        body: JSON.stringify({
          deniedBy: user.id,
          denialReason: reason
        })
      });

      if (response.ok) {
        loadPTORequests();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to deny PTO request');
      }
    } catch (error) {
      console.error('Error denying PTO request:', error);
      alert('Failed to deny PTO request');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      DENIED: { label: 'Denied', color: 'bg-red-100 text-red-800', icon: XCircle }
    };
    const badge = badges[status as keyof typeof badges];
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PTO requests...</p>
        </div>
      </div>
    );
  }

  const pendingRequests = ptoRequests.filter(r => r.status === 'PENDING');
  const approvedRequests = ptoRequests.filter(r => r.status === 'APPROVED');
  const deniedRequests = ptoRequests.filter(r => r.status === 'DENIED');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">PTO Management</h1>
              <p className="text-gray-600 mt-1">Manage time-off requests and vacation days</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/staff')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Back to Staff
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Request PTO
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Requests</dt>
                    <dd className="text-lg font-semibold text-gray-900">{ptoRequests.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                    <dd className="text-lg font-semibold text-gray-900">{pendingRequests.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Approved</dt>
                    <dd className="text-lg font-semibold text-gray-900">{approvedRequests.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Denied</dt>
                    <dd className="text-lg font-semibold text-gray-900">{deniedRequests.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <h3 className="text-lg leading-6 font-medium text-gray-900">Pending Requests</h3>
              <span className="text-sm text-gray-500">({pendingRequests.length})</span>
            </div>

            <ul className="divide-y divide-gray-200">
              {pendingRequests.map((request) => (
                <li key={request.id} className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-yellow-600" />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {request.staff.firstName} {request.staff.lastName}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span>
                              {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                            </span>
                            <span>•</span>
                            <span>{request.daysRequested} days</span>
                            {request.reason && (
                              <>
                                <span>•</span>
                                <span className="italic">"{request.reason}"</span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Requested {new Date(request.requestedDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right min-w-[100px]">
                        <p className="text-sm text-gray-600">
                          {request.staff.vacationDaysTotal - request.staff.vacationDaysUsed} days left
                        </p>
                        <p className="text-xs text-gray-400">
                          {request.staff.vacationDaysUsed}/{request.staff.vacationDaysTotal} used
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="px-3 py-1 text-xs border border-green-600 text-green-600 rounded hover:bg-green-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDeny(request.id)}
                          className="px-3 py-1 text-xs border border-red-600 text-red-600 rounded hover:bg-red-50"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* All Requests */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">All PTO Requests</h3>
          </div>

          {ptoRequests.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No PTO requests</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a time-off request.</p>
              <div className="mt-6">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Request PTO
                </button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {ptoRequests.map((request) => (
                <li key={request.id} className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {request.staff.firstName[0]}{request.staff.lastName[0]}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {request.staff.firstName} {request.staff.lastName}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                            </span>
                            <span>•</span>
                            <span>{request.daysRequested} days</span>
                          </div>
                          {request.reason && (
                            <p className="text-xs text-gray-500 italic mt-1">"{request.reason}"</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right min-w-[100px]">
                        <p className="text-xs text-gray-500">
                          Requested {new Date(request.requestedDate).toLocaleDateString()}
                        </p>
                        {request.approvedDate && (
                          <p className="text-xs text-gray-500">
                            {request.status === 'APPROVED' ? 'Approved' : 'Denied'} {new Date(request.approvedDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <div className="min-w-[100px]">
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Create Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Request Time Off</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                          {member.firstName} {member.lastName} ({member.vacationDaysTotal - member.vacationDaysUsed} days left)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        style={{ color: '#111827' }}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        style={{ color: '#111827' }}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason (Optional)
                    </label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      style={{ color: '#111827' }}
                      rows={3}
                      placeholder="e.g., Family vacation"
                    />
                  </div>

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
                      Submit Request
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
