// app/auth/callback/ClientCallback.tsx
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const userData = searchParams.get('user');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Google লগইন ব্যর্থ হয়েছে');
      window.location.href = '/login';
      return;
    }

    if (token && userData) {
      localStorage.setItem('userToken', token);
      localStorage.setItem('userData', userData);
      toast.success('Google লগইন সফল!');
      window.location.href = '/';
    } else {
      toast.error('লগইন তথ্য পাওয়া যায়নি');
      window.location.href = '/login';
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto size-10 animate-spin text-brand-600" />
        <p className="mt-4 text-sm text-ink-600">লগইন হচ্ছে...</p>
      </div>
    </div>
  );
}
