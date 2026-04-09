'use client';

import { useState } from 'react';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { format, addDays, subDays } from 'date-fns';

const mockAppointments = [
  { id: '1', patient: 'John Adeyemi', doctor: 'Dr. Sarah Chen', scheduledAt: '2024-02-15T09:00:00', duration: 30, type: 'IN_PERSON', status: 'CONFIRMED' },
  { id: '2', patient: 'Amaka Obi', doctor: 'Dr. James Wilson', scheduledAt: '2024-02-15T09:30:00', duration: 30, type: 'IN_PERSON', status: 'IN_PROGRESS' },
  { id: '3', patient: 'Emeka Nwosu', doctor: 'Dr. Sarah Chen', scheduledAt: '2024-02-15T10:00:00', duration: 45, type: 'TELEMEDICINE', status: 'SCHEDULED' },
  { id: '4', patient: 'Ngozi Eze', doctor: 'Dr. Michael Okonkwo', scheduledAt: '2024-02-15T10:30:00', duration: 30, type: 'IN_PERSON', status: 'COMPLETED' },
];

const statusStyles: Record<string, string> = {
  SCHEDULED: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-red-100 text-red-700',
};

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const goToPrevDay = () => setSelectedDate((d) => subDays(d, 1));
  const goToNextDay = () => setSelectedDate((d) => addDays(d, 1));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and schedule patient appointments</p>
        </div>
        <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors">
          <PlusIcon className="w-4 h-4" />
          New Appointment
        </button>
      </div>

      {/* Date selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-4">
          <button onClick={goToPrevDay} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {mockAppointments.length} appointments scheduled
            </p>
          </div>
          <button onClick={goToNextDay} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRightIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Appointments list */}
      <div className="space-y-3">
        {mockAppointments.map((apt) => (
          <div key={apt.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="bg-primary-50 text-primary-700 rounded-lg px-3 py-2 text-sm font-mono font-semibold min-w-[80px] text-center">
                  {format(new Date(apt.scheduledAt), 'HH:mm')}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{apt.patient}</h3>
                  <p className="text-sm text-gray-500">{apt.doctor}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-500">{apt.duration} min</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {apt.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${statusStyles[apt.status]}`}>
                  {apt.status.replace('_', ' ')}
                </span>
                <button className="text-sm text-gray-500 hover:text-gray-700">•••</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
