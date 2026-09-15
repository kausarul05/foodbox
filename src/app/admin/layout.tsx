import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/app/admin/context/AuthContext';
import DialogProvider from '@/components/ui/DialogProvider';

export const metadata: Metadata = {
  title: 'FCS Admin Panel',
  description: 'Admin Dashboard for FCS Management',
};

/**
 * Admin section layout. <html>/<body> and globals.css now come from the root
 * layout, so this only wraps the admin tree in its own auth context, dialog
 * host and toaster.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DialogProvider>
        {children}
        {/* Bottom-centre on phones: a top-right toast sits under the notch on
            many devices, and the admin panel is used almost entirely on a phone. */}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: { background: '#1c1917', color: '#fff', borderRadius: '12px', fontSize: '14px' },
          }}
        />
      </DialogProvider>
    </AuthProvider>
  );
}
