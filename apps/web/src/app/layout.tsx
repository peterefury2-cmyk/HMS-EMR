import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HMS+EMR Platform',
  description: 'Hospital Management System and Electronic Medical Records SaaS Platform',
  keywords: ['hospital management', 'EMR', 'healthcare', 'medical records'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
