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

export async function getWatchProviders(
  tmdbId: number,
  country: string,
  token: string
): Promise<StreamingProvider[]> {
  let res: Response
  try {
    res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TMDB_TIMEOUT_MS),
    })
  } catch {
    return []
  }
  if (!res.ok) return []

  const data = await res.json()
  const countryData = data.results?.[country]
  if (!countryData?.flatrate) return []

  return countryData.flatrate.map(
    (p: { provider_id: number; provider_name: string; logo_path: string }) => ({
      providerId: p.provider_id,
      providerName: p.provider_name,
      logoPath: `https://image.tmdb.org/t/p/w45${p.logo_path}`,
    })
  )
}
