'use client'

import { useEffect, useState } from 'react'

const YOUTUBE_URL = 'https://www.youtube.com/channel/UCY-9CrbcBqOtbAoTEd4xfXg'
const SLIDE_COUNT = 10
const MOBILE_SLIDE_COUNT = 11
const SLIDE_INTERVAL_MS = 5000

const SLIDES = Array.from(
  { length: SLIDE_COUNT },
  (_, i) => `/promo/np-ad-${String(i + 1).padStart(2, '0')}.webp`
)

const MOBILE_SLIDES = Array.from(
  { length: MOBILE_SLIDE_COUNT },
  (_, i) => `/promo/mobile/np-ad-mobile-${String(i + 1).padStart(2, '0')}.webp`
)

function Slides({ srcs, index }: { srcs: string[]; index: number }) {
  return (
    <>
      {srcs.map((src, i) => (
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
    </>
  )
}

export default function PromoCarousel() {
  const [index, setIndex] = useState(0)
  const [mobileIndex, setMobileIndex] = useState(0)

  // Randomize the starting slide client-side only, after hydration, so the
  // server-rendered markup (always slide 0) matches the client's first
  // render and React doesn't flag a hydration mismatch.
  useEffect(() => {
    setIndex(Math.floor(Math.random() * SLIDES.length))
    setMobileIndex(Math.floor(Math.random() * MOBILE_SLIDES.length))
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length)
      setMobileIndex((i) => (i + 1) % MOBILE_SLIDES.length)
    }, SLIDE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      {/* Desktop: vertical skyscraper rail */}
      <a
        href={YOUTUBE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit the Wencomb YouTube channel"
        className="relative hidden w-[120px] overflow-hidden rounded-sm lg:block"
        style={{ aspectRatio: '120 / 600' }}
      >
        <Slides srcs={SLIDES} index={index} />
      </a>

      {/* Mobile: full-width horizontal banner */}
      <a
        href={YOUTUBE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit the Wencomb YouTube channel"
        className="relative block w-full overflow-hidden lg:hidden"
        style={{ aspectRatio: '300 / 100' }}
      >
        <Slides srcs={MOBILE_SLIDES} index={mobileIndex} />
      </a>
    </>
  )
}
