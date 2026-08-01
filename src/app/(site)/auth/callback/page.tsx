// app/auth/callback/page.tsx
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ClientCallback from './ClientCallback';

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin mx-auto mb-4" />
        <p className="text-gray-600">লোড হচ্ছে...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ClientCallback />
    </Suspense>
  );
}