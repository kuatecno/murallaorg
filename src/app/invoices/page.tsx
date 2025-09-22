'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Eye, Download, CheckCircle, XCircle, Clock, RefreshCw, Settings, X } from 'lucide-react'

interface Invoice {
  id: string
  folio: string
  type: string
  emitterName: string
  totalAmount: number
  status: string
  issuedAt: string
  createdAt: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [showSyncConfig, setShowSyncConfig] = useState(false)
  const [syncConfig, setSyncConfig] = useState({
    months: 3,
    fromDate: '',
    toDate: '',
    chunkSize: 90
  })
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    startDate: '',
    endDate: '',
    search: ''
  })
  const [stats, setStats] = useState({
    total: 0,
    issued: 0,
    draft: 0,
    rejected: 0
  })
  const [syncStatus, setSyncStatus] = useState<any>(null)

  useEffect(() => {
    fetchInvoices()
    fetchSyncStatus()
  }, [])

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync/status')
      if (response.ok) {
        const data = await response.json()
        setSyncStatus(data)
      }
    } catch (err) {
      console.error('Error fetching sync status:', err)
    }
  }

  const handleManualSync = async (customConfig?: any) => {
    try {
      setSyncing(true)

      // Use custom config or default sync config
      const config = customConfig || syncConfig

      // Build query parameters or request body
      const syncParams: any = {}

      if (config.months > 0) {
        syncParams.months = config.months
      } else if (config.fromDate && config.toDate) {
        syncParams.fromDate = config.fromDate
        syncParams.toDate = config.toDate
      }

      if (config.chunkSize && config.chunkSize !== 90) {
        syncParams.chunkSize = config.chunkSize
      }

      console.log('Starting sync with config:', syncParams)

      const response = await fetch('/api/sync/openfactura', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: Object.keys(syncParams).length > 0 ? JSON.stringify(syncParams) : undefined
      })

      const result = await response.json()

      if (response.ok) {
        // Refresh data after successful sync
        await fetchInvoices()
        await fetchSyncStatus()
        console.log('Sync completed:', result)
      } else {
        throw new Error(result.error || 'Sync failed')
      }
    } catch (err) {
      console.error('Sync error:', err)
      setError(`Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSyncing(false)
    }
  }

  const fetchInvoices = async (useFilters = false) => {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams()
      if (useFilters) {
        if (filters.type) params.append('type', filters.type)
        if (filters.status) params.append('status', filters.status)
        if (filters.startDate) params.append('dateFrom', filters.startDate)
        if (filters.endDate) params.append('dateTo', filters.endDate)
        if (filters.search) params.append('search', filters.search)
      }

      const url = `/api/invoices${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        setInvoices(data.data || [])

        // Calculate stats from the current data
        const invoiceList = data.data || []
        setStats({
          total: invoiceList.length,
          issued: invoiceList.filter((inv: Invoice) => inv.status.toLowerCase() === 'approved').length,
          draft: invoiceList.filter((inv: Invoice) => inv.status.toLowerCase() === 'draft').length,
          rejected: invoiceList.filter((inv: Invoice) => inv.status.toLowerCase() === 'rejected').length,
        })
      } else {
        throw new Error('Failed to fetch invoices')
      }
    } catch (err) {
      setError('Failed to load invoices')
      console.error('Error fetching invoices:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'text-green-600 bg-green-100'
      case 'draft': return 'text-yellow-600 bg-yellow-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': case 'rejected': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL')
  }

  const formatSyncTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('es-CL')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Received Tax Documents</h1>
            <p className="text-gray-600 mt-2">Manage your received invoices and tax documents</p>
          </div>
          <div className="flex gap-3">
            <div className="flex space-x-2">
              <button
                onClick={() => handleManualSync()}
                disabled={syncing}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing...' : 'Quick Sync'}</span>
              </button>
              <button
                onClick={() => setShowSyncConfig(true)}
                disabled={syncing}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Settings className="h-5 w-5" />
                <span>Advanced Sync</span>
              </button>
            </div>
            <button
              onClick={() => fetchInvoices()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              🔄 Refresh
            </button>
            <Link
              href="/invoices/create"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Create Invoice</span>
            </Link>
          </div>
        </div>

        {/* Sync Status */}
        {syncStatus && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Sync Status</h3>
                {syncStatus.sync.lastSync && (
                  <p className="text-sm text-gray-500">
                    Last sync: {formatSyncTime(syncStatus.sync.lastSync.endTime)}
                    ({syncStatus.sync.lastSync.newDocuments} new, {syncStatus.sync.lastSync.updatedDocuments} updated)
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  syncStatus.sync.isOverdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {syncStatus.sync.isOverdue ? 'Sync Overdue' : 'Up to Date'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
            <div className="text-sm font-medium text-blue-600 mb-2">Total Documents</div>
            <div className="text-3xl font-bold text-blue-700">{stats.total}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
            <div className="text-sm font-medium text-green-600 mb-2">Approved</div>
            <div className="text-3xl font-bold text-green-700">{stats.issued}</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-6">
            <div className="text-sm font-medium text-yellow-600 mb-2">Draft</div>
            <div className="text-3xl font-bold text-yellow-700">{stats.draft}</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-6">
            <div className="text-sm font-medium text-red-600 mb-2">Rejected</div>
            <div className="text-3xl font-bold text-red-700">{stats.rejected}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={e => setFilters({...filters, type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="FACTURA">Factura</option>
                <option value="BOLETA">Boleta</option>
                <option value="NOTA_CREDITO">Nota de Crédito</option>
                <option value="NOTA_DEBITO">Nota de Débito</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={e => setFilters({...filters, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="APPROVED">Approved</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={e => setFilters({...filters, startDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={e => setFilters({...filters, endDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search (Folio/RUT/Name)</label>
              <input
                type="text"
                value={filters.search}
                onChange={e => setFilters({...filters, search: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 12345 or 11.111.111-1"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => fetchInvoices(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Apply Filters
            </button>
            <button
              onClick={() => {
                setFilters({ type: '', status: '', startDate: '', endDate: '', search: '' });
                fetchInvoices(false);
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
              <p className="text-gray-500 mb-6">Sync with OpenFactura to import received tax documents</p>
              <button
                onClick={handleManualSync}
                disabled={syncing}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-3 rounded-lg inline-flex items-center space-x-2 transition-colors"
              >
                <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Emitter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.folio || `#${invoice.id.slice(-8)}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {invoice.type}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{invoice.emitterName || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(invoice.totalAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {getStatusIcon(invoice.status)}
                          <span className="capitalize">{invoice.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.issuedAt || invoice.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/invoices/${invoice.id}`}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                            title="View document"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')}
                            className="text-green-600 hover:text-green-900 p-1 rounded transition-colors"
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sync Configuration Modal */}
      {showSyncConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Advanced Sync Configuration</h3>
              <button
                onClick={() => setShowSyncConfig(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sync Period
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="syncMethod"
                      checked={syncConfig.months > 0}
                      onChange={() => setSyncConfig(prev => ({ ...prev, months: 3, fromDate: '', toDate: '' }))}
                      className="mr-2"
                    />
                    <span>Last </span>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={syncConfig.months}
                      onChange={(e) => setSyncConfig(prev => ({ ...prev, months: parseInt(e.target.value) || 1 }))}
                      className="mx-2 w-16 px-2 py-1 border border-gray-300 rounded text-center"
                    />
                    <span> months</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="syncMethod"
                      checked={syncConfig.fromDate !== '' || syncConfig.toDate !== ''}
                      onChange={() => setSyncConfig(prev => ({ ...prev, months: 0 }))}
                      className="mr-2"
                    />
                    <span>Custom date range</span>
                  </label>

                  {(syncConfig.fromDate !== '' || syncConfig.toDate !== '' || syncConfig.months === 0) && (
                    <div className="ml-6 space-y-2">
                      <div>
                        <label className="block text-xs text-gray-600">From Date</label>
                        <input
                          type="date"
                          value={syncConfig.fromDate}
                          onChange={(e) => setSyncConfig(prev => ({ ...prev, fromDate: e.target.value, months: 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600">To Date</label>
                        <input
                          type="date"
                          value={syncConfig.toDate}
                          onChange={(e) => setSyncConfig(prev => ({ ...prev, toDate: e.target.value, months: 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Call Chunk Size (days per request)
                </label>
                <select
                  value={syncConfig.chunkSize}
                  onChange={(e) => setSyncConfig(prev => ({ ...prev, chunkSize: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value={30}>30 days (faster, more API calls)</option>
                  <option value={60}>60 days (balanced)</option>
                  <option value={90}>90 days (default)</option>
                  <option value={120}>120 days (slower, fewer API calls)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Smaller chunks = faster processing but more API calls
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <h4 className="text-sm font-medium text-blue-900 mb-1">Sync Preview</h4>
                <p className="text-xs text-blue-700">
                  {syncConfig.months > 0
                    ? `Will sync documents from the last ${syncConfig.months} month${syncConfig.months > 1 ? 's' : ''}`
                    : syncConfig.fromDate && syncConfig.toDate
                    ? `Will sync documents from ${syncConfig.fromDate} to ${syncConfig.toDate}`
                    : 'Please configure date range'
                  }
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  API requests will be made in {syncConfig.chunkSize}-day chunks
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => setShowSyncConfig(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleManualSync(syncConfig)
                  setShowSyncConfig(false)
                }}
                disabled={syncing || (syncConfig.months === 0 && (!syncConfig.fromDate || !syncConfig.toDate))}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-md transition-colors"
              >
                Start Advanced Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}