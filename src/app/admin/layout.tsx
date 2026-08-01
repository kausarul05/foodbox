import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/app/admin/context/AuthContext';

export const metadata: Metadata = {
  title: 'FCS Admin Panel',
  description: 'Admin Dashboard for FCS Management',
};

/**
 * Admin section layout. <html>/<body> and globals.css now come from the root
 * layout, so this only wraps the admin tree in its own auth context and toaster.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster position="top-right" />
    </AuthProvider>
  );
}
