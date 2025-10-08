'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import CreateContactModal from '@/components/contacts/CreateContactModal';

interface Contact {
  id: string;
  code: string;
  name: string;
  contactType: 'CUSTOMER' | 'SUPPLIER' | 'BRAND' | 'AGENT' | 'COURIER' | 'INFLUENCER';
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
  _count: {
    salesTransactions: number;
    purchaseOrders: number;
  };
}

type FilterType = 'ALL' | 'CUSTOMER' | 'SUPPLIER' | 'BRAND' | 'AGENT' | 'COURIER' | 'INFLUENCER';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    loadContacts();
  }, [router]);

  const loadContacts = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const response = await fetch('/api/contacts', {
        headers: {
          'x-tenant-id': user.tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setContacts(data);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesType = filterType === 'ALL' || contact.contactType === filterType;
    const matchesSearch =
      searchQuery === '' ||
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.rut?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getContactTypeBadge = (type: string) => {
    const badges = {
      CUSTOMER: { label: 'Customer', color: 'bg-blue-100 text-blue-800', icon: '👤' },
      SUPPLIER: { label: 'Supplier', color: 'bg-green-100 text-green-800', icon: '🏭' },
      BRAND: { label: 'Brand', color: 'bg-pink-100 text-pink-800', icon: '🏷️' },
      AGENT: { label: 'Agent', color: 'bg-yellow-100 text-yellow-800', icon: '🤵' },
      COURIER: { label: 'Courier', color: 'bg-orange-100 text-orange-800', icon: '🚚' },
      INFLUENCER: { label: 'Influencer', color: 'bg-indigo-100 text-indigo-800', icon: '⭐' },
    };
    const badge = badges[type as keyof typeof badges] || badges.CUSTOMER;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
            <p className="mt-2 text-gray-600">Manage all your business contacts: customers, suppliers, brands, agents, couriers, and influencers</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            New Contact
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-2 overflow-x-auto">
            {(['ALL', 'CUSTOMER', 'SUPPLIER', 'BRAND', 'AGENT', 'COURIER', 'INFLUENCER'] as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                  filterType === type
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {type === 'ALL' ? 'All' : type.charAt(0) + type.slice(1).toLowerCase() + 's'}
                <span className="ml-2 text-sm text-gray-400">
                  ({type === 'ALL' ? contacts.length : contacts.filter(c => c.contactType === type).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by name, code, RUT, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Contacts Table */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RUT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Debt
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No contacts found
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => router.push(`/contacts/${contact.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {contact.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                      {contact.city && <div className="text-sm text-gray-500">{contact.city}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getContactTypeBadge(contact.contactType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contact.rut || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contact.email && (
                        <div className="text-sm text-gray-900">{contact.email}</div>
                      )}
                      {contact.phone && (
                        <div className="text-sm text-gray-500">{contact.phone}</div>
                      )}
                      {!contact.email && !contact.phone && (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contact.contactType === 'CUSTOMER' ? (
                        <div>Sales: {contact._count.salesTransactions}</div>
                      ) : null}
                      {contact.contactType === 'SUPPLIER' ? (
                        <div>Orders: {contact._count.purchaseOrders}</div>
                      ) : null}
                      {!['CUSTOMER', 'SUPPLIER'].includes(contact.contactType) ? (
                        <span className="text-gray-400">-</span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contact.currentDebt > 0 ? (
                        <span className="text-sm font-medium text-red-600">
                          {formatCurrency(contact.currentDebt)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Contacts</div>
            <div className="text-2xl font-bold text-gray-900">{contacts.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">👤 Customers</div>
            <div className="text-2xl font-bold text-blue-600">
              {contacts.filter(c => c.contactType === 'CUSTOMER').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">🏭 Suppliers</div>
            <div className="text-2xl font-bold text-green-600">
              {contacts.filter(c => c.contactType === 'SUPPLIER').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">🏷️ Brands</div>
            <div className="text-2xl font-bold text-pink-600">
              {contacts.filter(c => c.contactType === 'BRAND').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">🤵 Agents</div>
            <div className="text-2xl font-bold text-yellow-600">
              {contacts.filter(c => c.contactType === 'AGENT').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">🚚 Couriers</div>
            <div className="text-2xl font-bold text-orange-600">
              {contacts.filter(c => c.contactType === 'COURIER').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">⭐ Influencers</div>
            <div className="text-2xl font-bold text-indigo-600">
              {contacts.filter(c => c.contactType === 'INFLUENCER').length}
            </div>
          </div>
        </div>
      </div>

      {/* Create Contact Modal */}
      <CreateContactModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadContacts}
      />
    </div>
  );
}
