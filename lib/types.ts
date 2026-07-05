export type TmdbMovieResult = {
  tmdbId: number
  posterPath: string | null
  overview: string
  voteAverage: number
}

export type LetterboxdFilm = {
  name: string
  year: string
  slug: string
}

export type StreamingProvider = {
  providerId: number
  providerName: string
  logoPath: string
}

export type EnrichedFilm = LetterboxdFilm & {
  tmdbId: number | null
  posterPath: string | null
  overview: string | null
  voteAverage: number | null
  providers: StreamingProvider[]
}
