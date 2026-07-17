'use client'

import { useEffect, useState } from 'react'

const YOUTUBE_URL = 'https://www.youtube.com/channel/UCY-9CrbcBqOtbAoTEd4xfXg'
const SLIDE_COUNT = 10
const SLIDE_INTERVAL_MS = 5000

const SLIDES = Array.from(
  { length: SLIDE_COUNT },
  (_, i) => `/promo/np-ad-${String(i + 1).padStart(2, '0')}.webp`
)

export default function PromoCarousel() {
  const [index, setIndex] = useState(0)

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
      className="relative block w-[120px] overflow-hidden rounded-sm"
      style={{ aspectRatio: '120 / 600' }}
    >
      {SLIDES.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt="Wencomb on YouTube"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
          loading={i === 0 ? 'eager' : 'lazy'}
        />
      ))}
    </a>
  )
}
