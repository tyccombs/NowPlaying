import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { Resend } from 'resend'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const resend = new Resend(process.env.RESEND_API_KEY)

async function sendWelcomeEmails(email: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return

  try {
    await resend.emails.send({
      from: 'Now Playing <nowplaying@wencomb.com>',
      to: email,
      subject: 'Welcome to Now Playing',
      html: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap" rel="stylesheet" />
  </head>
  <body style="margin:0;padding:0;background:#0d0d0d;font-family:'Space Grotesk',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
            <tr>
              <td style="padding-bottom:28px;">
                <img src="https://nowplayingmovie.com/email-wordmark.png" alt="Now Playing" width="220" style="display:inline-block;" />
              </td>
            </tr>
            <tr>
              <td style="color:#e8e5e0;font-size:24px;font-weight:700;padding-bottom:16px;">
                Welcome to Now Playing
              </td>
            </tr>
            <tr>
              <td style="color:#71717a;font-size:15px;line-height:1.6;padding-bottom:28px;">
                Hey,<br /><br />
                You're signed in as host. Now Playing pulls straight from your Letterboxd watchlist and picks something to watch &mdash; filtered by streaming service, genre, and runtime, solo or with a party.
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:40px;">
                <a href="https://nowplayingmovie.com" style="display:inline-block;background:#f5a623;color:#0d0d0d;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:4px;">
                  Open Now Playing
                </a>
              </td>
            </tr>
            <tr>
              <td style="color:#444444;font-size:12px;">
                Now Playing, a product by <a href="https://www.wencomb.com" style="color:inherit;text-decoration:underline;">Wencomb</a>.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    })
  } catch (error) {
    console.error('Resend (Now Playing welcome) error:', error)
  }

  try {
    await resend.emails.send({
      from: 'Wencomb <hello@wencomb.com>',
      to: email,
      subject: 'Welcome to Wencomb',
      html: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
  </head>
  <body style="margin:0;padding:0;background:#ffffff;font-family:'Inter',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
            <tr>
              <td style="background:#000000;padding:24px 0;text-align:center;">
                <img src="https://www.wencomb.com/wencomb-logo.png" alt="Wencomb" width="140" height="44" style="display:inline-block;" />
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;padding:48px 32px;text-align:center;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#000000;font-size:24px;font-weight:700;padding-bottom:16px;text-align:center;">
                      Welcome to Wencomb
                    </td>
                  </tr>
                  <tr>
                    <td style="color:#000000;font-size:15px;line-height:1.7;padding-bottom:12px;text-align:center;">
                      Hey,<br /><br />
                      Wencomb is our studio &mdash; home to the tools and films we're building, including Slated, Now Playing, and whatever short or feature we're cutting next.
                    </td>
                  </tr>
                  <tr>
                    <td style="color:#9ca3af;font-size:13px;line-height:1.7;padding-bottom:28px;text-align:center;">
                      You'll hear from us here occasionally with updates on new releases and projects.
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <a href="https://www.wencomb.com" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;">
                        Visit Wencomb
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    })
  } catch (error) {
    console.error('Resend (Wencomb welcome) error:', error)
  }
}

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

    await sendWelcomeEmails(email)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Subscribe error:', error)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}
