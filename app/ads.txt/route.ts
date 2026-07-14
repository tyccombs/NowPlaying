// Publisher ID as shown in AdSense (e.g. "pub-1234567890123456", including
// the "pub-" prefix) — set via ADSENSE_PUBLISHER_ID once you have one.
const PUBLISHER_ID = process.env.ADSENSE_PUBLISHER_ID ?? ''

export async function GET() {
  const body = PUBLISHER_ID
    ? `google.com, ${PUBLISHER_ID}, DIRECT, f08c47fec0942fa0\n`
    : ''

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
