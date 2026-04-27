// app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const userData = searchParams.get('user');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Google লগইন ব্যর্থ হয়েছে');
      router.push('/login');
      return;
    }

    if (token && userData) {
      localStorage.setItem('userToken', token);
      localStorage.setItem('userData', userData);
      
      toast.success('Google লগইন সফল!');
      router.push('/');
    } else {
      toast.error('লগইন তথ্য পাওয়া যায়নি');
      router.push('/login');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin mx-auto mb-4" />
        <p className="text-gray-600">লগইন হচ্ছে...</p>
      </div>
    </div>
  );
}