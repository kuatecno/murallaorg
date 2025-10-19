'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, DollarSign, Calendar, CheckCircle, Clock, X } from 'lucide-react';

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  salaryType: 'HOURLY' | 'MONTHLY';
}

interface PayrollRun {
  id: string;
  periodStart: string;
  periodEnd: string;
  hoursWorked?: number;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  status: 'PENDING' | 'APPROVED' | 'PAID';
  paidDate?: string;
  staff: Staff;
}

type CalculationData = {
  staff: Staff & { salary?: number; hourlyRate?: number };
  period: { startDate: string; endDate: string };
  calculation: {
    daysWorked: number;
    totalHours: number;
    grossAmount: number;
    deductions: number;
    netAmount: number;
  };
  attendance: Array<{ date: string; hours?: number; status: string }>;
};

export default function PayrollPage() {
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCalculateModalOpen, setIsCalculateModalOpen] = useState(false);
  const [calculationResult, setCalculationResult] = useState<CalculationData | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [periodStart, setPeriodStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().split('T')[0]);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    loadPayrollRuns();
    loadStaff();
  }, [router]);

  const loadPayrollRuns = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const response = await fetch('/api/staff/payroll/runs', {
        headers: {
          'x-tenant-id': user.tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPayrollRuns(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading payroll runs:', error);
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
            setSelectedStaffId(data.data[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading staff:', error);
    }
  };

  const handleCalculate = async () => {
    const userData = localStorage.getItem('user');
    if (!userData) return;
    const user = JSON.parse(userData);

    try {
      const response = await fetch('/api/staff/payroll/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user.tenantId,
        },
        body: JSON.stringify({
          staffId: selectedStaffId,
          startDate: periodStart,
          endDate: periodEnd
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCalculationResult(data.data);
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to calculate payroll');
      }
    } catch (error) {
      console.error('Error calculating payroll:', error);
      alert('Failed to calculate payroll');
    }
  };

  const handleCreatePayrollRun = async () => {
    if (!calculationResult) return;

    const userData = localStorage.getItem('user');
    if (!userData) return;
    const user = JSON.parse(userData);

    try {
      const response = await fetch('/api/staff/payroll/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user.tenantId,
        },
        body: JSON.stringify({
          staffId: selectedStaffId,
          periodStart,
          periodEnd,
          hoursWorked: calculationResult.calculation.totalHours,
          grossAmount: calculationResult.calculation.grossAmount,
          deductions: calculationResult.calculation.deductions,
          netAmount: calculationResult.calculation.netAmount
        })
      });

      if (response.ok) {
        setIsCalculateModalOpen(false);
        setCalculationResult(null);
        loadPayrollRuns();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create payroll run');
      }
    } catch (error) {
      console.error('Error creating payroll run:', error);
      alert('Failed to create payroll run');
    }
  };

  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'PAID') => {
    const userData = localStorage.getItem('user');
    if (!userData) return;
    const user = JSON.parse(userData);

    const body: any = { status };
    if (status === 'PAID') {
      body.paidDate = new Date().toISOString();
    }

    try {
      const response = await fetch(`/api/staff/payroll/runs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user.tenantId,
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        loadPayrollRuns();
      }
    } catch (error) {
      console.error('Error updating payroll run:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      APPROVED: { label: 'Approved', color: 'bg-blue-100 text-blue-800' },
      PAID: { label: 'Paid', color: 'bg-green-100 text-green-800' }
    };
    const badge = badges[status as keyof typeof badges];
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
          <p className="text-gray-600">Loading payroll...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
              <p className="text-gray-600 mt-1">Calculate and manage payroll runs</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/staff')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Back to Staff
              </button>
              <button
                onClick={() => setIsCalculateModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Calculate Payroll
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
                  <DollarSign className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Runs</dt>
                    <dd className="text-lg font-semibold text-gray-900">{payrollRuns.length}</dd>
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
                    <dd className="text-lg font-semibold text-gray-900">
                      {payrollRuns.filter(p => p.status === 'PENDING').length}
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
                  <CheckCircle className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Approved</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {payrollRuns.filter(p => p.status === 'APPROVED').length}
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
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Paid</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {payrollRuns.filter(p => p.status === 'PAID').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payroll Runs Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Payroll Runs</h3>
          </div>

          {payrollRuns.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payroll runs</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by calculating payroll for your staff.</p>
              <div className="mt-6">
                <button
                  onClick={() => setIsCalculateModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Calculate Payroll
                </button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {payrollRuns.map((run) => (
                <li key={run.id} className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {run.staff.firstName} {run.staff.lastName}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(run.periodStart).toLocaleDateString()} - {new Date(run.periodEnd).toLocaleDateString()}
                            </span>
                            {run.hoursWorked && (
                              <>
                                <span>•</span>
                                <Clock className="w-3 h-3" />
                                <span>{run.hoursWorked} hours</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Amounts */}
                      <div className="text-right min-w-[120px]">
                        <p className="text-sm font-semibold text-gray-900">
                          ${run.netAmount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Gross: ${run.grossAmount.toLocaleString()}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="min-w-[100px]">
                        {getStatusBadge(run.status)}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {run.status === 'PENDING' && (
                          <button
                            onClick={() => handleUpdateStatus(run.id, 'APPROVED')}
                            className="px-3 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
                          >
                            Approve
                          </button>
                        )}
                        {run.status === 'APPROVED' && (
                          <button
                            onClick={() => handleUpdateStatus(run.id, 'PAID')}
                            className="px-3 py-1 text-xs border border-green-600 text-green-600 rounded hover:bg-green-50"
                          >
                            Mark Paid
                          </button>
                        )}
                        {run.status === 'PAID' && run.paidDate && (
                          <p className="text-xs text-gray-500">
                            Paid {new Date(run.paidDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Calculate Modal */}
        {isCalculateModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Calculate Payroll</h3>
                  <button
                    onClick={() => {
                      setIsCalculateModalOpen(false);
                      setCalculationResult(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {!calculationResult ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Staff Member
                      </label>
                      <select
                        value={selectedStaffId}
                        onChange={(e) => setSelectedStaffId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        style={{ color: '#111827' }}
                      >
                        {staff.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.firstName} {member.lastName} ({member.salaryType})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Period Start
                        </label>
                        <input
                          type="date"
                          value={periodStart}
                          onChange={(e) => setPeriodStart(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          style={{ color: '#111827' }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Period End
                        </label>
                        <input
                          type="date"
                          value={periodEnd}
                          onChange={(e) => setPeriodEnd(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          style={{ color: '#111827' }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        onClick={() => setIsCalculateModalOpen(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCalculate}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Calculate
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {calculationResult.staff.firstName} {calculationResult.staff.lastName}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {new Date(calculationResult.period.startDate).toLocaleDateString()} - {new Date(calculationResult.period.endDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="text-xs text-gray-600">Days Worked</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {calculationResult.calculation.daysWorked}
                        </p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="text-xs text-gray-600">Total Hours</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {calculationResult.calculation.totalHours}
                        </p>
                      </div>
                      <div className="bg-green-50 p-3 rounded">
                        <p className="text-xs text-gray-600">Gross Amount</p>
                        <p className="text-lg font-semibold text-gray-900">
                          ${calculationResult.calculation.grossAmount.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-red-50 p-3 rounded">
                        <p className="text-xs text-gray-600">Deductions</p>
                        <p className="text-lg font-semibold text-gray-900">
                          ${calculationResult.calculation.deductions.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="bg-green-100 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Net Amount</p>
                      <p className="text-2xl font-bold text-green-800">
                        ${calculationResult.calculation.netAmount.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        onClick={() => setCalculationResult(null)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Recalculate
                      </button>
                      <button
                        onClick={handleCreatePayrollRun}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Create Payroll Run
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
