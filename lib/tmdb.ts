import type { StreamingProvider, TmdbMovieResult } from './types'

const TMDB_TIMEOUT_MS = 8_000

export async function searchMovie(
  name: string,
  year: string,
  token: string
): Promise<TmdbMovieResult | null> {
  const params = new URLSearchParams({
    query: name,
    language: 'en-US',
    page: '1',
    include_adult: 'false',
  })
  if (year) params.set('primary_release_year', year)

  let res: Response
  try {
    res = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TMDB_TIMEOUT_MS),
    })
  } catch {
    // Network error or timeout on this one film — skip it rather than stalling the whole batch
    return null
  }
  if (!res.ok) return null

  const data = await res.json()
  const movie = data.results?.[0]
  if (!movie) return null

  return {
    tmdbId: movie.id,
    posterPath: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : null,
    overview: movie.overview || '',
    voteAverage: Math.round((movie.vote_average || 0) * 10) / 10,
    genreIds: movie.genre_ids || [],
  }
}

export async function getMovieDetails(
  tmdbId: number,
  country: string,
  token: string
): Promise<{ runtime: number | null; providers: StreamingProvider[] }> {
  let res: Response
  try {
    // append_to_response bundles the watch/providers call onto the same
    // request as movie details (which is where `runtime` lives) instead of
    // firing a second fetch.
    res = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?append_to_response=watch%2Fproviders`,
      {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(TMDB_TIMEOUT_MS),
      }
    )
  } catch {
    return { runtime: null, providers: [] }
  }
  if (!res.ok) return { runtime: null, providers: [] }

  const data = await res.json()
  const runtime = typeof data.runtime === 'number' && data.runtime > 0 ? data.runtime : null

  const countryData = data['watch/providers']?.results?.[country]
  if (!countryData) return { runtime, providers: [] }

  // TMDB splits providers into subscription (`flatrate`) vs ad-supported/free
  // (`free`, `ads`) tiers, e.g. Tubi and Pluto TV live under `free`. A provider
  // can appear in more than one bucket (e.g. rent + free) — dedupe by id and
  // keep the first bucket it's found in, checking `flatrate` first so a
  // provider also offered ad-free isn't mislabeled as free.
  const buckets: Array<['flatrate' | 'free' | 'ads', boolean]> = [
    ['flatrate', false],
    ['free', true],
    ['ads', true],
  ]

  const seen = new Map<number, StreamingProvider>()
  for (const [key, free] of buckets) {
    const entries = countryData[key] as
      | Array<{ provider_id: number; provider_name: string; logo_path: string }>
      | undefined
    if (!entries) continue
    for (const p of entries) {
      if (seen.has(p.provider_id)) continue
      seen.set(p.provider_id, {
        providerId: p.provider_id,
        providerName: p.provider_name,
        logoPath: `https://image.tmdb.org/t/p/w45${p.logo_path}`,
        free,
      })
    }
  }

  return { runtime, providers: Array.from(seen.values()) }
}
