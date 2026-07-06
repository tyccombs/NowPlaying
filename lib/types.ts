export type TmdbMovieResult = {
  tmdbId: number
  posterPath: string | null
  overview: string
  voteAverage: number
  genreIds: number[]
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
  free: boolean
}

export type EnrichedFilm = LetterboxdFilm & {
  tmdbId: number | null
  posterPath: string | null
  overview: string | null
  voteAverage: number | null
  providers: StreamingProvider[]
  genreIds: number[]
}

export type PartyData = {
  id: string
  hostToken: string
  hostUsername: string
  members: string[]
  services: string[]
  primaryGenre: number | null
  alternateGenre: number | null
  pickedFilm: EnrichedFilm | null
  poolSize: number | null
  createdAt: number
}

export type PartyState = Omit<PartyData, 'hostToken'>
