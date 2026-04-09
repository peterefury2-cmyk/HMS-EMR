'use client';

import { BellIcon } from '@heroicons/react/24/outline';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">City General Hospital</h2>
        <p className="text-xs text-gray-400">Multi-tenant HMS+EMR Platform</p>
      </div>
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <BellIcon className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-gray-900">Dr. Admin</div>
            <div className="text-xs text-gray-400">Hospital Admin</div>
          </div>
          <div className="w-9 h-9 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold cursor-pointer hover:bg-primary-200 transition-colors">
            DA
          </div>
        </div>
      </div>
    </header>
  );
}
