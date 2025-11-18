'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      router.push('/login');
    }
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Muralla 5.0</h1>
              <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {user.role}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.firstName}!</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Dashboard
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link href="/plannings" className="bg-emerald-50 p-6 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer">
                  <h4 className="text-lg font-semibold text-emerald-900">Tasks & Planning</h4>
                  <p className="text-emerald-700 mt-2">Manage tasks with Google Tasks sync</p>
                </Link>
                <Link href="/invoices" className="bg-indigo-50 p-6 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer">
                  <h4 className="text-lg font-semibold text-indigo-900">Invoices</h4>
                  <p className="text-indigo-700 mt-2">Create and manage tax documents</p>
                </Link>
                <Link href="/expenses" className="bg-orange-50 p-6 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer">
                  <h4 className="text-lg font-semibold text-orange-900">Expenses</h4>
                  <p className="text-orange-700 mt-2">Track expenses and employee reimbursements</p>
                </Link>
                <Link href="/products" className="bg-blue-50 p-6 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                  <h4 className="text-lg font-semibold text-blue-900">Products</h4>
                  <p className="text-blue-700 mt-2">Manage your inventory</p>
                </Link>
                <Link href="/sales" className="bg-green-50 p-6 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                  <h4 className="text-lg font-semibold text-green-900">Sales</h4>
                  <p className="text-green-700 mt-2">Point of sale system</p>
                </Link>
                <Link href="/contacts" className="bg-yellow-50 p-6 rounded-lg hover:bg-yellow-100 transition-colors cursor-pointer">
                  <h4 className="text-lg font-semibold text-yellow-900">Contacts</h4>
                  <p className="text-yellow-700 mt-2">Manage all business contacts</p>
                </Link>
                <Link href="/reports" className="bg-purple-50 p-6 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer">
                  <h4 className="text-lg font-semibold text-purple-900">Reports</h4>
                  <p className="text-purple-700 mt-2">Analytics & insights</p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
