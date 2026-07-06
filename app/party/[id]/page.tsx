'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import MovieCard from '@/components/MovieCard'
import { cacheGet, cacheSet } from '@/lib/cache'
import { searchMovie, getWatchProviders } from '@/lib/tmdb'
import { sortServices, TMDB_GENRES } from '@/lib/services'
import type { LetterboxdFilm, EnrichedFilm, PartyState } from '@/lib/types'

const TMDB_TOKEN = process.env.NEXT_PUBLIC_TMDB_READ_TOKEN ?? ''
const CHUNK_SIZE = 15
const COLLAPSED_SERVICE_COUNT = 6
const POLL_MS = 4000

async function enrichFilm(film: LetterboxdFilm, country: string): Promise<EnrichedFilm> {
  const cacheKey = `${film.slug}:${country}`
  const cached = cacheGet<EnrichedFilm>(cacheKey)
  if (cached) return cached

  const tmdbResult = await searchMovie(film.name, film.year, TMDB_TOKEN)
  if (!tmdbResult) {
    return { ...film, tmdbId: null, posterPath: null, overview: null, voteAverage: null, providers: [], genreIds: [] }
  }

  const providers = await getWatchProviders(tmdbResult.tmdbId, country, TMDB_TOKEN)
  const enriched: EnrichedFilm = {
    ...film,
    tmdbId: tmdbResult.tmdbId,
    posterPath: tmdbResult.posterPath,
    overview: tmdbResult.overview,
    voteAverage: tmdbResult.voteAverage,
    providers,
    genreIds: tmdbResult.genreIds,
  }

  cacheSet(cacheKey, enriched)
  return enriched
}

function computePool(watchlists: Map<string, Set<string>>, allSlugs: LetterboxdFilm[]): { films: LetterboxdFilm[]; poolType: 'intersection' | 'majority' | 'none' } {
  const slugMap = new Map(allSlugs.map(f => [f.slug, f]))
  const usernames = Array.from(watchlists.keys())
  const total = usernames.length

  // Intersection: all members have the film
  const intersection = allSlugs.filter(f =>
    usernames.every(u => watchlists.get(u)!.has(f.slug))
  )
  if (intersection.length > 0) return { films: intersection, poolType: 'intersection' }

  // Majority: >50% of members have the film
  const majority = allSlugs.filter(f => {
    const count = usernames.filter(u => watchlists.get(u)!.has(f.slug)).length
    return count / total > 0.5
  })
  if (majority.length > 0) return { films: majority, poolType: 'majority' }

  return { films: [], poolType: 'none' }
}

type Phase = 'loading' | 'joining' | 'waiting' | 'host-ready' | 'picking' | 'picked' | 'error' | 'expired'

export default function PartyPage() {
  const { id } = useParams<{ id: string }>()
  const [party, setParty] = useState<PartyState | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [isHost, setIsHost] = useState(false)
  const [hostToken, setHostToken] = useState<string | null>(null)
  const [joinUsername, setJoinUsername] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [myUsername, setMyUsername] = useState<string | null>(null)

  // Host controls
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set())
  const [showAllServices, setShowAllServices] = useState(false)
  const [primaryGenre, setPrimaryGenre] = useState<number | null>(null)
  const [alternateGenre, setAlternateGenre] = useState<number | null>(null)

  // Picking
  const [pickProgress, setPickProgress] = useState(0)
  const [pickStatus, setPickStatus] = useState('')
  const [pickedFilm, setPickedFilm] = useState<EnrichedFilm | null>(null)
  const [poolType, setPoolType] = useState<'intersection' | 'majority' | 'none' | null>(null)
  const [enrichedPool, setEnrichedPool] = useState<EnrichedFilm[]>([])
  const [copied, setCopied] = useState(false)

  const cancelRef = useRef(false)

  // Load party + detect host
  useEffect(() => {
    const token = localStorage.getItem(`party-host-${id}`)
    if (token) {
      setIsHost(true)
      setHostToken(token)
    }
    const saved = localStorage.getItem(`party-member-${id}`)
    if (saved) setMyUsername(saved)
  }, [id])

  const fetchParty = useCallback(async () => {
    const res = await fetch(`/api/party/${id}`, { cache: 'no-store' })
    if (res.status === 404) { setPhase('error'); return null }
    if (res.status === 410) { setPhase('expired'); return null }
    if (!res.ok) { setPhase('error'); return null }
    const data: PartyState = await res.json()
    setParty(data)
    if (data.pickedFilm) {
      setPickedFilm(data.pickedFilm)
      setPhase('picked')
    }
    return data
  }, [id])

  // Initial load + determine phase
  useEffect(() => {
    fetchParty().then(data => {
      if (!data) return
      const token = localStorage.getItem(`party-host-${id}`)
      const member = localStorage.getItem(`party-member-${id}`)
      if (data.pickedFilm) {
        setPhase('picked')
      } else if (token) {
        setPhase('host-ready')
        const savedServices = localStorage.getItem(`party-services-${id}`)
        const savedGenres = localStorage.getItem(`party-genres-${id}`)
        setSelectedServices(savedServices ? new Set(JSON.parse(savedServices)) : new Set(data.services))
        if (savedGenres) {
          const g = JSON.parse(savedGenres)
          if (g.primaryGenre !== null) setPrimaryGenre(g.primaryGenre)
          if (g.alternateGenre !== null) setAlternateGenre(g.alternateGenre)
        } else {
          if (data.primaryGenre !== null) setPrimaryGenre(data.primaryGenre)
          if (data.alternateGenre !== null) setAlternateGenre(data.alternateGenre)
        }
      } else if (member) {
        setPhase('waiting')
      } else {
        setPhase('joining')
      }
    })
  }, [id, fetchParty])

  // Polling
  useEffect(() => {
    if (phase === 'picked' || phase === 'error' || phase === 'expired' || phase === 'picking') return
    const interval = setInterval(fetchParty, POLL_MS)
    return () => clearInterval(interval)
  }, [phase, fetchParty])

  // Persist host's service/genre selections locally (no server write — avoids race with joins)
  useEffect(() => {
    if (!isHost) return
    localStorage.setItem(`party-services-${id}`, JSON.stringify(Array.from(selectedServices)))
  }, [selectedServices, isHost, id])

  useEffect(() => {
    if (!isHost) return
    localStorage.setItem(`party-genres-${id}`, JSON.stringify({ primaryGenre, alternateGenre }))
  }, [primaryGenre, alternateGenre, isHost, id])

  function toggleService(name: string) {
    setSelectedServices(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const u = joinUsername.trim().toLowerCase()
    if (!u) return
    setJoining(true)
    setJoinError(null)
    const res = await fetch(`/api/party/${id}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u }),
    })
    const data = await res.json()
    if (!res.ok) {
      setJoinError(data.error ?? 'Failed to join')
      setJoining(false)
      return
    }
    localStorage.setItem(`party-member-${id}`, u)
    setMyUsername(u)
    setParty(data)
    setPhase('waiting')
    setJoining(false)
  }

  async function handlePick() {
    if (!party || !hostToken) return
    setPhase('picking')
    cancelRef.current = false

    try {
      // Fetch fresh party state so we always have the latest member list
      const freshRes = await fetch(`/api/party/${id}`, { cache: 'no-store' })
      const freshParty: PartyState = freshRes.ok ? await freshRes.json() : party
      setParty(freshParty)

      const allMembers = [freshParty.hostUsername, ...freshParty.members]
      setPickStatus(`Fetching ${allMembers.length} watchlists…`)

      const watchlistResults = await Promise.all(
        allMembers.map(async u => {
          const res = await fetch(`/api/watchlist?username=${encodeURIComponent(u)}`)
          const data = await res.json()
          return { username: u, films: (data.films ?? []) as LetterboxdFilm[] }
        })
      )

      // Build slug sets per user + deduplicated film list
      const watchlists = new Map<string, Set<string>>()
      const slugToFilm = new Map<string, LetterboxdFilm>()
      for (const { username, films } of watchlistResults) {
        const slugs = new Set<string>()
        for (const f of films) {
          slugs.add(f.slug)
          if (!slugToFilm.has(f.slug)) slugToFilm.set(f.slug, f)
        }
        watchlists.set(username, slugs)
      }

      const allFilms = Array.from(slugToFilm.values())
      const { films: pool, poolType: pt } = computePool(watchlists, allFilms)
      setPoolType(pt)

      if (pt === 'none') {
        setPhase('host-ready')
        setPickStatus('No films in common — try adjusting services or genres')
        return
      }

      // Enrich pool
      setPickStatus(`Enriching ${pool.length} shared films…`)
      const results: EnrichedFilm[] = []
      for (let i = 0; i < pool.length; i += CHUNK_SIZE) {
        if (cancelRef.current) return
        const chunk = pool.slice(i, i + CHUNK_SIZE)
        const enriched = await Promise.all(chunk.map(f => enrichFilm(f, 'US')))
        results.push(...enriched)
        setPickProgress(Math.round(((i + chunk.length) / pool.length) * 100))
      }

      setEnrichedPool(results)

      // Apply filters
      const genreFilter = [primaryGenre, alternateGenre].filter((g): g is number => g !== null)
      const available = results.filter(film => {
        if (!film.providers.some(p => selectedServices.has(p.providerName))) return false
        if (genreFilter.length === 0) return true
        return (film.genreIds ?? []).some(id => genreFilter.includes(id))
      })

      if (available.length === 0) {
        setPhase('host-ready')
        setPickStatus('No films match your services/genres — try adjusting filters')
        return
      }

      const picked = available[Math.floor(Math.random() * available.length)]

      // Store result
      await fetch(`/api/party/${id}/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Host-Token': hostToken },
        body: JSON.stringify({ pickedFilm: picked, poolSize: available.length }),
      })

      setPickedFilm(picked)
      setPhase('picked')
    } catch {
      setPhase('host-ready')
      setPickStatus('Something went wrong — please try again')
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Derive service options from enriched pool (host only, after pick)
  // During host-ready phase, services come from party state — show all of host's services
  // We show a static service selector (host sets what they have, not derived from pool)
  const sortedServices = useMemo(() => sortServices(Array.from(selectedServices)), [selectedServices])

  const availableGenres = useMemo(() => {
    const seen = new Set<number>()
    for (const film of enrichedPool) {
      for (const id of (film.genreIds ?? [])) {
        if (TMDB_GENRES[id]) seen.add(id)
      }
    }
    return Array.from(seen).sort((a, b) => TMDB_GENRES[a].localeCompare(TMDB_GENRES[b]))
  }, [enrichedPool])

  const availableFilms = useMemo(() => {
    if (!selectedServices.size) return []
    const genreFilter = [primaryGenre, alternateGenre].filter((g): g is number => g !== null)
    return enrichedPool.filter(film => {
      if (!film.providers.some(p => selectedServices.has(p.providerName))) return false
      if (genreFilter.length === 0) return true
      return (film.genreIds ?? []).some(gId => genreFilter.includes(gId))
    })
  }, [enrichedPool, selectedServices, primaryGenre, alternateGenre])

  const partyLink = typeof window !== 'undefined' ? window.location.href : ''
  const allMembers = party ? [party.hostUsername, ...party.members] : []

  // Common service input for host — manual entry since pool hasn't been enriched yet
  const COMMON_SERVICES = [
    'Netflix', 'Amazon Prime Video', 'Disney Plus', 'Max', 'Hulu',
    'Apple TV Plus', 'Peacock Premium', 'Paramount Plus', 'Criterion Channel',
    'Shudder', 'MUBI', 'Tubi TV', 'PlutoTV', 'Kanopy',
  ]

  const visibleServices = showAllServices ? COMMON_SERVICES : COMMON_SERVICES.slice(0, COLLAPSED_SERVICE_COUNT)

  return (
    <main className="min-h-dvh flex flex-col items-center px-5 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <Link href="/">
          <h1
            className="uppercase"
            style={{ color: '#f5a623', fontFamily: 'Humane, sans-serif', fontSize: '5.5rem', lineHeight: 1, letterSpacing: '-0.008em' }}
          >
            Now Playing
          </h1>
        </Link>
        <p className="mt-2 text-sm" style={{ color: '#71717a' }}>
          Party mode
        </p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-5">

        {/* Party code + copy link */}
        {(phase === 'joining' || phase === 'waiting' || phase === 'host-ready' || phase === 'picking') && (
          <div
            className="flex items-center justify-between px-4 py-3 rounded"
            style={{ background: '#141414', border: '1px solid #232323' }}
          >
            <div>
              <p className="text-xs" style={{ color: '#71717a' }}>Party code</p>
              <p className="text-xl font-bold tracking-widest" style={{ color: '#f5a623' }}>{id}</p>
            </div>
            <button
              onClick={copyLink}
              className="text-xs px-3 py-1.5 rounded font-medium transition-colors"
              style={{
                background: copied ? '#1e1a0e' : '#1a1a1a',
                color: copied ? '#f5a623' : '#888',
                border: `1px solid ${copied ? '#f5a623' : '#333'}`,
              }}
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        )}

        {/* Member list */}
        {party && (phase === 'waiting' || phase === 'host-ready' || phase === 'picking') && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium" style={{ color: '#71717a' }}>In the party</p>
            {allMembers.map(u => (
              <div
                key={u}
                className="flex items-center gap-2 px-3 py-2 rounded text-sm"
                style={{ background: '#141414' }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: '#f5a623' }}
                />
                <span style={{ color: '#e8e5e0' }}>@{u}</span>
                {u === party.hostUsername && (
                  <span className="text-xs ml-auto" style={{ color: '#555' }}>host</span>
                )}
              </div>
            ))}
            <p className="text-xs" style={{ color: '#444' }}>
              Share the link above so friends can join
            </p>
          </div>
        )}

        {/* LOADING */}
        {phase === 'loading' && (
          <div className="flex justify-center py-12">
            <div
              className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{ borderColor: '#f5a623', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {/* ERROR */}
        {phase === 'error' && (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: '#f87171' }}>Party not found.</p>
            <Link href="/" className="text-xs mt-3 block" style={{ color: '#555' }}>← Back to home</Link>
          </div>
        )}

        {/* EXPIRED */}
        {phase === 'expired' && (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: '#71717a' }}>This party has expired (24h limit).</p>
            <Link href="/party/new" className="text-xs mt-3 block" style={{ color: '#f5a623' }}>Create a new party</Link>
          </div>
        )}

        {/* JOIN FORM */}
        {phase === 'joining' && (
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: '#71717a' }}>
                Your Letterboxd username to join
              </label>
              <input
                type="text"
                value={joinUsername}
                onChange={e => setJoinUsername(e.target.value)}
                placeholder="your_username"
                autoComplete="off"
                spellCheck={false}
                className="w-full px-4 py-3 rounded text-sm outline-none"
                style={{ background: '#1a1a1a', color: '#e8e5e0', border: '1px solid #2a2a2a' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#f5a623')}
                onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
              />
            </div>
            {joinError && <p className="text-sm" style={{ color: '#f87171' }}>{joinError}</p>}
            <button
              type="submit"
              disabled={!joinUsername.trim() || joining}
              className="w-full py-3 rounded font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: '#f5a623', color: '#0d0d0d' }}
            >
              {joining ? 'Joining…' : 'Join party'}
            </button>
          </form>
        )}

        {/* WAITING (non-host joined) */}
        {phase === 'waiting' && (
          <div className="flex flex-col gap-3">
            <div
              className="px-4 py-4 rounded text-center"
              style={{ background: '#141414', border: '1px solid #232323' }}
            >
              <p className="text-sm font-medium">You&apos;re in!</p>
              <p className="text-xs mt-1" style={{ color: '#71717a' }}>
                Waiting for the host to pick a movie…
              </p>
              <div
                className="mt-3 w-5 h-5 mx-auto rounded-full border-2 animate-spin"
                style={{ borderColor: '#f5a623', borderTopColor: 'transparent' }}
              />
            </div>
            <button
              onClick={() => {
                localStorage.removeItem(`party-member-${id}`)
                setMyUsername(null)
                setPhase('joining')
              }}
              className="text-xs py-1 text-center"
              style={{ color: '#444' }}
            >
              Not you? Join as someone else
            </button>
          </div>
        )}

        {/* HOST CONTROLS */}
        {(phase === 'host-ready' || phase === 'picking') && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium" style={{ color: '#71717a' }}>
                Your streaming services:
              </p>
              {visibleServices.map(name => (
                <label
                  key={name}
                  className="flex items-center gap-3 px-3 py-2.5 rounded cursor-pointer"
                  style={{
                    background: selectedServices.has(name) ? '#1e1a0e' : '#141414',
                    border: `1px solid ${selectedServices.has(name) ? '#f5a623' : '#232323'}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedServices.has(name)}
                    onChange={() => toggleService(name)}
                    className="sr-only"
                  />
                  <span className="flex-1 text-sm">{name}</span>
                  <span
                    className="w-4 h-4 rounded-sm flex items-center justify-center text-xs flex-shrink-0"
                    style={{
                      background: selectedServices.has(name) ? '#f5a623' : 'transparent',
                      border: `1px solid ${selectedServices.has(name) ? '#f5a623' : '#555'}`,
                      color: '#0d0d0d',
                    }}
                  >
                    {selectedServices.has(name) ? '✓' : ''}
                  </span>
                </label>
              ))}
              {COMMON_SERVICES.length > COLLAPSED_SERVICE_COUNT && (
                <button
                  onClick={() => setShowAllServices(v => !v)}
                  className="text-xs py-1 text-left"
                  style={{ color: '#f5a623' }}
                >
                  {showAllServices
                    ? 'View less'
                    : `View more (${COMMON_SERVICES.length - COLLAPSED_SERVICE_COUNT} more)`}
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium" style={{ color: '#71717a' }}>
                Genre (optional — match either):
              </p>
              <div className="flex gap-2">
                <select
                  value={primaryGenre ?? ''}
                  onChange={e => setPrimaryGenre(e.target.value ? Number(e.target.value) : null)}
                  className="flex-1 px-3 py-2 rounded text-sm outline-none"
                  style={{ background: '#1a1a1a', color: '#e8e5e0', border: '1px solid #2a2a2a' }}
                >
                  <option value="">Any genre</option>
                  {Object.entries(TMDB_GENRES).sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
                <select
                  value={alternateGenre ?? ''}
                  onChange={e => setAlternateGenre(e.target.value ? Number(e.target.value) : null)}
                  className="flex-1 px-3 py-2 rounded text-sm outline-none"
                  style={{ background: '#1a1a1a', color: '#e8e5e0', border: '1px solid #2a2a2a' }}
                >
                  <option value="">Any genre</option>
                  {Object.entries(TMDB_GENRES).sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            {pickStatus && (
              <p className="text-xs text-center" style={{ color: phase === 'picking' ? '#f5a623' : '#f87171' }}>
                {pickStatus}
              </p>
            )}

            {phase === 'picking' && (
              <div className="flex flex-col gap-2">
                <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pickProgress}%`, background: '#f5a623' }}
                  />
                </div>
                <p className="text-xs text-center" style={{ color: '#71717a' }}>
                  {pickProgress}%
                </p>
              </div>
            )}

            {phase === 'host-ready' && (
              <button
                onClick={handlePick}
                disabled={selectedServices.size === 0}
                className="w-full py-3.5 rounded font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: '#f5a623', color: '#0d0d0d' }}
              >
                {party && party.members.length === 0
                  ? 'Pick for the group (waiting for friends to join)'
                  : `Pick for the group (${allMembers.length} members)`}
              </button>
            )}
          </div>
        )}

        {/* PICKED */}
        {phase === 'picked' && pickedFilm && (
          <div className="flex flex-col gap-4">
            {poolType === 'majority' && (
              <p className="text-xs text-center" style={{ color: '#71717a' }}>
                No films in common for all members — showing films most of the group has
              </p>
            )}
            {party && (
              <p className="text-xs text-center" style={{ color: '#555' }}>
                {party.poolSize != null
                  ? `Chosen from ${party.poolSize} film${party.poolSize !== 1 ? 's' : ''} across ${allMembers.length} watchlist${allMembers.length !== 1 ? 's' : ''}`
                  : `Picked from ${allMembers.length} watchlist${allMembers.length !== 1 ? 's' : ''}`}
              </p>
            )}
            <MovieCard
              film={pickedFilm}
              onReroll={isHost ? async () => {
                const others = availableFilms.filter(f => f.slug !== pickedFilm.slug)
                if (!others.length) return
                const next = others[Math.floor(Math.random() * others.length)]
                setPickedFilm(next)
                await fetch(`/api/party/${id}/pick`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-Host-Token': hostToken ?? '' },
                  body: JSON.stringify({ pickedFilm: next, poolSize: availableFilms.length }),
                })
              } : () => {}}
              onBack={isHost ? () => {
                setPickedFilm(null)
                setPhase('host-ready')
                setPickStatus('')
                setPickProgress(0)
              } : () => {}}
              availableCount={isHost ? availableFilms.length : 1}
            />
          </div>
        )}
      </div>

      <footer className="mt-auto pt-16 flex flex-col items-center gap-1 text-center">
        <p className="text-xs" style={{ color: '#444' }}>
          Streaming data provided by <span style={{ color: '#666' }}>TMDB</span> and{' '}
          <span style={{ color: '#666' }}>JustWatch</span>. Not endorsed by TMDB.
        </p>
      </footer>
    </main>
  )
}
