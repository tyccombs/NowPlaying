import { NextResponse } from 'next/server'
import { updateParty, toPublic, PARTY_TTL_MS } from '@/lib/party'

type JoinResult = { error: string; status: number } | null

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const username = body.username?.trim().toLowerCase()
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 })

  const outcome = await updateParty<JoinResult>(id, party => {
    if (Date.now() - party.createdAt > PARTY_TTL_MS) {
      return { party, write: false, result: { error: 'Party expired', status: 410 } }
    }
    if (username === party.hostUsername) {
      return { party, write: false, result: { error: 'You are already the host', status: 400 } }
    }
    if (party.members.includes(username)) {
      return { party, write: false, result: null }
    }
    if (party.members.length >= 9) {
      return { party, write: false, result: { error: 'Party is full (max 10 members)', status: 400 } }
    }
    return { party: { ...party, members: [...party.members, username] }, write: true, result: null }
  })

  if (!outcome) return NextResponse.json({ error: 'Party not found' }, { status: 404 })
  if (outcome.result) return NextResponse.json({ error: outcome.result.error }, { status: outcome.result.status })
  return NextResponse.json(toPublic(outcome.party))
}
