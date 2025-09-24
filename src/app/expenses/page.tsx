'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Filter, Download, DollarSign, Users, Clock, CheckCircle } from 'lucide-react';

interface Expense {
  id: string;
  date: string;
  supplier: string;
  description: string;
  amount: number;
  currency: string;
  paymentType: 'COMPANY_ACCOUNT' | 'EMPLOYEE_PAID' | 'PERSONAL' | 'MIXED';
  isCompanyExpense: boolean;
  category: {
    id: string;
    name: string;
    emoji: string;
    color: string;
  };
  status: {
    id: string;
    name: string;
    color: string;
  };
  staff?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  paymentAccount?: {
    id: string;
    name: string;
    type: string;
  };
  taxDocument?: {
    id: string;
    folio: string;
    emitterName: string;
    type: string;
  };
  reimbursement?: {
    id: string;
    description: string;
    status: string;
  };
}

interface ExpenseSummary {
  totalExpenses: number;
  companyExpenses: number;
  employeePaidExpenses: number;
  pendingReimbursements: number;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    paymentType: '',
    categoryId: '',
    staffId: '',
    isCompanyExpense: ''
  });

  useEffect(() => {
    fetchExpenses();
    fetchSummary();
  }, [filters]);

  const fetchExpenses = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/expenses?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setExpenses(data.data.expenses);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    // This would be a separate API endpoint for summary statistics
    // For now, calculate from current expenses
    const companyExpenses = expenses.filter(e => e.isCompanyExpense && e.paymentType === 'COMPANY_ACCOUNT');
    const employeePaidExpenses = expenses.filter(e => e.paymentType === 'EMPLOYEE_PAID');
    const pendingReimbursements = expenses.filter(e => e.paymentType === 'EMPLOYEE_PAID' && !e.reimbursement);

    setSummary({
      totalExpenses: expenses.length,
      companyExpenses: companyExpenses.length,
      employeePaidExpenses: employeePaidExpenses.length,
      pendingReimbursements: pendingReimbursements.length
    });
  };

  const formatCurrency = (amount: number, currency: string = 'CLP') => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const getPaymentTypeColor = (paymentType: string) => {
    switch (paymentType) {
      case 'COMPANY_ACCOUNT': return 'bg-blue-100 text-blue-800';
      case 'EMPLOYEE_PAID': return 'bg-orange-100 text-orange-800';
      case 'PERSONAL': return 'bg-gray-100 text-gray-800';
      case 'MIXED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentTypeLabel = (paymentType: string) => {
    switch (paymentType) {
      case 'COMPANY_ACCOUNT': return 'Company Account';
      case 'EMPLOYEE_PAID': return 'Employee Paid';
      case 'PERSONAL': return 'Personal';
      case 'MIXED': return 'Mixed';
      default: return paymentType;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading expenses...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
              <p className="text-gray-600 mt-1">Manage company expenses and employee reimbursements</p>
            </div>
            <div className="flex space-x-3">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Expenses</dt>
                      <dd className="text-lg font-semibold text-gray-900">{summary.totalExpenses}</dd>
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
                      <dt className="text-sm font-medium text-gray-500 truncate">Company Paid</dt>
                      <dd className="text-lg font-semibold text-gray-900">{summary.companyExpenses}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6 text-orange-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Employee Paid</dt>
                      <dd className="text-lg font-semibold text-gray-900">{summary.employeePaidExpenses}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Pending Reimbursement</dt>
                      <dd className="text-lg font-semibold text-gray-900">{summary.pendingReimbursements}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expenses Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Expenses
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new expense or importing from invoices.
              </p>
              <div className="mt-6">
                <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add your first expense
                </button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {expenses.map((expense) => (
                <li key={expense.id} className="px-4 py-4 hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        <span className="text-2xl" title={expense.category.name}>
                          {expense.category.emoji}
                        </span>
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {expense.description}
                            </p>
                            <div className="flex items-center mt-1 space-x-2 text-sm text-gray-500">
                              <span>{expense.supplier}</span>
                              <span>•</span>
                              <span>{new Date(expense.date).toLocaleDateString()}</span>
                              {expense.staff && (
                                <>
                                  <span>•</span>
                                  <span>{expense.staff.firstName} {expense.staff.lastName}</span>
                                </>
                              )}
                              {expense.taxDocument && (
                                <>
                                  <span>•</span>
                                  <span className="text-blue-600">From Invoice {expense.taxDocument.folio}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex items-center space-x-4">
                      {/* Payment Type Badge */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentTypeColor(expense.paymentType)}`}>
                        {getPaymentTypeLabel(expense.paymentType)}
                      </span>

                      {/* Status Badge */}
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: expense.status.color }}
                      >
                        {expense.status.name}
                      </span>

                      {/* Amount */}
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(expense.amount, expense.currency)}
                        </p>
                        {expense.reimbursement && (
                          <p className="text-xs text-orange-600">
                            In reimbursement
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