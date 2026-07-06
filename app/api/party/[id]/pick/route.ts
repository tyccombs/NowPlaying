import { NextResponse } from 'next/server'
import { updateParty, toPublic } from '@/lib/party'
import type { EnrichedFilm } from '@/lib/types'

type PickResult = { error: string; status: number } | null

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = req.headers.get('X-Host-Token')
  const body = await req.json()
  const pickedFilm: EnrichedFilm = body.pickedFilm
  if (!pickedFilm) return NextResponse.json({ error: 'pickedFilm required' }, { status: 400 })

  const outcome = await updateParty<PickResult>(id, party => {
    if (token !== party.hostToken) {
      return { party, write: false, result: { error: 'Forbidden', status: 403 } }
    }
    const updated = { ...party, pickedFilm }
    if (typeof body.poolSize === 'number') updated.poolSize = body.poolSize
    return { party: updated, write: true, result: null }
  })

  if (!outcome) return NextResponse.json({ error: 'Party not found' }, { status: 404 })
  if (outcome.result) return NextResponse.json({ error: outcome.result.error }, { status: outcome.result.status })
  return NextResponse.json(toPublic(outcome.party))
}
