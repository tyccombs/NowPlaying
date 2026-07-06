import { NextResponse } from 'next/server'
import { readParty, updateParty, toPublic, PARTY_TTL_MS } from '@/lib/party'

type PutResult = { error: string; status: number } | null

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const party = await readParty(id)
  if (!party) return NextResponse.json({ error: 'Party not found' }, { status: 404 })
  if (Date.now() - party.createdAt > PARTY_TTL_MS) {
    return NextResponse.json({ error: 'Party expired' }, { status: 410 })
  }
  return NextResponse.json(toPublic(party))
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = req.headers.get('X-Host-Token')
  const body = await req.json()

  const outcome = await updateParty<PutResult>(id, party => {
    if (token !== party.hostToken) {
      return { party, write: false, result: { error: 'Forbidden', status: 403 } }
    }
    const updated = { ...party }
    if (body.services !== undefined) updated.services = body.services
    if (body.primaryGenre !== undefined) updated.primaryGenre = body.primaryGenre
    if (body.alternateGenre !== undefined) updated.alternateGenre = body.alternateGenre
    return { party: updated, write: true, result: null }
  })

  if (!outcome) return NextResponse.json({ error: 'Party not found' }, { status: 404 })
  if (outcome.result) return NextResponse.json({ error: outcome.result.error }, { status: outcome.result.status })
  return NextResponse.json(toPublic(outcome.party))
}
