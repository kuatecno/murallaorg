'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Users, AlertCircle, CheckCircle, Calendar, LogIn, LogOut } from 'lucide-react';

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface Attendance {
  id: string;
  shiftId: string;
  date: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualCheckIn?: string;
  actualCheckOut?: string;
  status: 'ON_TIME' | 'LATE' | 'ABSENT' | 'EARLY_DEPARTURE' | 'APPROVED_PTO';
  minutesLate?: number;
  totalHours?: number;
  staff: Staff;
  shift: Shift;
}

interface AttendanceSummary {
  total: number;
  onTime: number;
  late: number;
  earlyDeparture: number;
  absent: number;
}

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [liveAttendance, setLiveAttendance] = useState<Attendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({ total: 0, onTime: 0, late: 0, earlyDeparture: 0, absent: 0 });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    loadTodayAttendance();
    loadLiveAttendance();
  }, [router]);

  const loadTodayAttendance = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const response = await fetch('/api/staff/attendance/today', {
        headers: {
          'x-tenant-id': user.tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAttendance(data.data.attendance);
          setSummary(data.data.summary);
        }
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLiveAttendance = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const response = await fetch('/api/staff/attendance/live', {
        headers: {
          'x-tenant-id': user.tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLiveAttendance(data.data.staff);
        }
      }
    } catch (error) {
      console.error('Error loading live attendance:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      ON_TIME: { label: 'On Time', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      LATE: { label: 'Late', color: 'bg-red-100 text-red-800', icon: AlertCircle },
      ABSENT: { label: 'Absent', color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
      EARLY_DEPARTURE: { label: 'Early Exit', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      APPROVED_PTO: { label: 'PTO', color: 'bg-blue-100 text-blue-800', icon: Calendar }
    };
    const badge = badges[status as keyof typeof badges];
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Attendance Dashboard</h1>
              <p className="text-gray-600 mt-1">Today's attendance and live tracking</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/staff')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Back to Staff
              </button>
              <button
                onClick={() => loadTodayAttendance()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Clock className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total</dt>
                    <dd className="text-lg font-semibold text-gray-900">{summary.total}</dd>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">On Time</dt>
                    <dd className="text-lg font-semibold text-gray-900">{summary.onTime}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Late</dt>
                    <dd className="text-lg font-semibold text-gray-900">{summary.late}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Early Exit</dt>
                    <dd className="text-lg font-semibold text-gray-900">{summary.earlyDeparture}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Absent</dt>
                    <dd className="text-lg font-semibold text-gray-900">{summary.absent}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Currently Working */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-600" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">Currently Working</h3>
            <span className="text-sm text-gray-500">({liveAttendance.length})</span>
          </div>

          {liveAttendance.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No one is currently clocked in</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {liveAttendance.map((att: any) => (
                <li key={att.id} className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-600 font-semibold">
                            {att.staff.firstName[0]}{att.staff.lastName[0]}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {att.staff.firstName} {att.staff.lastName}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <LogIn className="w-3 h-3" />
                          <span>Checked in at {formatTime(att.actualCheckIn)}</span>
                          <span>•</span>
                          <span>{att.shift.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">
                        {att.hoursWorkedSoFar} hours
                      </p>
                      <p className="text-xs text-gray-500">Working now</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Today's Attendance */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Today's Attendance</h3>
          </div>

          {attendance.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No attendance records</h3>
              <p className="mt-1 text-sm text-gray-500">No one has checked in yet today.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {attendance.map((att) => (
                <li key={att.id} className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {att.staff.firstName[0]}{att.staff.lastName[0]}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {att.staff.firstName} {att.staff.lastName}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>{att.shift.name}</span>
                          <span>•</span>
                          <span>Scheduled: {formatTime(att.scheduledStart)} - {formatTime(att.scheduledEnd)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Check In/Out Times */}
                      <div className="text-right min-w-[200px]">
                        {att.actualCheckIn && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <LogIn className="w-3 h-3" />
                            <span>In: {formatTime(att.actualCheckIn)}</span>
                            {att.minutesLate && att.minutesLate > 0 && (
                              <span className="text-red-600 font-medium">
                                ({att.minutesLate} min late)
                              </span>
                            )}
                          </div>
                        )}
                        {att.actualCheckOut && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                            <LogOut className="w-3 h-3" />
                            <span>Out: {formatTime(att.actualCheckOut)}</span>
                          </div>
                        )}
                      </div>

                      {/* Hours Worked */}
                      {att.totalHours && (
                        <div className="text-right min-w-[80px]">
                          <p className="text-sm font-semibold text-gray-900">
                            {att.totalHours} hrs
                          </p>
                        </div>
                      )}

                      {/* Status */}
                      <div className="min-w-[100px]">
                        {getStatusBadge(att.status)}
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
