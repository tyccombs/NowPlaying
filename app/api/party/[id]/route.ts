import { NextResponse } from 'next/server'
import { readParty, writeParty, toPublic, PARTY_TTL_MS } from '@/lib/party'

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
  const party = await readParty(id)
  if (!party) return NextResponse.json({ error: 'Party not found' }, { status: 404 })

  const token = req.headers.get('X-Host-Token')
  if (token !== party.hostToken) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (body.services !== undefined) party.services = body.services
  if (body.primaryGenre !== undefined) party.primaryGenre = body.primaryGenre
  if (body.alternateGenre !== undefined) party.alternateGenre = body.alternateGenre

  await writeParty(party)
  return NextResponse.json(toPublic(party))
}
