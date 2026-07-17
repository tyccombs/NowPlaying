'use client'

import { useEffect, useState } from 'react'

const YOUTUBE_URL = 'https://www.youtube.com/channel/UCY-9CrbcBqOtbAoTEd4xfXg'
const SLIDE_COUNT = 11
const SLIDE_INTERVAL_MS = 5000

const SLIDES = Array.from(
  { length: SLIDE_COUNT },
  (_, i) => `/promo/mobile/np-ad-mobile-${String(i + 1).padStart(2, '0')}.webp`
)

// Mobile-only horizontal banner, dropped inline into each page's content
// column (below the main card, above the footer) rather than living in
// the global layout like the desktop PromoRail — this positions it right
// under the page's primary actions instead of at the very bottom of the
// screen. Every page's <main> is `flex flex-col items-center`, so a plain
// block child gets cross-axis fit-content sizing (its only children are
// absolutely-positioned <img>s, which contribute nothing to that sizing,
// collapsing width/height to 0). The 100vw + calc() breakout is the
// classic full-bleed trick and sidesteps that entirely by sizing off the
// viewport instead of the flex item's content.
export default function MobilePromoBanner() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(Math.floor(Math.random() * SLIDES.length))
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length)
    }, SLIDE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <a
      href={YOUTUBE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Visit the Wencomb YouTube channel"
      className="relative mt-8 block overflow-hidden lg:hidden"
      style={{ aspectRatio: '300 / 100', width: '100vw', marginLeft: 'calc(50% - 50vw)' }}
    >
      {SLIDES.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt="Wencomb on YouTube"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
          loading="eager"
        />
      ))}
    </a>
  )
}
