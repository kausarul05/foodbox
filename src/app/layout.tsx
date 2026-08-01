import type { Metadata, Viewport } from 'next'
import { Hind_Siliguri } from 'next/font/google'
import './globals.css'

/**
 * Hind Siliguri covers Bengali *and* Latin, so one family renders the whole UI
 * — no font swap between a Bengali heading and a Latin price.
 */
const bangla = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-bangla',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'FoodBox — ঘরের মতো রান্না, প্রতিদিন আপনার দরজায়',
    template: '%s · FoodBox',
  },
  description:
    'ময়মনসিংহে হোমমেড খাবারের সাবস্ক্রিপশন সার্ভিস। সকাল, দুপুর ও রাতের খাবার — তাজা রান্না, সময়মতো ডেলিভারি।',
  keywords: ['FoodBox', 'মিল সাবস্ক্রিপশন', 'ময়মনসিংহ খাবার', 'হোম ডেলিভারি', 'গেস্ট মিল'],
}

export const viewport: Viewport = {
  themeColor: '#ea580c',
}

/**
 * Root layout — only the document shell.
 *
 * The customer site's navbar/footer live in `(site)/layout.tsx` and the admin
 * panel has its own in `admin/layout.tsx`, so neither leaks into the other.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="bn" className={bangla.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
