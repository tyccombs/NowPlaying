import { NextResponse } from 'next/server'
import { readParty, writeParty, toPublic } from '@/lib/party'
import type { EnrichedFilm } from '@/lib/types'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const party = await readParty(id)
  if (!party) return NextResponse.json({ error: 'Party not found' }, { status: 404 })

  const token = req.headers.get('X-Host-Token')
  if (token !== party.hostToken) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const pickedFilm: EnrichedFilm = body.pickedFilm
  if (!pickedFilm) return NextResponse.json({ error: 'pickedFilm required' }, { status: 400 })

  party.pickedFilm = pickedFilm
  await writeParty(party)
  return NextResponse.json(toPublic(party))
}
