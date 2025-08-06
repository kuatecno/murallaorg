import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { AuthService } from '../../../services/authService';

// --------------------
// Types
// --------------------
interface PTORequest {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  type: 'vacation' | 'sick' | 'personal' | 'unpaid';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason?: string;
  submittedAt: string;
}

interface PTOBalance {
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  upcomingDays: number;
}

const PTO: React.FC = () => {
  const [requests, setRequests] = useState<PTORequest[]>([]);
  const [balance, setBalance] = useState<PTOBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPtoData = async () => {
    try {
      setLoading(true);
      // Fetch requests
      const reqData = await AuthService.apiCall<{ requests: PTORequest[] }>('/pto/requests');
      setRequests(reqData.requests || []);

      // Fetch balance summary
      const balData = await AuthService.apiCall<{ balance: PTOBalance }>('/pto/balances');
      setBalance(balData.balance);

      setError(null);
    } catch (err) {
      console.error('Failed to load PTO data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load PTO data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPtoData();
  }, []);

  const getStatusColor = (status: PTORequest['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">PTO / Time-Off</h1>

      {/* Balance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Balance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !balance ? (
            <p className="text-sm text-neutral-500">Loading balance...</p>
          ) : error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : balance ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-300">Total</p>
                <p className="mt-1 text-xl font-bold text-blue-800 dark:text-blue-100">{balance.totalDays}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-xs uppercase tracking-wide text-green-600 dark:text-green-300">Used</p>
                <p className="mt-1 text-xl font-bold text-green-800 dark:text-green-100">{balance.usedDays}</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs uppercase tracking-wide text-yellow-600 dark:text-yellow-300">Upcoming</p>
                <p className="mt-1 text-xl font-bold text-yellow-800 dark:text-yellow-100">{balance.upcomingDays}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <p className="text-xs uppercase tracking-wide text-purple-600 dark:text-purple-300">Remaining</p>
                <p className="mt-1 text-xl font-bold text-purple-800 dark:text-purple-100">{balance.remainingDays}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && requests.length === 0 ? (
            <p className="p-4 text-sm text-neutral-500">Loading requests...</p>
          ) : error ? (
            <p className="p-4 text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : requests.length === 0 ? (
            <p className="p-4 text-sm text-neutral-500">No PTO requests found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left bg-neutral-50 dark:bg-neutral-800/50">
                    <th className="py-3 px-4 font-medium text-neutral-600 dark:text-neutral-300">Start</th>
                    <th className="py-3 px-4 font-medium text-neutral-600 dark:text-neutral-300">End</th>
                    <th className="py-3 px-4 font-medium text-neutral-600 dark:text-neutral-300">Days</th>
                    <th className="py-3 px-4 font-medium text-neutral-600 dark:text-neutral-300">Type</th>
                    <th className="py-3 px-4 font-medium text-neutral-600 dark:text-neutral-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="py-3 px-4">{formatDate(req.startDate)}</td>
                      <td className="py-3 px-4">{formatDate(req.endDate)}</td>
                      <td className="py-3 px-4">{req.days}</td>
                      <td className="py-3 px-4 capitalize">{req.type}</td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(req.status)}>{req.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PTO;
