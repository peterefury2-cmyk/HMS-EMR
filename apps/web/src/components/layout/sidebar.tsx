'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  UserGroupIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  BeakerIcon,
  HeartIcon,
  ShieldCheckIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { label: 'Patients', href: '/dashboard/patients', icon: UserGroupIcon },
  { label: 'Appointments', href: '/dashboard/appointments', icon: CalendarIcon },
  { label: 'EMR', href: '/dashboard/emr', icon: ClipboardDocumentListIcon },
  { label: 'Billing', href: '/dashboard/billing', icon: CreditCardIcon },
  { label: 'Pharmacy', href: '/dashboard/pharmacy', icon: HeartIcon },
  { label: 'Laboratory', href: '/dashboard/laboratory', icon: BeakerIcon },
  { label: 'Radiology', href: '/dashboard/radiology', icon: DocumentTextIcon },
  { label: 'Insurance', href: '/dashboard/insurance', icon: ShieldCheckIcon },
  { label: 'Telemedicine', href: '/dashboard/telemedicine', icon: VideoCameraIcon },
  { label: 'Reports', href: '/dashboard/reports', icon: ChartBarIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-gray-200 rounded-lg shadow-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-white border-r border-gray-200 flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
          <span className="text-2xl">🏥</span>
          <div>
            <div className="font-bold text-gray-900 text-sm">HMS+EMR</div>
            <div className="text-xs text-gray-400">City General Hospital</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150
                  ${active
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold">
              DR
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Dr. Admin</div>
              <div className="text-xs text-gray-400">HOSPITAL_ADMIN</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
