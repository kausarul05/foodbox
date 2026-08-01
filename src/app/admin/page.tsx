import { redirect } from 'next/navigation';

// /admin is just an entry point — the panel itself lives at /admin/dashboard.
export default function AdminIndex() {
  redirect('/admin/dashboard');
}
