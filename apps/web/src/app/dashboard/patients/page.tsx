'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const mockPatients = [
  { id: '1', patientNo: 'P000001', firstName: 'John', lastName: 'Adeyemi', dateOfBirth: '1985-03-15', gender: 'MALE', phone: '+234 801 234 5678', status: 'ACTIVE' },
  { id: '2', patientNo: 'P000002', firstName: 'Amaka', lastName: 'Obi', dateOfBirth: '1990-07-22', gender: 'FEMALE', phone: '+234 802 345 6789', status: 'ACTIVE' },
  { id: '3', patientNo: 'P000003', firstName: 'Emeka', lastName: 'Nwosu', dateOfBirth: '1975-11-08', gender: 'MALE', phone: '+234 803 456 7890', status: 'INACTIVE' },
  { id: '4', patientNo: 'P000004', firstName: 'Ngozi', lastName: 'Eze', dateOfBirth: '1995-01-30', gender: 'FEMALE', phone: '+234 804 567 8901', status: 'ACTIVE' },
  { id: '5', patientNo: 'P000005', firstName: 'Chidi', lastName: 'Obiora', dateOfBirth: '1982-06-14', gender: 'MALE', phone: '+234 805 678 9012', status: 'ACTIVE' },
];

export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  const filtered = mockPatients.filter((p) => {
    const matchesSearch =
      !search ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      p.patientNo.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDOB = (dob: string) => {
    const d = new Date(dob);
    const age = new Date().getFullYear() - d.getFullYear();
    return `${d.toLocaleDateString()} (${age} yrs)`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} patients registered</p>
        </div>
        <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors">
          <PlusIcon className="w-4 h-4" />
          Add Patient
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or patient number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Patient No</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Name</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Date of Birth</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Gender</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Phone</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono font-medium text-primary-600">{patient.patientNo}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{patient.firstName} {patient.lastName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDOB(patient.dateOfBirth)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{patient.gender}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{patient.phone}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      patient.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {patient.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button className="text-primary-600 hover:text-primary-700 font-medium">View</button>
                      <button className="text-gray-600 hover:text-gray-700 font-medium">Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filtered.length)}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
