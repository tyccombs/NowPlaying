import { NextResponse } from 'next/server'
import { readParty, writeParty, toPublic, PARTY_TTL_MS } from '@/lib/party'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const party = await readParty(id)
  if (!party) return NextResponse.json({ error: 'Party not found' }, { status: 404 })
  if (Date.now() - party.createdAt > PARTY_TTL_MS) {
    return NextResponse.json({ error: 'Party expired' }, { status: 410 })
  }

  const body = await req.json()
  const username = body.username?.trim().toLowerCase()
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 })

  if (username === party.hostUsername) {
    return NextResponse.json({ error: 'You are already the host' }, { status: 400 })
  }
  if (party.members.includes(username)) {
    return NextResponse.json(toPublic(party))
  }
  if (party.members.length >= 9) {
    return NextResponse.json({ error: 'Party is full (max 10 members)' }, { status: 400 })
  }

  party.members.push(username)
  await writeParty(party)
  return NextResponse.json(toPublic(party))
}
