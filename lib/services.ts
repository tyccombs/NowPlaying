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
  'PlutoTV',
  'Kanopy',
]

export function sortServices(services: string[]): string[] {
  const prioritized = PRIORITY_SERVICES.filter(s => services.includes(s))
  const rest = services.filter(s => !PRIORITY_SERVICES.includes(s)).sort()
  return [...prioritized, ...rest]
}

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
