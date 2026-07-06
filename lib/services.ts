export const TMDB_GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
}

// Priority order for display in the service selector
export const PRIORITY_SERVICES = [
  'Netflix',
  'Amazon Prime Video',
  'Disney Plus',
  'Max',
  'Hulu',
  'Apple TV Plus',
  'Peacock Premium',
  'Paramount Plus',
  'Criterion Channel',
  'Shudder',
  'MUBI',
  'Tubi TV',
  'Pluto TV',
  'The Roku Channel',
  'Kanopy',
]

// Ad-supported/free services shown with a "Free" badge in the selector.
// Kept as a name set (rather than plumbing TMDB's free/ads category through
// party mode's manually-entered service list) so both modes can badge the
// same well-known free services.
export const FREE_SERVICES = new Set(['Tubi TV', 'Pluto TV', 'The Roku Channel'])

export function sortServices(services: string[]): string[] {
  const prioritized = PRIORITY_SERVICES.filter(s => services.includes(s))
  const rest = services.filter(s => !PRIORITY_SERVICES.includes(s)).sort()
  return [...prioritized, ...rest]
}

// A film up to this many minutes over the selected max runtime still counts
// as a match — trailers/credits padding shouldn't rule out a near-fit film.
export const RUNTIME_BUFFER_MINUTES = 7

export const RUNTIME_OPTIONS = [90, 100, 110, 120, 150, 180]

export const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'IN', name: 'India' },
  { code: 'NZ', name: 'New Zealand' },
]
