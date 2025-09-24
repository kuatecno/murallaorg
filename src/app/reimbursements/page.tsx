'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Users, Clock, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  rut: string;
}

interface PaymentAccount {
  id: string;
  name: string;
  type: string;
  bank?: string;
}

interface Expense {
  id: string;
  date: string;
  supplier: string;
  description: string;
  amount: number;
  currency: string;
  category: {
    name: string;
    emoji: string;
  };
  taxDocument?: {
    id: string;
    folio: string;
    emitterName: string;
  };
}

interface Reimbursement {
  id: string;
  description: string;
  totalAmount: number;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'PARTIALLY_PAID' | 'REJECTED' | 'CANCELLED';
  paidDate?: string;
  paidAmount?: number;
  paymentReference?: string;
  notes?: string;
  createdAt: string;
  staff: Staff;
  paymentAccount?: PaymentAccount;
  expenses: Expense[];
}

export default function ReimbursementsPage() {
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  useEffect(() => {
    fetchReimbursements();
  }, [selectedStatus]);

  const fetchReimbursements = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedStatus) params.append('status', selectedStatus);

      const response = await fetch(`/api/reimbursements?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setReimbursements(data.data.reimbursements);
      }
    } catch (error) {
      console.error('Error fetching reimbursements:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'CLP') => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-blue-100 text-blue-800';
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PARTIALLY_PAID': return 'bg-indigo-100 text-indigo-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4" />;
      case 'APPROVED': return <CheckCircle className="w-4 h-4" />;
      case 'PAID': return <CheckCircle className="w-4 h-4" />;
      case 'PARTIALLY_PAID': return <AlertCircle className="w-4 h-4" />;
      case 'REJECTED': return <AlertCircle className="w-4 h-4" />;
      case 'CANCELLED': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleCreateReimbursement = async () => {
    // This would open a modal to select staff and create reimbursement
    console.log('Create reimbursement');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reimbursements...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Employee Reimbursements</h1>
              <p className="text-gray-600 mt-1">Manage employee expense reimbursements</p>
            </div>
            <button
              onClick={handleCreateReimbursement}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Reimbursement
            </button>
          </div>
        </div>

        {/* Status Filter */}
        <div className="mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedStatus('')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                selectedStatus === '' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            {['PENDING', 'APPROVED', 'PAID', 'REJECTED'].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  selectedStatus === status ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Reimbursements List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {reimbursements.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No reimbursements</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a reimbursement for employee expenses.
              </p>
              <div className="mt-6">
                <button
                  onClick={handleCreateReimbursement}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first reimbursement
                </button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {reimbursements.map((reimbursement) => (
                <li key={reimbursement.id} className="px-4 py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {reimbursement.description}
                            </p>
                            <div className="flex items-center mt-1 space-x-2 text-sm text-gray-500">
                              <span>{reimbursement.staff.firstName} {reimbursement.staff.lastName}</span>
                              <span>•</span>
                              <span>{reimbursement.expenses.length} expense{reimbursement.expenses.length !== 1 ? 's' : ''}</span>
                              <span>•</span>
                              <span>{new Date(reimbursement.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Expense Details */}
                        <div className="mt-3">
                          <div className="flex flex-wrap gap-2">
                            {reimbursement.expenses.slice(0, 3).map((expense) => (
                              <div key={expense.id} className="flex items-center bg-gray-50 px-2 py-1 rounded text-xs">
                                <span className="mr-1">{expense.category.emoji}</span>
                                <span className="text-gray-600 truncate max-w-32">
                                  {expense.description}
                                </span>
                                <span className="ml-1 font-medium text-gray-800">
                                  {formatCurrency(expense.amount, expense.currency)}
                                </span>
                              </div>
                            ))}
                            {reimbursement.expenses.length > 3 && (
                              <div className="flex items-center text-xs text-gray-500">
                                +{reimbursement.expenses.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Payment Info */}
                        {reimbursement.status === 'PAID' && reimbursement.paidDate && (
                          <div className="mt-2 text-xs text-green-600">
                            Paid {formatCurrency(reimbursement.paidAmount || reimbursement.totalAmount)} on{' '}
                            {new Date(reimbursement.paidDate).toLocaleDateString()}
                            {reimbursement.paymentAccount && (
                              <span> via {reimbursement.paymentAccount.name}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4 flex-shrink-0 flex items-center space-x-4">
                      {/* Status Badge */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(reimbursement.status)}`}>
                        <span className="mr-1">
                          {getStatusIcon(reimbursement.status)}
                        </span>
                        {reimbursement.status.charAt(0) + reimbursement.status.slice(1).toLowerCase().replace('_', ' ')}
                      </span>

                      {/* Amount */}
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(reimbursement.totalAmount, reimbursement.currency)}
                        </p>
                        {reimbursement.status === 'PARTIALLY_PAID' && reimbursement.paidAmount && (
                          <p className="text-xs text-gray-600">
                            Paid: {formatCurrency(reimbursement.paidAmount)}
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
      </div>
    </div>
  );
}