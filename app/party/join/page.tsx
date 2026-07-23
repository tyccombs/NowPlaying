'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MobilePromoBanner from '@/components/MobilePromoBanner'

export default function JoinPartyPage() {
  const router = useRouter()
  const [code, setCode] = useState('')

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const c = code.trim().toUpperCase()
    if (!c) return
    router.push(`/party/${c}`)
  }

  return (
    <main className="min-h-dvh flex flex-col items-center px-5 py-12">
      <div className="mb-10 text-center">
        <h1
          className="uppercase"
          style={{ color: '#f5a623', fontFamily: 'Humane, sans-serif', fontSize: '5.5rem', lineHeight: 1, letterSpacing: '-0.008em' }}
        >
          Now Playing
        </h1>
        <a
          href="https://wencomb.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[10px] uppercase transition-colors hover:opacity-80"
          style={{ color: '#444', letterSpacing: '0.15em' }}
        >
          by wencomb
        </a>
        <p className="mt-2 text-sm" style={{ color: '#71717a' }}>
          Enter the party code your host gave you
        </p>
        <p className="mt-1.5 text-xs max-w-xs mx-auto" style={{ color: '#555' }}>
          Add your Letterboxd username and your watchlist counts toward the group&apos;s pick — everyone sees the same movie.
        </p>
      </div>

      <div className="w-full max-w-sm">
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: '#71717a' }}>
              Party code
            </label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="ABC123"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={6}
              className="w-full px-4 py-3 rounded text-sm outline-none transition-colors text-center uppercase tracking-[0.3em] font-semibold"
              style={{
                background: '#1a1a1a',
                color: '#e8e5e0',
                border: '1px solid #2a2a2a',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#f5a623')}
              onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
            />
          </div>

          <button
            type="submit"
            disabled={!code.trim()}
            className="w-full py-3 rounded font-semibold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: '#f5a623', color: '#0d0d0d' }}
          >
            Join party
          </button>

          <div className="text-center pt-1">
            <Link href="/" className="text-xs" style={{ color: '#555' }}>
              ← Back to solo mode
            </Link>
          </div>
        </form>
      </div>

      <MobilePromoBanner />
    </main>
  )
}
