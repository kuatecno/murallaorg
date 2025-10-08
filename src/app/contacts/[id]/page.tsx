'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, Calendar, DollarSign, Star } from 'lucide-react';

interface Contact {
  id: string;
  code: string;
  name: string;
  contactType: string;
  rut?: string;
  email?: string;
  phone?: string;
  contactName?: string;
  address?: string;
  city?: string;
  country?: string;
  creditLimit?: number;
  currentDebt: number;
  paymentTerms?: string;
  rating?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: any;
  staffRelations: any[];
  salesTransactions: any[];
  purchaseOrders: any[];
  _count: {
    salesTransactions: number;
    purchaseOrders: number;
    products: number;
  };
}

type TabType = 'overview' | 'details' | 'activity';

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [activity, setActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    loadContact();
  }, [contactId]);

  useEffect(() => {
    if (activeTab === 'activity' && contact) {
      loadActivity();
    }
  }, [activeTab, contact]);

  const loadContact = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const response = await fetch(`/api/contacts/${contactId}`, {
        headers: {
          'x-tenant-id': user.tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setContact(data);
      } else {
        console.error('Failed to load contact');
        router.push('/contacts');
      }
    } catch (error) {
      console.error('Error loading contact:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async () => {
    setLoadingActivity(true);
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const response = await fetch(`/api/contacts/${contactId}/activity`, {
        headers: {
          'x-tenant-id': user.tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActivity(data.activity);
      }
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setLoadingActivity(false);
    }
  };

  const getContactTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; color: string; icon: string }> = {
      CUSTOMER: { label: 'Customer', color: 'bg-blue-100 text-blue-800', icon: '👤' },
      SUPPLIER: { label: 'Supplier', color: 'bg-green-100 text-green-800', icon: '🏭' },
      BRAND: { label: 'Brand', color: 'bg-pink-100 text-pink-800', icon: '🏷️' },
      AGENT: { label: 'Agent', color: 'bg-yellow-100 text-yellow-800', icon: '🤵' },
      COURIER: { label: 'Courier', color: 'bg-orange-100 text-orange-800', icon: '🚚' },
      INFLUENCER: { label: 'Influencer', color: 'bg-indigo-100 text-indigo-800', icon: '⭐' },
    };
    const badge = badges[type] || badges.CUSTOMER;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <span>{badge.icon}</span>
        {badge.label}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contact...</p>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Contact not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/contacts')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Contacts
          </button>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{contact.name}</h1>
                  {getContactTypeBadge(contact.contactType)}
                  {!contact.isActive && (
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-gray-600">Code: {contact.code}</p>
                {contact.rut && <p className="text-gray-600">RUT: {contact.rut}</p>}
              </div>

              <div className="flex gap-2">
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  <Edit className="h-5 w-5" />
                </button>
                <button className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div>
                <div className="text-sm text-gray-600">Total Sales</div>
                <div className="text-2xl font-bold text-gray-900">{contact._count.salesTransactions}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Orders</div>
                <div className="text-2xl font-bold text-gray-900">{contact._count.purchaseOrders}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Current Debt</div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(contact.currentDebt)}
                </div>
              </div>
              {contact.rating && (
                <div>
                  <div className="text-sm text-gray-600">Rating</div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < contact.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <div className="flex gap-8">
              {(['overview', 'details', 'activity'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contact.contactName && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-600">Contact Person</div>
                        <div className="font-medium">{contact.contactName}</div>
                      </div>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-600">Email</div>
                        <div className="font-medium">{contact.email}</div>
                      </div>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-600">Phone</div>
                        <div className="font-medium">{contact.phone}</div>
                      </div>
                    </div>
                  )}
                  {(contact.address || contact.city) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-600">Address</div>
                        <div className="font-medium">
                          {contact.address && <div>{contact.address}</div>}
                          {contact.city && contact.country && (
                            <div>
                              {contact.city}, {contact.country}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {['CUSTOMER', 'SUPPLIER'].includes(contact.contactType) && (
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {contact.creditLimit && (
                      <div className="flex items-start gap-3">
                        <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm text-gray-600">Credit Limit</div>
                          <div className="font-medium">{formatCurrency(contact.creditLimit)}</div>
                        </div>
                      </div>
                    )}
                    {contact.paymentTerms && (
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm text-gray-600">Payment Terms</div>
                          <div className="font-medium">{contact.paymentTerms}</div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-600">Current Debt</div>
                        <div className="font-medium text-red-600">
                          {formatCurrency(contact.currentDebt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {contact.contactType === 'CUSTOMER' &&
                    contact.salesTransactions.slice(0, 5).map((transaction: any) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">Sale</div>
                          <div className="text-sm text-gray-600">
                            {formatDate(transaction.createdAt)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(transaction.total)}</div>
                          <div className="text-sm text-gray-600">{transaction.status}</div>
                        </div>
                      </div>
                    ))}
                  {contact.contactType === 'SUPPLIER' &&
                    contact.purchaseOrders.slice(0, 5).map((po: any) => (
                      <div key={po.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">Purchase Order {po.orderNumber}</div>
                          <div className="text-sm text-gray-600">{formatDate(po.createdAt)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(po.total)}</div>
                          <div className="text-sm text-gray-600">{po.status}</div>
                        </div>
                      </div>
                    ))}
                  {contact.salesTransactions.length === 0 && contact.purchaseOrders.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No recent activity</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">All Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <div className="text-gray-900">{contact.code}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <div className="text-gray-900">{contact.name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <div>{getContactTypeBadge(contact.contactType)}</div>
                </div>
                {contact.rut && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
                    <div className="text-gray-900">{contact.rut}</div>
                  </div>
                )}
                {contact.email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="text-gray-900">{contact.email}</div>
                  </div>
                )}
                {contact.phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <div className="text-gray-900">{contact.phone}</div>
                  </div>
                )}
                {contact.contactName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                    <div className="text-gray-900">{contact.contactName}</div>
                  </div>
                )}
                {contact.address && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <div className="text-gray-900">{contact.address}</div>
                  </div>
                )}
                {contact.city && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <div className="text-gray-900">{contact.city}</div>
                  </div>
                )}
                {contact.country && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <div className="text-gray-900">{contact.country}</div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                  <div className="text-gray-900">{formatDate(contact.createdAt)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                  <div className="text-gray-900">{formatDate(contact.updatedAt)}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Activity History</h3>
              {loadingActivity ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading activity...</p>
                </div>
              ) : activity.length > 0 ? (
                <div className="space-y-3">
                  {activity.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              item.type === 'sale'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {item.type === 'sale' ? 'Sale' : 'Purchase'}
                          </span>
                          <span className="text-sm text-gray-600">{formatDate(item.date)}</span>
                        </div>
                        <div className="font-medium text-gray-900">{item.description}</div>
                        {item.items && item.items.length > 0 && (
                          <div className="mt-2 text-sm text-gray-600">
                            {item.items.slice(0, 3).map((product: any, idx: number) => (
                              <div key={idx}>
                                {product.quantity}x {product.productName}
                              </div>
                            ))}
                            {item.items.length > 3 && (
                              <div className="text-gray-500">+{item.items.length - 3} more items</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-bold text-gray-900">{formatCurrency(item.amount)}</div>
                        <div className="text-sm text-gray-600">{item.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No activity found</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
