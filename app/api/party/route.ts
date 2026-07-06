import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import type { PartyData } from '@/lib/types'

function randomId(len: number) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

function randomHex(bytes: number) {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(request: Request) {
  const body = await request.json()
  const hostUsername = body.hostUsername?.trim().toLowerCase()
  if (!hostUsername) return NextResponse.json({ error: 'hostUsername required' }, { status: 400 })

  const id = randomId(6)
  const hostToken = randomHex(16)

  const party: PartyData = {
    id,
    hostToken,
    hostUsername,
    members: [],
    services: [],
    primaryGenre: null,
    alternateGenre: null,
    pickedFilm: null,
    createdAt: Date.now(),
  }

  await put(`parties/${id}.json`, JSON.stringify(party), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  })

  return NextResponse.json({ id, hostToken })
}
