'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewPartyPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const u = username.trim().toLowerCase()
    if (!u) return

    setLoading(true)
    setError(null)

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
          style={{ color: '#f5a623', fontFamily: 'Humane, sans-serif', fontSize: '5.5rem', lineHeight: 1, letterSpacing: '0.04em' }}
        >
          Now Playing
        </h1>
        <p className="mt-2 text-sm" style={{ color: '#71717a' }}>
          Create a party and pick a movie with friends
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

          {error && (
            <p className="text-sm px-1" style={{ color: '#f87171' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={!username.trim() || loading}
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
    </main>
  )
}
