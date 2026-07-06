'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import MovieCard from '@/components/MovieCard'
import { cacheGet, cacheSet } from '@/lib/cache'
import { searchMovie, getWatchProviders } from '@/lib/tmdb'
import { sortServices, COUNTRIES, TMDB_GENRES } from '@/lib/services'
import type { LetterboxdFilm, EnrichedFilm } from '@/lib/types'

type Phase = 'idle' | 'loading' | 'enriching' | 'ready' | 'picked'

const TMDB_TOKEN = process.env.NEXT_PUBLIC_TMDB_READ_TOKEN ?? ''
const CHUNK_SIZE = 15
const COLLAPSED_SERVICE_COUNT = 6

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

export default function Page() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [username, setUsername] = useState('')
  const [country, setCountry] = useState('US')
  const [films, setFilms] = useState<LetterboxdFilm[]>([])
  const [enriched, setEnriched] = useState<EnrichedFilm[]>([])
  const [enrichProgress, setEnrichProgress] = useState(0)
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set())
  const [showAllServices, setShowAllServices] = useState(false)
  const [primaryGenre, setPrimaryGenre] = useState<number | null>(null)
  const [alternateGenre, setAlternateGenre] = useState<number | null>(null)
  const [pickedFilm, setPickedFilm] = useState<EnrichedFilm | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef(false)

  // Enrich films with TMDB data once the watchlist loads
  useEffect(() => {
    if (phase !== 'enriching' || films.length === 0) return

    cancelRef.current = false
    const results: EnrichedFilm[] = []

    async function run() {
      for (let i = 0; i < films.length; i += CHUNK_SIZE) {
        if (cancelRef.current) return
        const chunk = films.slice(i, i + CHUNK_SIZE)
        const enrichedChunk = await Promise.all(chunk.map(f => enrichFilm(f, country)))
        results.push(...enrichedChunk)
        setEnriched([...results])
        setEnrichProgress(Math.round(((i + chunk.length) / films.length) * 100))
      }
      if (!cancelRef.current) setPhase('ready')
    }

    run()
    return () => { cancelRef.current = true }
  }, [phase, films, country])

  // Restore service selection from localStorage
  useEffect(() => {
    if (phase !== 'ready') return
    const saved = cacheGet<string[]>('selected_services')
    if (saved?.length) setSelectedServices(new Set(saved))
  }, [phase])

  const serviceOptions = useMemo(() => {
    const map = new Map<string, { count: number; logoPath: string; providerId: number }>()
    for (const film of enriched) {
      for (const p of film.providers) {
        const existing = map.get(p.providerName)
        if (existing) {
          existing.count++
        } else {
          map.set(p.providerName, { count: 1, logoPath: p.logoPath, providerId: p.providerId })
        }
      }
    }
    return map
  }, [enriched])

  const sortedServices = useMemo(
    () => sortServices(Array.from(serviceOptions.keys())),
    [serviceOptions]
  )

  const availableGenres = useMemo(() => {
    const seen = new Set<number>()
    for (const film of enriched) {
      for (const id of (film.genreIds ?? [])) {
        if (TMDB_GENRES[id]) seen.add(id)
      }
    }
    return Array.from(seen).sort((a, b) =>
      TMDB_GENRES[a].localeCompare(TMDB_GENRES[b])
    )
  }, [enriched])

  const availableFilms = useMemo(() => {
    if (!selectedServices.size) return []
    const genreFilter = [primaryGenre, alternateGenre].filter((g): g is number => g !== null)
    return enriched.filter(film => {
      if (!film.providers.some(p => selectedServices.has(p.providerName))) return false
      if (genreFilter.length === 0) return true
      return (film.genreIds ?? []).some(id => genreFilter.includes(id))
    })
  }, [enriched, selectedServices, primaryGenre, alternateGenre])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const u = username.trim().toLowerCase()
    if (!u) return

    setError(null)
    setFilms([])
    setEnriched([])
    setEnrichProgress(0)
    setPickedFilm(null)
    setPrimaryGenre(null)
    setAlternateGenre(null)
    setPhase('loading')

    try {
      const res = await fetch(`/api/watchlist?username=${encodeURIComponent(u)}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setPhase('idle')
        return
      }

      setFilms(data.films)
      setPhase('enriching')
    } catch {
      setError('Network error. Please check your connection.')
      setPhase('idle')
    }
  }

  function toggleService(name: string) {
    setSelectedServices(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      cacheSet('selected_services', Array.from(next))
      return next
    })
  }

  const handlePick = useCallback(() => {
    if (!availableFilms.length) return
    const idx = Math.floor(Math.random() * availableFilms.length)
    setPickedFilm(availableFilms[idx])
    setPhase('picked')
  }, [availableFilms])

  const handleReroll = useCallback(() => {
    if (availableFilms.length <= 1) return
    let idx: number
    do {
      idx = Math.floor(Math.random() * availableFilms.length)
    } while (availableFilms[idx].slug === pickedFilm?.slug)
    setPickedFilm(availableFilms[idx])
  }, [availableFilms, pickedFilm])

  const handleBack = useCallback(() => {
    setPickedFilm(null)
    setPhase('ready')
  }, [])

  return (
    <main className="min-h-dvh flex flex-col items-center px-5 py-12">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1
          className="uppercase"
          style={{ color: '#f5a623', fontFamily: 'Humane, sans-serif', fontSize: '5.5rem', lineHeight: 1, letterSpacing: '-0.015em' }}
        >
          Now Playing
        </h1>
        <p className="mt-2 text-sm" style={{ color: '#71717a' }}>
          Pick a movie from your Letterboxd watchlist that&apos;s streaming tonight
        </p>
      </div>

      <div className="w-full max-w-sm">
        {/* IDLE */}
        {phase === 'idle' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: '#71717a' }}>
                Letterboxd username
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

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: '#71717a' }}>
                Country
              </label>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full px-4 py-3 rounded text-sm outline-none"
                style={{
                  background: '#1a1a1a',
                  color: '#e8e5e0',
                  border: '1px solid #2a2a2a',
                }}
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-sm px-1" style={{ color: '#f87171' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!username.trim()}
              className="w-full py-3 rounded font-semibold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: '#f5a623', color: '#0d0d0d' }}
            >
              Scan my watchlist
            </button>

            <div className="text-center pt-1">
              <span className="text-xs" style={{ color: '#444' }}>or </span>
              <Link href="/party/new" className="text-xs" style={{ color: '#f5a623' }}>
                create a party
              </Link>
            </div>
          </form>
        )}

        {/* LOADING */}
        {phase === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#f5a623', borderTopColor: 'transparent' }}
            />
            <p className="text-sm" style={{ color: '#71717a' }}>
              Scanning @{username}&apos;s watchlist…
            </p>
          </div>
        )}

        {/* ENRICHING */}
        {phase === 'enriching' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-sm font-medium">Loading streaming data…</p>
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${enrichProgress}%`, background: '#f5a623' }}
                />
              </div>
              <p className="text-xs" style={{ color: '#71717a' }}>
                {enriched.length} / {films.length} films
              </p>
            </div>

            {/* Show service selector early as data comes in */}
            {enriched.length > 0 && serviceOptions.size > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium" style={{ color: '#71717a' }}>
                  Services found so far — select yours:
                </p>
                {(showAllServices ? sortedServices : sortedServices.slice(0, COLLAPSED_SERVICE_COUNT)).map(name => {
                  const svc = serviceOptions.get(name)!
                  return (
                    <label
                      key={name}
                      className="flex items-center gap-3 px-3 py-2.5 rounded cursor-pointer transition-colors"
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
                      <img src={svc.logoPath} alt={name} width={20} height={20} className="rounded-sm flex-shrink-0" />
                      <span className="flex-1 text-sm">{name}</span>
                      <span className="text-xs" style={{ color: '#71717a' }}>{svc.count}</span>
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
                  )
                })}
                {sortedServices.length > COLLAPSED_SERVICE_COUNT && (
                  <button
                    onClick={() => setShowAllServices(v => !v)}
                    className="text-xs py-1 text-left transition-colors"
                    style={{ color: '#f5a623' }}
                  >
                    {showAllServices
                      ? 'View less'
                      : `View more (${sortedServices.length - COLLAPSED_SERVICE_COUNT} more)`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* READY */}
        {phase === 'ready' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm" style={{ color: '#71717a' }}>
              <span className="font-semibold" style={{ color: '#e8e5e0' }}>
                {films.length} films
              </span>{' '}
              on @{username}&apos;s watchlist.{' '}
              {enriched.filter(f => f.providers.length > 0).length} have streaming data.
            </p>

            {sortedServices.length === 0 ? (
              <p className="text-sm" style={{ color: '#71717a' }}>
                None of your watchlist films appear to be on any streaming services in{' '}
                {COUNTRIES.find(c => c.code === country)?.name ?? country}.
              </p>
            ) : (
              <>
                <p className="text-xs font-medium" style={{ color: '#71717a' }}>
                  Select the services you subscribe to:
                </p>
                <div className="flex flex-col gap-2">
                  {(showAllServices ? sortedServices : sortedServices.slice(0, COLLAPSED_SERVICE_COUNT)).map(name => {
                    const svc = serviceOptions.get(name)!
                    return (
                      <label
                        key={name}
                        className="flex items-center gap-3 px-3 py-2.5 rounded cursor-pointer transition-colors"
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
                        <img src={svc.logoPath} alt={name} width={20} height={20} className="rounded-sm flex-shrink-0" />
                        <span className="flex-1 text-sm">{name}</span>
                        <span className="text-xs" style={{ color: '#71717a' }}>{svc.count}</span>
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
                    )
                  })}
                  {sortedServices.length > COLLAPSED_SERVICE_COUNT && (
                    <button
                      onClick={() => setShowAllServices(v => !v)}
                      className="text-xs py-1 text-left transition-colors"
                      style={{ color: '#f5a623' }}
                    >
                      {showAllServices
                        ? 'View less'
                        : `View more (${sortedServices.length - COLLAPSED_SERVICE_COUNT} more)`}
                    </button>
                  )}
                </div>

                {availableGenres.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-2">
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
                        {availableGenres.map(id => (
                          <option key={id} value={id}>{TMDB_GENRES[id]}</option>
                        ))}
                      </select>
                      <select
                        value={alternateGenre ?? ''}
                        onChange={e => setAlternateGenre(e.target.value ? Number(e.target.value) : null)}
                        className="flex-1 px-3 py-2 rounded text-sm outline-none"
                        style={{ background: '#1a1a1a', color: '#e8e5e0', border: '1px solid #2a2a2a' }}
                      >
                        <option value="">Any genre</option>
                        {availableGenres.map(id => (
                          <option key={id} value={id}>{TMDB_GENRES[id]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={handlePick}
                    disabled={availableFilms.length === 0}
                    className="w-full py-3.5 rounded font-bold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: '#f5a623', color: '#0d0d0d' }}
                  >
                    {availableFilms.length > 0
                      ? `Pick a movie (${availableFilms.length} available)`
                      : 'No films on selected services'}
                  </button>
                  <button
                    onClick={() => { setPhase('idle'); setFilms([]); setEnriched([]) }}
                    className="text-xs py-2 transition-colors"
                    style={{ color: '#555' }}
                  >
                    ← Search a different username
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* PICKED */}
        {phase === 'picked' && pickedFilm && (
          <MovieCard
            film={pickedFilm}
            onReroll={handleReroll}
            onBack={handleBack}
            availableCount={availableFilms.length}
          />
        )}
      </div>

      {/* Attribution footer */}
      <footer className="mt-auto pt-16 flex flex-col items-center gap-1 text-center">
        <p className="text-xs" style={{ color: '#444' }}>
          Streaming data provided by{' '}
          <span style={{ color: '#666' }}>TMDB</span> and{' '}
          <span style={{ color: '#666' }}>JustWatch</span>.
          Not endorsed by TMDB.
        </p>
        <p className="text-xs" style={{ color: '#333' }}>
          Requires a public Letterboxd profile.
        </p>
      </footer>
    </main>
  )
}
