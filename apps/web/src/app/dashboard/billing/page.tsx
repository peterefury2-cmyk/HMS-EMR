'use client';

import { CurrencyDollarIcon, DocumentTextIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const revenueStats = [
  { label: 'Total Revenue', value: '$124,850', icon: CurrencyDollarIcon, color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'Pending', value: '$48,290', icon: DocumentTextIcon, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { label: 'Overdue', value: '$12,450', icon: ExclamationTriangleIcon, color: 'text-red-600', bg: 'bg-red-50' },
  { label: 'Paid This Month', value: '$64,110', icon: CheckCircleIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
];

const invoices = [
  { id: 'INV-2024-00001', patient: 'John Adeyemi', amount: 15000, currency: 'USD', status: 'PAID', date: '2024-02-10', items: 3 },
  { id: 'INV-2024-00002', patient: 'Amaka Obi', amount: 8500, currency: 'USD', status: 'SENT', date: '2024-02-12', items: 2 },
  { id: 'INV-2024-00003', patient: 'Emeka Nwosu', amount: 23000, currency: 'USD', status: 'OVERDUE', date: '2024-01-30', items: 5 },
  { id: 'INV-2024-00004', patient: 'Ngozi Eze', amount: 5500, currency: 'USD', status: 'DRAFT', date: '2024-02-14', items: 1 },
  { id: 'INV-2024-00005', patient: 'Chidi Obiora', amount: 11000, currency: 'USD', status: 'PAID', date: '2024-02-08', items: 4 },
];

const statusStyles: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700',
  SENT: 'bg-blue-100 text-blue-700',
  DRAFT: 'bg-gray-100 text-gray-600',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-red-50 text-red-500',
};

export default function BillingPage() {
  const formatAmount = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-500 mt-1">Manage invoices and payments</p>
        </div>
        <button className="bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors">
          + New Invoice
        </button>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {revenueStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Invoice No</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Patient</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Amount</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Items</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono font-medium text-primary-600">{inv.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{inv.patient}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatAmount(inv.amount, inv.currency)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(inv.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{inv.items} items</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button className="text-primary-600 hover:text-primary-700 font-medium">View</button>
                      {inv.status !== 'PAID' && (
                        <button className="text-green-600 hover:text-green-700 font-medium">Pay</button>
                      )}
                    </div>
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
