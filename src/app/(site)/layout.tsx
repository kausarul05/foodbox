import { Toaster } from 'react-hot-toast';
import Navbar from '../Common/Navbar';
import Footer from '../Common/Footer';
import NoticeBar from '../Common/NoticeBar';
import MobileTabBar from '../Common/MobileTabBar';
import DialogProvider from '@/components/ui/DialogProvider';

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
    <DialogProvider>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40">
          <NoticeBar />
          <Navbar />
        </header>

        {/* pb clears the phone tab bar so the footer is never trapped behind it. */}
        <main className="flex-1 pb-[4.5rem] lg:pb-0">{children}</main>

        <Footer />
        <MobileTabBar />
        <Toaster
          position="top-center"
          toastOptions={{
            style: { background: '#1c1917', color: '#fff', borderRadius: '12px', fontSize: '14px' },
          }}
        />
      </div>
    </DialogProvider>
  );
}
