import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = "Now Playing — pick a movie from your Letterboxd watchlist that's streaming tonight"

// Satori (next/og's renderer) has no built-in fonts — any text without a
// registered, matching font-family silently falls back to whatever font
// data WAS supplied, which is why the tagline rendered in the same
// condensed display face as the headline before this fetch was added.
async function loadSpaceGrotesk(): Promise<ArrayBuffer> {
  const css = await (
    await fetch('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500')
  ).text()
  const match = css.match(/src: url\(([^)]+)\)/)
  if (!match) throw new Error('Could not find Space Grotesk font URL')
  const res = await fetch(match[1])
  return res.arrayBuffer()
}

export default async function Image() {
  const [humaneBold, spaceGrotesk] = await Promise.all([
    readFile(join(process.cwd(), 'public/Humane-Bold.ttf')),
    loadSpaceGrotesk(),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d0d0d',
        }}
      >
        <div
          style={{
            fontFamily: 'Humane',
            fontSize: 180,
            lineHeight: 1,
            color: '#f5a623',
            letterSpacing: '-0.008em',
            textTransform: 'uppercase',
            display: 'flex',
          }}
        >
          Now Playing
        </div>
        <div
          style={{
            fontFamily: 'Space Grotesk',
            marginTop: 28,
            fontSize: 30,
            color: '#a1a1aa',
            display: 'flex',
          }}
        >
          {/* Zero-width space splits the "tt" pair so Satori doesn't form a
              ligature glyph for it — with one it does, but then miscalculates
              the following space's width, leaving a visible gap. */}
          Pick a movie from your Let{'​'}terboxd watchlist that&apos;s streaming tonight
        </div>
        <div
          style={{
            fontFamily: 'Space Grotesk',
            marginTop: 44,
            fontSize: 20,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#555555',
            display: 'flex',
          }}
        >
          BY WENCOMB
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Humane',
          data: humaneBold,
          style: 'normal',
          weight: 700,
        },
        {
          name: 'Space Grotesk',
          data: spaceGrotesk,
          style: 'normal',
          weight: 500,
        },
      ],
    }
  )
}
