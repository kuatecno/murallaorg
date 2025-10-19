'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, DollarSign, Calendar, Clock, Edit, Trash2 } from 'lucide-react';

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'OWNER' | 'EMPLOYEE';
  isActive: boolean;
  salary?: number;
  salaryType: 'HOURLY' | 'MONTHLY';
  hourlyRate?: number;
  vacationDaysTotal: number;
  vacationDaysUsed: number;
  createdAt: string;
}

type StaffFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'OWNER' | 'EMPLOYEE';
  salary: string;
  salaryType: 'HOURLY' | 'MONTHLY';
  hourlyRate: string;
  vacationDaysTotal: string;
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<StaffFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'EMPLOYEE',
    salary: '',
    salaryType: 'MONTHLY',
    hourlyRate: '',
    vacationDaysTotal: '15'
  });
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    loadStaff();
  }, [router]);

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
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedStaff(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'EMPLOYEE',
      salary: '',
      salaryType: 'MONTHLY',
      hourlyRate: '',
      vacationDaysTotal: '15'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (staffMember: Staff) => {
    setIsEditMode(true);
    setSelectedStaff(staffMember);
    setFormData({
      firstName: staffMember.firstName,
      lastName: staffMember.lastName,
      email: staffMember.email,
      phone: staffMember.phone || '',
      role: staffMember.role,
      salary: staffMember.salary?.toString() || '',
      salaryType: staffMember.salaryType,
      hourlyRate: staffMember.hourlyRate?.toString() || '',
      vacationDaysTotal: staffMember.vacationDaysTotal.toString()
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userData = localStorage.getItem('user');
    if (!userData) return;
    const user = JSON.parse(userData);

    const body: any = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone || null,
      role: formData.role,
      salaryType: formData.salaryType,
      vacationDaysTotal: parseInt(formData.vacationDaysTotal)
    };

    if (formData.salaryType === 'MONTHLY') {
      body.salary = formData.salary ? parseFloat(formData.salary) : null;
      body.hourlyRate = null;
    } else {
      body.hourlyRate = formData.hourlyRate ? parseFloat(formData.hourlyRate) : null;
      body.salary = null;
    }

    try {
      const url = isEditMode ? `/api/staff/${selectedStaff?.id}` : '/api/staff';
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
        loadStaff();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save staff member');
      }
    } catch (error) {
      console.error('Error saving staff:', error);
      alert('Failed to save staff member');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    const userData = localStorage.getItem('user');
    if (!userData) return;
    const user = JSON.parse(userData);

    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': user.tenantId,
        }
      });

      if (response.ok) {
        loadStaff();
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
    }
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      ADMIN: { label: 'Admin', color: 'bg-purple-100 text-purple-800' },
      OWNER: { label: 'Owner', color: 'bg-red-100 text-red-800' },
      EMPLOYEE: { label: 'Employee', color: 'bg-gray-100 text-gray-800' }
    };
    const badge = badges[role as keyof typeof badges];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading staff...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
              <p className="text-gray-600 mt-1">Manage your team and payroll</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/staff/shifts')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Shifts
              </button>
              <button
                onClick={() => router.push('/staff/attendance')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Clock className="w-4 h-4 mr-2" />
                Attendance
              </button>
              <button
                onClick={() => router.push('/staff/payroll')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Payroll
              </button>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Staff
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
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Staff</dt>
                    <dd className="text-lg font-semibold text-gray-900">{staff.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {staff.filter(s => s.isActive).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Monthly Payroll</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {staff.filter(s => s.salaryType === 'MONTHLY').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-orange-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Hourly</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {staff.filter(s => s.salaryType === 'HOURLY').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Team Members</h3>
          </div>

          {staff.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No staff members</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding your first team member.</p>
              <div className="mt-6">
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Staff Member
                </button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {staff.map((member) => (
                <li key={member.id} className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {member.firstName[0]}{member.lastName[0]}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {member.firstName} {member.lastName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-gray-500">{member.email}</p>
                            {member.phone && (
                              <>
                                <span className="text-gray-300">•</span>
                                <p className="text-sm text-gray-500">{member.phone}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Role */}
                      <div className="text-right">
                        {getRoleBadge(member.role)}
                      </div>

                      {/* Salary Info */}
                      <div className="text-right min-w-[120px]">
                        {member.salaryType === 'MONTHLY' ? (
                          <>
                            <p className="text-sm font-semibold text-gray-900">
                              ${member.salary?.toLocaleString()}/mo
                            </p>
                            <p className="text-xs text-gray-500">Monthly</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-gray-900">
                              ${member.hourlyRate}/hr
                            </p>
                            <p className="text-xs text-gray-500">Hourly</p>
                          </>
                        )}
                      </div>

                      {/* Vacation Days */}
                      <div className="text-right min-w-[100px]">
                        <p className="text-sm font-semibold text-gray-900">
                          {member.vacationDaysTotal - member.vacationDaysUsed} days
                        </p>
                        <p className="text-xs text-gray-500">
                          {member.vacationDaysUsed}/{member.vacationDaysTotal} used
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(member)}
                          className="p-2 text-gray-400 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="p-2 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {isEditMode ? 'Edit Staff Member' : 'Add New Staff Member'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        style={{ color: '#111827' }}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        style={{ color: '#111827' }}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        style={{ color: '#111827' }}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        style={{ color: '#111827' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        style={{ color: '#111827' }}
                        required
                      >
                        <option value="EMPLOYEE">Employee</option>
                        <option value="ADMIN">Admin</option>
                        <option value="OWNER">Owner</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Salary Type
                      </label>
                      <select
                        value={formData.salaryType}
                        onChange={(e) => setFormData({ ...formData, salaryType: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        style={{ color: '#111827' }}
                        required
                      >
                        <option value="MONTHLY">Monthly</option>
                        <option value="HOURLY">Hourly</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {formData.salaryType === 'MONTHLY' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Monthly Salary
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.salary}
                          onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          style={{ color: '#111827' }}
                          placeholder="0.00"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Hourly Rate
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.hourlyRate}
                          onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          style={{ color: '#111827' }}
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vacation Days (Annual)
                      </label>
                      <input
                        type="number"
                        value={formData.vacationDaysTotal}
                        onChange={(e) => setFormData({ ...formData, vacationDaysTotal: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        style={{ color: '#111827' }}
                        required
                      />
                    </div>
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
                      {isEditMode ? 'Save Changes' : 'Add Staff Member'}
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
