'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '@/components/ui/card';

const stats = [
  { label: 'Total Patients', value: '2,847', change: '+12%', color: 'bg-blue-500' },
  { label: "Today's Appointments", value: '24', change: '+3 from yesterday', color: 'bg-green-500' },
  { label: 'Pending Bills', value: '$48,290', change: '18 invoices', color: 'bg-yellow-500' },
  { label: 'Active Prescriptions', value: '156', change: '+8 today', color: 'bg-purple-500' },
];

const visitData = [
  { month: 'Jan', visits: 320 },
  { month: 'Feb', visits: 280 },
  { month: 'Mar', visits: 410 },
  { month: 'Apr', visits: 390 },
  { month: 'May', visits: 480 },
  { month: 'Jun', visits: 520 },
  { month: 'Jul', visits: 460 },
];

const recentAppointments = [
  { id: '1', patient: 'John Adeyemi', doctor: 'Dr. Sarah Chen', time: '09:00 AM', status: 'CONFIRMED', type: 'IN_PERSON' },
  { id: '2', patient: 'Amaka Obi', doctor: 'Dr. James Wilson', time: '09:30 AM', status: 'IN_PROGRESS', type: 'IN_PERSON' },
  { id: '3', patient: 'Emeka Nwosu', doctor: 'Dr. Sarah Chen', time: '10:00 AM', status: 'SCHEDULED', type: 'TELEMEDICINE' },
  { id: '4', patient: 'Ngozi Eze', doctor: 'Dr. Michael Okonkwo', time: '10:30 AM', status: 'COMPLETED', type: 'IN_PERSON' },
  { id: '5', patient: 'Chidi Obiora', doctor: 'Dr. James Wilson', time: '11:00 AM', status: 'NO_SHOW', type: 'IN_PERSON' },
];

const statusColors: Record<string, string> = {
  CONFIRMED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-green-100 text-green-700',
  SCHEDULED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-gray-100 text-gray-700',
  NO_SHOW: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back! Here is what is happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className={`w-10 h-10 ${stat.color} rounded-lg mb-3`} />
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm font-medium text-gray-500 mt-1">{stat.label}</div>
            <div className="text-xs text-green-600 mt-1">{stat.change}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Visits (2024)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={visitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              <Line type="monotone" dataKey="visits" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            {[
              { label: 'Register Patient', href: '/dashboard/patients/new', icon: '👤' },
              { label: 'Book Appointment', href: '/dashboard/appointments/new', icon: '📅' },
              { label: 'Create Invoice', href: '/dashboard/billing/new', icon: '💳' },
              { label: 'New Prescription', href: '/dashboard/pharmacy/prescriptions/new', icon: '💊' },
              { label: 'Lab Order', href: '/dashboard/laboratory/orders/new', icon: '🔬' },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <span className="text-xl">{action.icon}</span>
                <span className="text-sm font-medium text-gray-700 group-hover:text-primary-600">{action.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Today&apos;s Appointments</h3>
          <a href="/dashboard/appointments" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Patient</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Doctor</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Time</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentAppointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{apt.patient}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{apt.doctor}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{apt.time}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{apt.type.replace('_', ' ')}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[apt.status]}`}>
                      {apt.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
