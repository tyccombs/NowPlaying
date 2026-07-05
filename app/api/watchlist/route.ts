import { fetchWatchlist } from '@/lib/letterboxd'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username')?.trim().toLowerCase()

  if (!username) {
    return Response.json({ error: 'Username is required' }, { status: 400 })
  }

  const result = await fetchWatchlist(username)

  if (result.userNotFound) {
    return Response.json({ error: `Letterboxd user "${username}" not found.` }, { status: 404 })
  }

  if (result.isPrivate) {
    return Response.json(
      {
        error:
          'This watchlist is private. Go to letterboxd.com → Settings → Privacy and set your watchlist to public.',
      },
      { status: 403 }
    )
  }

  if (result.error) {
    return Response.json(
      { error: 'Could not load watchlist. Please try again.' },
      { status: 500 }
    )
  }

  if (result.films.length === 0) {
    return Response.json({ error: 'This watchlist appears to be empty.' }, { status: 404 })
  }

  return Response.json({ films: result.films, total: result.films.length })
}
