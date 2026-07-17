import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import Script from 'next/script'
import AdRail from '@/components/AdRail'
import PromoRail from '@/components/PromoRail'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? ''
const ADSENSE_SIDEBAR_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT ?? ''
const ADS_CONFIGURED = Boolean(ADSENSE_CLIENT_ID && ADSENSE_SIDEBAR_SLOT)

export const metadata: Metadata = {
  title: 'Now Playing',
  description: 'Pick a movie from your Letterboxd watchlist that\'s streaming tonight.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spaceGrotesk.className}>
      <body className="min-h-dvh antialiased">
        <div className="flex flex-col lg:flex-row">
          <div className="order-2 lg:order-1">
            <PromoRail />
          </div>
          <div className="order-1 min-w-0 flex-1 lg:order-2">{children}</div>
          {!ADS_CONFIGURED && (
            <div aria-hidden="true" className="hidden lg:order-3 lg:block lg:w-[332px] lg:flex-shrink-0" />
          )}
          <div className="order-3">
            <AdRail />
          </div>
        </div>
        {ADSENSE_CLIENT_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  )
}
