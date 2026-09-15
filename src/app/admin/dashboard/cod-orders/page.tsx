import { redirect } from 'next/navigation';

/**
 * Cash-on-delivery orders are now the "COD" tab of the unified order list, so
 * the admin sees one total instead of hunting across separate screens.
 *
 * This route stays as a redirect rather than being deleted: the old path is in
 * browser histories and bookmarks, and a 404 there would look like data loss.
 */
export default function CodOrdersPage() {
  redirect('/admin/dashboard/orders?tab=cod');
}
