import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const apiKey = process.env.MAILCHIMP_API_KEY
    const listId = process.env.MAILCHIMP_LIST_ID
    const server = process.env.MAILCHIMP_SERVER_PREFIX

    if (!apiKey || !listId || !server) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 })
    }

    const authHeader = `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}`
    const base = `https://${server}.api.mailchimp.com/3.0/lists/${listId}`

    const res = await fetch(`${base}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed',
        tags: ['now-playing'],
      }),
    })

    if (!res.ok) {
      const body = await res.json()
      if (!(res.status === 400 && body.title === 'Member Exists')) {
        throw new Error(`Mailchimp ${res.status}: ${body.detail}`)
      }
      // Already subscribed — the tags array above only applies at creation,
      // so tag existing members explicitly via the subscriber hash.
      const hash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex')
      await fetch(`${base}/members/${hash}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ tags: [{ name: 'now-playing', status: 'active' }] }),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Subscribe error:', error)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}
