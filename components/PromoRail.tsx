import PromoCarousel from './PromoCarousel'

// Desktop-only: sits to the left of the main content, mirroring AdRail's
// footprint (lg:w-[332px]) so the content column stays centered when both
// rails are present. The mobile equivalent (MobilePromoBanner) is rendered
// inline in each page's own content instead of here.
export default function PromoRail() {
  return (
    <aside className="hidden lg:flex lg:w-[332px] lg:justify-start lg:py-12 lg:pl-8 lg:pt-12">
      <PromoCarousel />
    </aside>
  )
}
