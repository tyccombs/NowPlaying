import { get, put, BlobNotFoundError } from '@vercel/blob'
import type { PartyData, PartyState } from './types'

export async function readParty(id: string): Promise<PartyData | null> {
  try {
    const result = await get(`parties/${id}.json`, { access: 'private' })
    if (!result || result.statusCode !== 200 || !result.stream) return null
    const text = await new Response(result.stream).text()
    return JSON.parse(text) as PartyData
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
