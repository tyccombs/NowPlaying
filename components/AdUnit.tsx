'use client'

import { useEffect, useRef } from 'react'

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? ''
const ADSENSE_SIDEBAR_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT ?? ''

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

// Renders nothing until AdSense approval + a real ad slot ID are configured,
// so no empty ad box or console errors show up before then.
export default function AdUnit() {
  const insRef = useRef<HTMLModElement>(null)
  const pushed = useRef(false)

  useEffect(() => {
    if (!ADSENSE_CLIENT_ID || !ADSENSE_SIDEBAR_SLOT) return
    if (pushed.current) return
    try {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
      pushed.current = true
    } catch {
      // AdSense script not ready yet or blocked (ad blocker) — safe to ignore.
    }
  }, [])

  if (!ADSENSE_CLIENT_ID || !ADSENSE_SIDEBAR_SLOT) return null

  return (
    <ins
      ref={insRef}
      className="adsbygoogle"
      style={{ display: 'block', width: '300px', minHeight: '250px' }}
      data-ad-client={ADSENSE_CLIENT_ID}
      data-ad-slot={ADSENSE_SIDEBAR_SLOT}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}
