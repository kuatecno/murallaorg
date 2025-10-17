'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download, CheckCircle, XCircle, Clock, Edit, Trash2, Plus } from 'lucide-react'
import TopNavigation from '@/components/layout/TopNavigation'

interface InvoiceItem {
  id: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface Invoice {
  id: string
  type: string
  folio: string
  emitterRUT: string
  emitterName: string
  receiverRUT: string
  receiverName: string
  netAmount: number
  taxAmount: number
  totalAmount: number
  currency: string
  status: string
  issuedAt: string
  createdAt: string
  updatedAt: string
  pdfUrl?: string
  items: InvoiceItem[]
  expenses?: Array<{
    id: string
    amount: number
    category: {
      id: string
      name: string
      emoji: string
      color: string
    }
    status: {
      id: string
      name: string
      color: string
    }
    paymentAccount?: {
      id: string
      name: string
      type: string
    }
    staff?: {
      id: string
      firstName: string
      lastName: string
    }
  }>
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState('')

  useEffect(() => {
    if (params.id) {
      fetchInvoice(params.id as string)
    }
  }, [params.id])

  const fetchInvoice = async (id: string) => {
    try {
      const response = await fetch(`/api/invoices/${id}`)
      if (response.ok) {
        const data = await response.json()
        setInvoice(data.data)
      } else if (response.status === 404) {
        setError('Invoice not found')
      } else {
        throw new Error('Failed to fetch invoice')
      }
    } catch (err) {
      setError('Failed to load invoice')
      console.error('Error fetching invoice:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateExpense = async () => {
    if (!invoice) return

    setActionLoading('generate-expense')
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/expense`, {
        method: 'POST'
      })

      if (response.ok) {
        // Refresh invoice to show the new expense
        await fetchInvoice(invoice.id)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to generate expense')
      }
    } catch (err) {
      setError('Failed to generate expense')
    } finally {
      setActionLoading('')
    }
  }

  const handleApprove = async () => {
    if (!invoice) return

    setActionLoading('approve')
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/approve`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setInvoice(data.data)
      } else {
        throw new Error('Failed to approve invoice')
      }
    } catch (err) {
      setError('Failed to approve invoice')
    } finally {
      setActionLoading('')
    }
  }

  const handleDownloadPDF = () => {
    if (invoice) {
      window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'issued': return 'text-green-600 bg-green-100'
      case 'draft': return 'text-yellow-600 bg-yellow-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'issued': return <CheckCircle className="h-5 w-5" />
      case 'cancelled': case 'rejected': return <XCircle className="h-5 w-5" />
      default: return <Clock className="h-5 w-5" />
    }
  }

  const formatCurrency = (amount: number, currency: string = 'CLP') => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-lg p-6 space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <>
        <TopNavigation
          title="Invoice Not Found"
          subtitle="The requested invoice could not be loaded"
          showBackButton={true}
          backHref="/invoices"
        />
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="mx-auto h-24 w-24 text-red-400 mb-4">
                <XCircle className="h-full w-full" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {error || 'Invoice not found'}
              </h3>
              <p className="text-gray-500">The requested invoice could not be loaded.</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopNavigation
        title={`Invoice ${invoice.folio || `#${invoice.id.slice(-8)}`}`}
        subtitle={invoice.type}
        showBackButton={true}
        backHref="/invoices"
      />
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="flex justify-end items-start">
              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                {getStatusIcon(invoice.status)}
                <span className="capitalize">{invoice.status}</span>
                </span>
                <div className="flex space-x-2">
                  <button
                  onClick={handleDownloadPDF}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Download PDF</span>
                </button>
                {invoice.status.toLowerCase() === 'draft' && (
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading === 'approve'}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>{actionLoading === 'approve' ? 'Approving...' : 'Approve'}</span>
                  </button>
                )}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Emitter Information */}
            <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">From</h2>
            <div className="space-y-2">
              <p className="font-medium text-gray-900">{invoice.emitterName || 'N/A'}</p>
              <p className="text-gray-600">RUT: {invoice.emitterRUT || 'N/A'}</p>
            </div>
          </div>

          {/* Receiver Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">To</h2>
            <div className="space-y-2">
              <p className="font-medium text-gray-900">{invoice.receiverName || 'N/A'}</p>
              <p className="text-gray-600">RUT: {invoice.receiverRUT || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Invoice Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Issue Date</p>
              <p className="font-medium">{formatDate(invoice.issuedAt || invoice.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Currency</p>
              <p className="font-medium">{invoice.currency}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="font-medium">{formatDate(invoice.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Items</h2>

          {invoice.items && invoice.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product/Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(item.unitPrice, invoice.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.totalPrice, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No items found for this invoice</p>
          )}
        </div>

        {/* Linked Expense */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Linked Expense</h2>
            {(!invoice.expenses || invoice.expenses.length === 0) && (
              <button
                onClick={handleGenerateExpense}
                disabled={actionLoading === 'generate-expense'}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{actionLoading === 'generate-expense' ? 'Generating...' : 'Generate Expense'}</span>
              </button>
            )}
          </div>

          {invoice.expenses && invoice.expenses.length > 0 ? (
            <div className="space-y-3">
              {invoice.expenses.map((expense) => (
                <Link
                  key={expense.id}
                  href={`/expenses`}
                  className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3">
                      <span className="text-3xl">{expense.category.emoji}</span>
                      <div>
                        <div className="font-medium text-gray-900">{expense.category.name}</div>
                        {expense.paymentAccount && (
                          <div className="text-sm text-gray-500 mt-1">
                            Payment: {expense.paymentAccount.name} ({expense.paymentAccount.type})
                          </div>
                        )}
                        {expense.staff && (
                          <div className="text-sm text-gray-500 mt-1">
                            Paid by: {expense.staff.firstName} {expense.staff.lastName}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(expense.amount, invoice.currency)}
                      </div>
                      <div
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white mt-1"
                        style={{ backgroundColor: expense.status.color }}
                      >
                        {expense.status.name}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No expense created yet. Click "Generate Expense" to automatically create one from this invoice.
            </p>
          )}
        </div>

        {/* Totals */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Net Amount:</span>
              <span className="font-medium">{formatCurrency(invoice.netAmount, invoice.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax (19%):</span>
              <span className="font-medium">{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total Amount:</span>
              <span>{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  )
}