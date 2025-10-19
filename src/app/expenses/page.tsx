'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Filter, Download, DollarSign, Users, Clock, CheckCircle, X } from 'lucide-react';

interface Expense {
  id: string;
  date: string;
  supplier: string;
  description: string;
  amount: number;
  currency: string;
  paymentType: 'COMPANY_ACCOUNT' | 'EMPLOYEE_PAID' | 'PERSONAL' | 'MIXED';
  isCompanyExpense: boolean;
  receiptImageUrl?: string;
  receiptPublicId?: string;
  hasReceipt?: boolean;
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

interface ExpenseFormData {
  date: string;
  supplier: string;
  description: string;
  amount: string;
  currency: string;
  documentType: string;
  documentNumber: string;
  notes: string;
  paymentType: string;
  paymentAccountId: string;
  staffId: string;
  categoryId: string;
  statusId: string;
  isCompanyExpense: boolean;
  receiptImageUrl: string;
  receiptPublicId: string;
}

interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

interface Status {
  id: string;
  name: string;
  color: string;
}

interface PaymentAccount {
  id: string;
  name: string;
  type: string;
  bank?: string;
}

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
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

  // Modal and form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>({
    date: new Date().toISOString().split('T')[0],
    supplier: '',
    description: '',
    amount: '',
    currency: 'CLP',
    documentType: 'OTRO',
    documentNumber: '',
    notes: '',
    paymentType: 'COMPANY_ACCOUNT',
    paymentAccountId: '',
    staffId: '',
    categoryId: '',
    statusId: '',
    isCompanyExpense: true,
    receiptImageUrl: '',
    receiptPublicId: ''
  });
  const [editFormData, setEditFormData] = useState<ExpenseFormData>({
    date: new Date().toISOString().split('T')[0],
    supplier: '',
    description: '',
    amount: '',
    currency: 'CLP',
    documentType: 'OTRO',
    documentNumber: '',
    notes: '',
    paymentType: 'COMPANY_ACCOUNT',
    paymentAccountId: '',
    staffId: '',
    categoryId: '',
    statusId: '',
    isCompanyExpense: true,
    receiptImageUrl: '',
    receiptPublicId: ''
  });

  useEffect(() => {
    fetchExpenses();
    fetchSummary();
  }, [filters]);

  useEffect(() => {
    if (isModalOpen) {
      fetchFormData();
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (isEditModalOpen && selectedExpense) {
      fetchFormData().then(() => {
        // Set form data after fetching accounts and staff
        setEditFormData({
          date: new Date(selectedExpense.date).toISOString().split('T')[0],
          supplier: selectedExpense.supplier,
          description: selectedExpense.description,
          amount: selectedExpense.amount.toString(),
          currency: selectedExpense.currency,
          documentType: selectedExpense.taxDocument?.type || 'OTRO',
          documentNumber: selectedExpense.taxDocument?.folio || '',
          notes: '',
          paymentType: selectedExpense.paymentType,
          paymentAccountId: selectedExpense.paymentAccount?.id || '',
          staffId: selectedExpense.staff?.id || '',
          categoryId: selectedExpense.category.id,
          statusId: selectedExpense.status.id,
          isCompanyExpense: selectedExpense.isCompanyExpense,
          receiptImageUrl: '',
          receiptPublicId: ''
        });
      });
    }
  }, [isEditModalOpen, selectedExpense]);

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

  const fetchFormData = async () => {
    try {
      // Fetch categories
      const categoriesResponse = await fetch('/api/expenses/categories');
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        if (categoriesData.success) {
          setCategories(categoriesData.data);
          if (categoriesData.data.length > 0 && !formData.categoryId) {
            setFormData(prev => ({ ...prev, categoryId: categoriesData.data[0].id }));
          }
        }
      }

      // Fetch statuses
      const statusesResponse = await fetch('/api/expenses/statuses');
      if (statusesResponse.ok) {
        const statusesData = await statusesResponse.json();
        if (statusesData.success) {
          setStatuses(statusesData.data);
          const defaultStatus = statusesData.data.find((s: Status) => s.name === 'Pending Review');
          if (defaultStatus && !formData.statusId) {
            setFormData(prev => ({ ...prev, statusId: defaultStatus.id }));
          } else if (statusesData.data.length > 0 && !formData.statusId) {
            setFormData(prev => ({ ...prev, statusId: statusesData.data[0].id }));
          }
        }
      }

      // Fetch payment accounts
      const accountsResponse = await fetch('/api/payment-accounts');
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        if (accountsData.success) {
          setPaymentAccounts(accountsData.data);
          if (accountsData.data.length > 0 && !formData.paymentAccountId) {
            setFormData(prev => ({ ...prev, paymentAccountId: accountsData.data[0].id }));
          }
        }
      }

      // Fetch staff
      const staffResponse = await fetch('/api/staff');
      if (staffResponse.ok) {
        const staffData = await staffResponse.json();
        if (staffData.success) {
          setStaff(staffData.data);
        }
      }
    } catch (error) {
      console.error('Error fetching form data:', error);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });

      const data = await response.json();

      if (data.success) {
        // Reset form and close modal
        setFormData({
          date: new Date().toISOString().split('T')[0],
          supplier: '',
          description: '',
          amount: '',
          currency: 'CLP',
          documentType: 'OTRO',
          documentNumber: '',
          notes: '',
          paymentType: 'COMPANY_ACCOUNT',
          paymentAccountId: formData.paymentAccountId,
          staffId: '',
          categoryId: formData.categoryId,
          statusId: formData.statusId,
          isCompanyExpense: true,
          receiptImageUrl: '',
          receiptPublicId: ''
        });
        setUploadedImage(null);
        setIsModalOpen(false);

        // Refresh expenses list
        fetchExpenses();
      } else {
        alert('Error creating expense: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Error creating expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload JPG, PNG, WebP, or HEIC images.');
      return;
    }

    const maxSizeMB = 10;
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File size exceeds ${maxSizeMB}MB. Please upload a smaller image.`);
      return;
    }

    setUploading(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch('/api/expenses/upload', {
        method: 'POST',
        body: formDataUpload
      });

      const data = await response.json();

      if (data.success) {
        setFormData(prev => ({
          ...prev,
          receiptImageUrl: data.data.url,
          receiptPublicId: data.data.publicId
        }));
        setUploadedImage(data.data.url);
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setFormData(prev => ({
      ...prev,
      receiptImageUrl: '',
      receiptPublicId: ''
    }));
  };

  const handleInputChange = (field: keyof ExpenseFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setUploadedImage(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      supplier: '',
      description: '',
      amount: '',
      currency: 'CLP',
      documentType: 'OTRO',
      documentNumber: '',
      notes: '',
      paymentType: 'COMPANY_ACCOUNT',
      paymentAccountId: paymentAccounts.length > 0 ? paymentAccounts[0].id : '',
      staffId: '',
      categoryId: categories.length > 0 ? categories[0].id : '',
      statusId: statuses.length > 0 ? statuses[0].id : '',
      isCompanyExpense: true,
      receiptImageUrl: '',
      receiptPublicId: ''
    });
  };

  const formatCurrency = (amount: number, currency: string = 'CLP') => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const handleExpenseClick = (expense: Expense) => {
    console.log('Expense clicked:', expense.id);
    setSelectedExpense(expense);
    setIsEditModalOpen(true);
  };

  const handlePaymentAssignment = async (expenseId: string, paymentType: string, staffId?: string) => {
    try {
      const updateData: any = {
        paymentType: paymentType === 'COMPANY' ? 'COMPANY_ACCOUNT' : 'EMPLOYEE_PAID',
        staffId: paymentType === 'COMPANY' ? null : staffId,
        paymentAccountId: paymentType === 'COMPANY' ? (paymentAccounts[0]?.id || null) : null
      };

      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (data.success) {
        fetchExpenses();
      } else {
        alert('Error updating payment: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Error updating payment');
    }
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedExpense(null);
  };

  const handleEditInputChange = (field: keyof ExpenseFormData, value: any) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;

    setIsSubmitting(true);

    try {
      // Ensure paymentAccountId is set for COMPANY_ACCOUNT
      const updateData = {
        ...editFormData,
        amount: parseFloat(editFormData.amount),
        paymentAccountId: editFormData.paymentType === 'COMPANY_ACCOUNT'
          ? (editFormData.paymentAccountId || paymentAccounts[0]?.id)
          : null,
        staffId: editFormData.paymentType === 'EMPLOYEE_PAID' ? editFormData.staffId : null
      };

      const response = await fetch(`/api/expenses/${selectedExpense.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (data.success) {
        closeEditModal();
        fetchExpenses();
      } else {
        alert('Error updating expense: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Error updating expense');
    } finally {
      setIsSubmitting(false);
    }
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
              <button
                onClick={openModal}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
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
              All Expenses
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
                <button
                  onClick={openModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add your first expense
                </button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {expenses.map((expense) => (
                <li key={expense.id} className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1 cursor-pointer" onClick={() => handleExpenseClick(expense)}>
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
                                  <Link
                                    href={`/invoices/${expense.taxDocument.id}`}
                                    className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    📄 Invoice {expense.taxDocument.folio}
                                  </Link>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex items-center space-x-4">
                      {/* Inline Payment Assignment */}
                      <div className="min-w-[140px]">
                        <select
                          value={expense.paymentType === 'COMPANY_ACCOUNT' ? 'COMPANY' : expense.staff?.id || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            const value = e.target.value;
                            if (value === 'COMPANY') {
                              handlePaymentAssignment(expense.id, 'COMPANY');
                            } else {
                              handlePaymentAssignment(expense.id, 'EMPLOYEE', value);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          style={{ color: '#111827' }}
                        >
                          <option value="COMPANY">Company</option>
                          {staff.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.firstName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status Badge */}
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: expense.status.color }}
                      >
                        {expense.status.name}
                      </span>

                      {/* Amount */}
                      <div className="text-right min-w-[100px]">
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

        {/* Add Expense Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Add New Expense</h3>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" style={{ color: '#111827' }}
                        required
                      />
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount <span className="text-red-500">*</span>
                      </label>
                      <div className="flex">
                        <input
                          type="number"
                          step="0.01"
                          value={formData.amount}
                          onChange={(e) => handleInputChange('amount', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                          required
                        />
                        <select
                          value={formData.currency}
                          onChange={(e) => handleInputChange('currency', e.target.value)}
                          className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                        >
                          <option value="CLP">CLP</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => handleInputChange('supplier', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" style={{ color: '#111827' }}
                      placeholder="Enter supplier name"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" style={{ color: '#111827' }}
                      placeholder="Describe the expense"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.categoryId}
                        onChange={(e) => handleInputChange('categoryId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" style={{ color: '#111827' }}
                        required
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.emoji} {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.statusId}
                        onChange={(e) => handleInputChange('statusId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" style={{ color: '#111827' }}
                        required
                      >
                        <option value="">Select a status</option>
                        {statuses.map((status) => (
                          <option key={status.id} value={status.id}>
                            {status.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Payment Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.paymentType}
                      onChange={(e) => {
                        handleInputChange('paymentType', e.target.value);
                        // Clear staff selection when switching away from EMPLOYEE_PAID
                        if (e.target.value !== 'EMPLOYEE_PAID') {
                          handleInputChange('staffId', '');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" style={{ color: '#111827' }}
                      required
                    >
                      <option value="COMPANY_ACCOUNT">Company Account</option>
                      <option value="EMPLOYEE_PAID">Employee Paid</option>
                      <option value="PERSONAL">Personal</option>
                      <option value="MIXED">Mixed</option>
                    </select>
                  </div>

                  {/* Payment Account (only if COMPANY_ACCOUNT) */}
                  {formData.paymentType === 'COMPANY_ACCOUNT' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Account <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.paymentAccountId}
                        onChange={(e) => handleInputChange('paymentAccountId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" style={{ color: '#111827' }}
                        required
                      >
                        <option value="">Select a payment account</option>
                        {paymentAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name} ({account.type}){account.bank && ` - ${account.bank}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Staff (only if EMPLOYEE_PAID) */}
                  {formData.paymentType === 'EMPLOYEE_PAID' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Staff Member <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.staffId}
                        onChange={(e) => handleInputChange('staffId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" style={{ color: '#111827' }}
                        required
                      >
                        <option value="">Select a staff member</option>
                        {staff.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.firstName} {member.lastName} ({member.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Document Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Document Type
                      </label>
                      <select
                        value={formData.documentType}
                        onChange={(e) => handleInputChange('documentType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" style={{ color: '#111827' }}
                      >
                        <option value="FACTURA">Factura</option>
                        <option value="BOLETA">Boleta</option>
                        <option value="NOTA_CREDITO">Nota de Crédito</option>
                        <option value="NOTA_DEBITO">Nota de Débito</option>
                        <option value="OTRO">Otro</option>
                      </select>
                    </div>

                    {/* Document Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Document Number
                      </label>
                      <input
                        type="text"
                        value={formData.documentNumber}
                        onChange={(e) => handleInputChange('documentNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" style={{ color: '#111827' }}
                        placeholder="Enter document number"
                      />
                    </div>
                  </div>

                  {/* Company Expense Toggle */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isCompanyExpense"
                      checked={formData.isCompanyExpense}
                      onChange={(e) => handleInputChange('isCompanyExpense', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isCompanyExpense" className="ml-2 block text-sm text-gray-900">
                      This is a company expense
                    </label>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" style={{ color: '#111827' }}
                      rows={3}
                      placeholder="Additional notes (optional)"
                    />
                  </div>

                  {/* Receipt Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Receipt/Boleta Image
                    </label>
                    {!uploadedImage && !formData.receiptImageUrl ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="receipt-upload"
                          disabled={uploading}
                        />
                        <label
                          htmlFor="receipt-upload"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          {uploading ? (
                            <>
                              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-3"></div>
                              <p className="text-sm text-gray-600">Uploading...</p>
                            </>
                          ) : (
                            <>
                              <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <p className="text-sm text-gray-600 mb-1">Click to upload receipt image</p>
                              <p className="text-xs text-gray-500">PNG, JPG, WebP up to 10MB</p>
                            </>
                          )}
                        </label>
                      </div>
                    ) : (
                      <div className="relative border border-gray-300 rounded-lg p-4">
                        <img
                          src={uploadedImage || formData.receiptImageUrl}
                          alt="Receipt preview"
                          className="max-h-64 mx-auto rounded"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 pt-6">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Expense'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Expense Modal */}
        {isEditModalOpen && selectedExpense && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeEditModal}></div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <form onSubmit={handleEditSubmit}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Edit Expense
                      </h3>
                      <button
                        type="button"
                        onClick={closeEditModal}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Date</label>
                        <input
                          type="date"
                          value={editFormData.date}
                          onChange={(e) => handleEditInputChange('date', e.target.value)}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                          style={{ color: '#111827' }}
                          required
                        />
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Amount</label>
                        <input
                          type="number"
                          value={editFormData.amount}
                          onChange={(e) => handleEditInputChange('amount', e.target.value)}
                          step="0.01"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                          style={{ color: '#111827' }}
                          required
                        />
                      </div>

                      {/* Supplier */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Supplier</label>
                        <input
                          type="text"
                          value={editFormData.supplier}
                          onChange={(e) => handleEditInputChange('supplier', e.target.value)}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                          style={{ color: '#111827' }}
                          required
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <select
                          value={editFormData.categoryId}
                          onChange={(e) => handleEditInputChange('categoryId', e.target.value)}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                          style={{ color: '#111827' }}
                          required
                        >
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.emoji} {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Description */}
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <input
                          type="text"
                          value={editFormData.description}
                          onChange={(e) => handleEditInputChange('description', e.target.value)}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                          style={{ color: '#111827' }}
                          required
                        />
                      </div>

                      {/* Payment Type - CRITICAL FIELD */}
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Paid By</label>
                        <select
                          value={editFormData.paymentType === 'COMPANY_ACCOUNT' ? 'COMPANY' : editFormData.staffId}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === 'COMPANY') {
                              handleEditInputChange('paymentType', 'COMPANY_ACCOUNT');
                              handleEditInputChange('staffId', '');
                            } else {
                              handleEditInputChange('paymentType', 'EMPLOYEE_PAID');
                              handleEditInputChange('staffId', value);
                            }
                          }}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                          style={{ color: '#111827' }}
                          required
                        >
                          <option value="COMPANY">Company Account</option>
                          {staff.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.firstName} {s.lastName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                          value={editFormData.statusId}
                          onChange={(e) => handleEditInputChange('statusId', e.target.value)}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                          style={{ color: '#111827' }}
                          required
                        >
                          {statuses.map((status) => (
                            <option key={status.id} value={status.id}>
                              {status.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Currency */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Currency</label>
                        <select
                          value={editFormData.currency}
                          onChange={(e) => handleEditInputChange('currency', e.target.value)}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                          style={{ color: '#111827' }}
                        >
                          <option value="CLP">CLP (Chilean Peso)</option>
                          <option value="USD">USD (US Dollar)</option>
                          <option value="EUR">EUR (Euro)</option>
                        </select>
                      </div>

                      {/* Receipt Image */}
                      {selectedExpense.receiptImageUrl && (
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Image</label>
                          <div className="border border-gray-300 rounded-lg p-4">
                            <img
                              src={selectedExpense.receiptImageUrl}
                              alt="Receipt"
                              className="max-h-64 mx-auto rounded"
                            />
                          </div>
                        </div>
                      )}

                      {/* Document Info */}
                      {selectedExpense.taxDocument && (
                        <div className="sm:col-span-2 bg-blue-50 p-3 rounded-md">
                          <p className="text-sm text-gray-700">
                            <strong>Linked to Invoice:</strong> {selectedExpense.taxDocument.type} {selectedExpense.taxDocument.folio}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-blue-300"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={closeEditModal}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancel
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