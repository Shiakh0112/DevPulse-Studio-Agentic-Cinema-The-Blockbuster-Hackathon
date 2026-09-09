import type { Metadata } from 'next';
import './globals.css';
import { RoleProvider } from '../lib/RoleContext';
import { ResponsiveLayout } from '../components/ResponsiveLayout';

export const metadata: Metadata = {
  title: 'DevPulse Studio | Autonomous Incident Ops',
  description: 'AI-powered autonomous incident resolution and observability platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-[#0B0E14] text-[#FFFFFF] min-h-screen antialiased overflow-x-hidden" suppressHydrationWarning>
        <RoleProvider>
          <ResponsiveLayout>
            {children}
          </ResponsiveLayout>
        </RoleProvider>
      </body>
    </html>
  );
}
