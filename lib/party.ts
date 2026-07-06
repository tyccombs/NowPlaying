import { list, put } from '@vercel/blob'
import type { PartyData, PartyState } from './types'

export async function readParty(id: string): Promise<PartyData | null> {
  try {
    const { blobs } = await list({ prefix: `parties/${id}.json`, limit: 1 })
    if (!blobs.length) return null
    const res = await fetch(blobs[0].downloadUrl, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function writeParty(party: PartyData): Promise<void> {
  await put(`parties/${party.id}.json`, JSON.stringify(party), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
}

export function toPublic(party: PartyData): PartyState {
  const { hostToken: _, ...pub } = party
  return pub
}

export const PARTY_TTL_MS = 24 * 60 * 60 * 1000
