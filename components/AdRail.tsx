import AdUnit from './AdUnit'

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? ''
const ADSENSE_SIDEBAR_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT ?? ''

// Sits to the right of the main content on desktop, below it on mobile —
// matches DOM order in RootLayout (content column, then this). The
// lg:w-[332px] here matches RootLayout's mirrored spacer div so the content
// column stays centered on the full viewport instead of the leftover space.
export default function AdRail() {
  if (!ADSENSE_CLIENT_ID || !ADSENSE_SIDEBAR_SLOT) return null

  return (
    <aside className="flex flex-shrink-0 justify-center py-8 lg:w-[332px] lg:justify-end lg:py-12 lg:pr-8 lg:pt-12">
      <AdUnit />
    </aside>
  )
}
