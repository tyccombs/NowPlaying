import { head, put, BlobNotFoundError } from '@vercel/blob'
import type { PartyData, PartyState } from './types'

type PartyRecord = { party: PartyData; etag: string }

// Only a genuine "no such blob" collapses to null (not-found). Any other
// failure (network blip, rate limit) is rethrown so callers can retry
// instead of silently misreporting an existing party as not found.
async function readPartyRecord(id: string): Promise<PartyRecord | null> {
  let meta
  try {
    meta = await head(`parties/${id}.json`)
  } catch (err) {
    if (err instanceof BlobNotFoundError) return null
    throw err
  }
  const res = await fetch(meta.downloadUrl, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Failed to read party blob: HTTP ${res.status}`)
  return { party: (await res.json()) as PartyData, etag: meta.etag }
}

export async function readParty(id: string): Promise<PartyData | null> {
  const record = await readPartyRecord(id)
  return record?.party ?? null
}

export async function writeParty(party: PartyData, ifMatch?: string): Promise<void> {
  await put(`parties/${party.id}.json`, JSON.stringify(party), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    ...(ifMatch ? { ifMatch } : {}),
  })
}

export function toPublic(party: PartyData): PartyState {
  const { hostToken: _, ...pub } = party
  return pub
}

export const PARTY_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Read-modify-write with optimistic concurrency (blob ETag `ifMatch`).
 * Two requests racing (e.g. two members joining within the same instant)
 * would otherwise both read the same state and one write would silently
 * clobber the other's change — this retries from a fresh read whenever the
 * write is rejected instead of losing an update. Any write failure (ETag
 * conflict or otherwise) triggers a retry from a fresh read; if the failure
 * wasn't actually a conflict it will simply fail the same way again and
 * surface once attempts are exhausted.
 *
 * `mutate` returns `{ party, write }` — `write: false` skips the network
 * write entirely (e.g. an idempotent no-op or a validation error).
 */
export async function updateParty<T>(
  id: string,
  mutate: (party: PartyData) => { party: PartyData; write: boolean; result: T }
): Promise<{ party: PartyData; result: T } | null> {
  const MAX_ATTEMPTS = 8
  let lastErr: unknown

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 50 + Math.random() * 150))
    }

    let record: PartyRecord | null
    try {
      record = await readPartyRecord(id)
    } catch (err) {
      lastErr = err
      continue
    }
    if (!record) return null

    const { party, write, result } = mutate(record.party)
    if (!write) return { party, result }

    try {
      await writeParty(party, record.etag)
      return { party, result }
    } catch (err) {
      lastErr = err
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('Could not update party after multiple conflicting writes')
}
