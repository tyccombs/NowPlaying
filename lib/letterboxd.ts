import { load } from 'cheerio'
import type { LetterboxdFilm } from './types'

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

const YEAR_RE = /^(.+?)\s+\((\d{4})\)$/
const PAGE_TIMEOUT_MS = 12_000

function parseFilmsFromHtml(html: string): { films: LetterboxdFilm[]; totalPages: number } {
  const $ = load(html)
  const films: LetterboxdFilm[] = []

  // New structure (2025+): li.griditem > div.react-component[data-item-name][data-item-slug]
  $('li.griditem .react-component[data-item-slug]').each((_, el) => {
    const raw = $(el).attr('data-item-name') || ''
    const slug = $(el).attr('data-item-slug') || ''
    if (!raw || !slug) return
    const match = YEAR_RE.exec(raw)
    const name = match ? match[1] : raw
    const year = match ? match[2] : ''
    films.push({ name, year, slug })
  })

  let totalPages = 1
  const pageNums = $('.paginate-pages li a')
    .toArray()
    .map(el => parseInt($(el).text().trim()))
    .filter(n => !isNaN(n))
  if (pageNums.length > 0) totalPages = Math.max(...pageNums)

  return { films, totalPages }
}

async function fetchPage(username: string, page: number): Promise<string> {
  const url =
    page === 1
      ? `https://letterboxd.com/${username}/watchlist/`
      : `https://letterboxd.com/${username}/watchlist/page/${page}/`

  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(PAGE_TIMEOUT_MS) })
  if (res.status === 404) throw Object.assign(new Error('not_found'), { code: 'not_found' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

export async function fetchWatchlist(username: string): Promise<{
  films: LetterboxdFilm[]
  isPrivate?: boolean
  userNotFound?: boolean
  error?: string
}> {
  try {
    const html1 = await fetchPage(username, 1)
    const { films: page1Films, totalPages } = parseFilmsFromHtml(html1)

    // Heuristic for private profiles: page loads but no film grid items
    if (page1Films.length === 0) {
      const $ = load(html1)
      const bodyText = $('body').text()
      const looksPrivate = bodyText.includes('private') || bodyText.includes('isn’t visible')
      if (looksPrivate) return { films: [], isPrivate: true }
      // Genuinely empty watchlist
      return { films: [] }
    }

    if (totalPages <= 1) return { films: page1Films }

    // Fetch remaining pages in parallel. Use allSettled so one slow/failed
    // page (timeout, dropped connection) doesn't discard the whole scan.
    const pageNumbers = Array.from({ length: totalPages - 1 }, (_, i) => i + 2)
    const settled = await Promise.allSettled(pageNumbers.map(p => fetchPage(username, p)))
    const htmlPages = settled
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map(r => r.value)
    const allFilms = [
      page1Films,
      ...htmlPages.map(html => parseFilmsFromHtml(html).films),
    ].flat()

    return { films: allFilms }
  } catch (err: unknown) {
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'not_found') {
      return { films: [], userNotFound: true }
    }
    return { films: [], error: String(err) }
  }
}
