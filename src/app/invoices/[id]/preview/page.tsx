'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Building, User, Calendar, DollarSign, Package, CheckCircle, AlertCircle } from 'lucide-react'

interface DocumentPreview {
  document: {
    id: string
    type: string
    folio: string
    documentCode: number
    status: string
    issuedAt: string
    createdAt: string
    currency: string
  }
  header: any
  emitter: {
    rut: string
    name: string
    businessLine?: string
    email?: string
    phone?: string
    address?: string
    commune?: string
    economicActivity?: any
  }
  receiver: {
    rut: string
    name: string
    businessLine?: string
    contact?: string
    address?: string
    commune?: string
  }
  totals: {
    netAmount: number
    taxAmount: number
    totalAmount: number
    exemptAmount: number
    additionalTaxes: any[]
  }
  items: Array<{
    id: string
    lineNumber: number
    productName: string
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
    unitOfMeasure?: string
    productCode?: string
    exemptAmount: number
    discount: number
    rawItem?: any
  }>
  reception: {
    siiDate?: string
    openFacturaDate?: string
    status?: string
  }
  metadata: {
    hasLineItems: boolean
    hasDetailedData: boolean
    documentTypeName?: string
    isExempt: boolean
    lastUpdated: string
  }
}

export default function DocumentPreviewPage() {
  const params = useParams()
  const [preview, setPreview] = useState<DocumentPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/invoices/${params.id}/preview`)

        if (response.ok) {
          const data = await response.json()
          setPreview(data.data)
        } else {
          throw new Error('Failed to fetch document preview')
        }
      } catch (err) {
        setError('Failed to load document preview')
        console.error('Error fetching preview:', err)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchPreview()
    }
  }, [params.id])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: preview?.document.currency || 'CLP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString))
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document preview...</p>
        </div>
      </div>
    )
  }

  if (error || !preview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Document</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/invoices" className="text-blue-600 hover:text-blue-800 underline">
            Back to Invoices
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/invoices"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Invoices
              </Link>
              <div className="h-6 border-l border-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">
                Document Preview
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(preview.document.status)}`}>
                {preview.document.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Document Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {preview.metadata.documentTypeName || preview.document.type}
                  </h2>
                  <p className="text-gray-600">N° {preview.document.folio}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Document Code</p>
                <p className="text-lg font-semibold text-gray-900">{preview.document.documentCode}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Issue Date</p>
                  <p className="font-medium">{formatDate(preview.document.issuedAt)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-medium text-lg text-green-600">
                    {formatCurrency(preview.totals.totalAmount)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Package className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Line Items</p>
                  <p className="font-medium">{preview.items.length} items</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Emitter */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Building className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Emitter</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Company</p>
                  <p className="font-semibold text-gray-900">{preview.emitter.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">RUT</p>
                  <p className="font-semibold text-gray-900">{preview.emitter.rut}</p>
                </div>
                {preview.emitter.businessLine && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Business Line</p>
                    <p className="font-semibold text-gray-900">{preview.emitter.businessLine}</p>
                  </div>
                )}
                {preview.emitter.address && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Address</p>
                    <p className="font-semibold text-gray-900">{preview.emitter.address}</p>
                    {preview.emitter.commune && (
                      <p className="text-sm font-medium text-gray-700">{preview.emitter.commune}</p>
                    )}
                  </div>
                )}
                {preview.emitter.email && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="font-semibold text-gray-900">{preview.emitter.email}</p>
                  </div>
                )}
                {preview.emitter.phone && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Phone</p>
                    <p className="font-semibold text-gray-900">{preview.emitter.phone}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Receiver */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <User className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Receiver</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Company</p>
                  <p className="font-semibold text-gray-900">{preview.receiver.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">RUT</p>
                  <p className="font-semibold text-gray-900">{preview.receiver.rut}</p>
                </div>
                {preview.receiver.businessLine && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Business Line</p>
                    <p className="font-semibold text-gray-900">{preview.receiver.businessLine}</p>
                  </div>
                )}
                {preview.receiver.address && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Address</p>
                    <p className="font-semibold text-gray-900">{preview.receiver.address}</p>
                    {preview.receiver.commune && (
                      <p className="text-sm font-medium text-gray-700">{preview.receiver.commune}</p>
                    )}
                  </div>
                )}
                {preview.receiver.contact && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Contact</p>
                    <p className="font-semibold text-gray-900">{preview.receiver.contact}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        {preview.items.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product/Service
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.items.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{item.productName}</p>
                            {item.description && item.description !== item.productName && (
                              <p className="text-sm text-gray-500">{item.description}</p>
                            )}
                            {item.productCode && (
                              <p className="text-xs text-gray-400">Code: {item.productCode}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-gray-900">
                            {item.quantity}
                            {item.unitOfMeasure && (
                              <span className="text-sm text-gray-500 ml-1">{item.unitOfMeasure}</span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-900">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-900">
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-base font-medium text-gray-700">Net Amount:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(preview.totals.netAmount)}</span>
              </div>
              {preview.totals.exemptAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-base font-medium text-gray-700">Exempt Amount:</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(preview.totals.exemptAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-base font-medium text-gray-700">Tax (IVA):</span>
                <span className="font-semibold text-gray-900">{formatCurrency(preview.totals.taxAmount)}</span>
              </div>
              <div className="border-t-2 border-gray-300 pt-4">
                <div className="flex justify-between">
                  <span className="text-xl font-bold text-gray-900">Total Amount:</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(preview.totals.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reception Info */}
        {(preview.reception.siiDate || preview.reception.openFacturaDate) && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 mt-6 p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Reception Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {preview.reception.siiDate && (
                <div>
                  <span className="text-gray-600">SII Reception:</span>
                  <span className="ml-2 text-gray-900">{formatDate(preview.reception.siiDate)}</span>
                </div>
              )}
              {preview.reception.openFacturaDate && (
                <div>
                  <span className="text-gray-600">OpenFactura Reception:</span>
                  <span className="ml-2 text-gray-900">{formatDate(preview.reception.openFacturaDate)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}