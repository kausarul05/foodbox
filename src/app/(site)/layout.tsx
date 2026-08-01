import { Toaster } from 'react-hot-toast';
import Navbar from '../Common/Navbar';
import Footer from '../Common/Footer';
import NoticeBar from '../Common/NoticeBar';

/**
 * Chrome for the customer-facing site. The admin panel does not use this.
 *
 * The notice strip and the navbar share one sticky wrapper, so they scroll as a
 * single unit and pages need no top margin to clear them — the old layout had
 * a `fixed` banner plus a `sticky top-12` navbar, which forced every page to
 * hard-code offsets like `lg:mt-28`.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40">
        <NoticeBar />
        <Navbar />
      </header>

      <main className="flex-1">{children}</main>

      <Footer />
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1c1917', color: '#fff', borderRadius: '12px', fontSize: '14px' },
        }}
      />
    </div>
  );
}
