import PromoCarousel from './PromoCarousel'

// Sits to the left of the main content on desktop, mirrors AdRail's
// footprint (lg:w-[332px]) so the content column stays centered when
// both rails are present. On mobile, RootLayout orders this after the
// content (below AdRail).
export default function PromoRail() {
  return (
    <aside className="flex flex-shrink-0 justify-center py-8 lg:w-[332px] lg:justify-start lg:py-12 lg:pl-8 lg:pt-12">
      <PromoCarousel />
    </aside>
  )
}
