'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MobilePromoBanner from '@/components/MobilePromoBanner'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function NewPartyPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [emailLocked, setEmailLocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('host-email')
    if (saved) {
      setEmail(saved)
      setEmailLocked(true)
    }
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const u = username.trim().toLowerCase()
    const em = email.trim().toLowerCase()
    if (!u || !EMAIL_RE.test(em)) return

    setLoading(true)
    setError(null)

    localStorage.setItem('host-email', em)
    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: em }),
    }).catch(() => {})

    try {
      const res = await fetch('/api/party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostUsername: u }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create party')

      localStorage.setItem(`party-host-${data.id}`, data.hostToken)
      router.push(`/party/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
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
          Create a party and pick a movie with friends
        </p>
        <p className="mt-1.5 text-xs max-w-xs mx-auto" style={{ color: '#555' }}>
          You&apos;ll get a code to share — friends add their Letterboxd usernames, and the pick comes from movies on everyone&apos;s watchlists.
        </p>
      </div>

      <div className="w-full max-w-sm">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: '#71717a' }}>
              Your Letterboxd username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="your_username"
              autoComplete="off"
              spellCheck={false}
              className="w-full px-4 py-3 rounded text-sm outline-none transition-colors"
              style={{
                background: '#1a1a1a',
                color: '#e8e5e0',
                border: '1px solid #2a2a2a',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#f5a623')}
              onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
            />
          </div>

          {emailLocked ? (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs" style={{ color: '#71717a' }}>
                Signed in as <span style={{ color: '#e8e5e0' }}>{email}</span>
              </p>
              <button
                type="button"
                onClick={() => { setEmailLocked(false); setEmail('') }}
                className="text-xs"
                style={{ color: '#555' }}
              >
                Not you?
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: '#71717a' }}>
                Your email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full px-4 py-3 rounded text-sm outline-none transition-colors"
                style={{
                  background: '#1a1a1a',
                  color: '#e8e5e0',
                  border: '1px solid #2a2a2a',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#f5a623')}
                onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
              />
              <p className="text-[11px]" style={{ color: '#444' }}>
                Saves your spot as host and adds you to Now Playing updates.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm px-1" style={{ color: '#f87171' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={!username.trim() || !EMAIL_RE.test(email) || loading}
            className="w-full py-3 rounded font-semibold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: '#f5a623', color: '#0d0d0d' }}
          >
            {loading ? 'Creating…' : 'Create party'}
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
