const TTL = 24 * 60 * 60 * 1000 // 24 hours

export function cacheGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`np:${key}`)
    if (!raw) return null
    const { value, expires } = JSON.parse(raw)
    if (Date.now() > expires) {
      localStorage.removeItem(`np:${key}`)
      return null
    }
    return value as T
  } catch {
    return null
  }
}

export function cacheSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`np:${key}`, JSON.stringify({ value, expires: Date.now() + TTL }))
  } catch {
    // localStorage might be full or unavailable — silent fail
  }
}
