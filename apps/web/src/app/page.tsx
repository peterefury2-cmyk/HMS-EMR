import Link from 'next/link';

const features = [
  {
    title: 'Electronic Medical Records',
    description: 'Complete patient history, SOAP notes, diagnoses, and vital signs in one place.',
    icon: '🏥',
  },
  {
    title: 'Appointment Management',
    description: 'Smart scheduling with conflict detection, reminders, and calendar view.',
    icon: '📅',
  },
  {
    title: 'Billing & Invoicing',
    description: 'Automated invoicing, payment processing, and insurance claim management.',
    icon: '💳',
  },
  {
    title: 'Pharmacy Management',
    description: 'Drug inventory, prescription dispensing, and stock management.',
    icon: '💊',
  },
  {
    title: 'Laboratory',
    description: 'Lab test orders, result recording, and reporting for all specimen types.',
    icon: '🔬',
  },
  {
    title: 'Telemedicine',
    description: 'Secure video consultations with full EMR integration.',
    icon: '📱',
  },
];

const stats = [
  { label: 'Hospitals Onboarded', value: '150+' },
  { label: 'Patient Records', value: '2M+' },
  { label: 'Daily Consultations', value: '10K+' },
  { label: 'Uptime', value: '99.9%' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏥</span>
              <span className="font-bold text-xl text-gray-900">HMS+EMR</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                Sign In
              </Link>
              <Link
                href="/dashboard"
                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-20 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto text-center">
          <span className="inline-block bg-primary-100 text-primary-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            Production-Grade Healthcare SaaS
          </span>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Modern Hospital Management
            <span className="text-primary-600 block">& EMR Platform</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            A complete, multi-tenant SaaS platform for hospitals, clinics, and healthcare organizations.
            Manage patients, appointments, billing, pharmacy, lab, and more — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="bg-primary-600 text-white px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
            >
              Launch Dashboard
            </Link>
            <Link
              href="/api/docs"
              className="bg-white text-gray-700 px-8 py-3.5 rounded-xl font-semibold text-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              View API Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold text-white">{stat.value}</div>
                <div className="text-primary-200 mt-1 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything Your Hospital Needs</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From patient registration to discharge, our platform covers every workflow in your healthcare organization.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all duration-200 group"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏥</span>
            <span className="font-bold text-white">HMS+EMR Platform</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} HMS+EMR. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
