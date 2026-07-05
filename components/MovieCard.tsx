import Image from 'next/image'
import type { EnrichedFilm } from '@/lib/types'

type Props = {
  film: EnrichedFilm
  onReroll: () => void
  onBack: () => void
  availableCount: number
}

export default function MovieCard({ film, onReroll, onBack, availableCount }: Props) {
  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto gap-6">
      {/* Poster */}
      <div className="relative w-full aspect-[2/3] rounded overflow-hidden bg-zinc-900 shadow-2xl">
        {film.posterPath ? (
          <Image
            src={film.posterPath}
            alt={film.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 384px"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-sm">
            No poster
          </div>
        )}
      </div>

      {/* Info */}
      <div className="w-full space-y-3">
        <div>
          <h2 className="text-2xl font-bold text-white leading-tight">{film.name}</h2>
          <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400">
            {film.year && <span>{film.year}</span>}
            {film.voteAverage != null && film.voteAverage > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-amber-400">★</span>
                {film.voteAverage.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Streaming services */}
        {film.providers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {film.providers.map(p => (
              <div
                key={p.providerId}
                className="flex items-center gap-1.5 bg-zinc-800 rounded px-2 py-1"
                title={p.providerName}
              >
                <img
                  src={p.logoPath}
                  alt={p.providerName}
                  width={16}
                  height={16}
                  className="rounded-sm"
                />
                <span className="text-xs text-zinc-300">{p.providerName}</span>
              </div>
            ))}
          </div>
        )}

        {/* Overview */}
        {film.overview && (
          <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">{film.overview}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded text-sm text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
        >
          ← Change services
        </button>
        <button
          onClick={onReroll}
          disabled={availableCount <= 1}
          className="flex-1 py-3 rounded text-sm font-semibold bg-amber-400 text-black hover:bg-amber-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Try another
        </button>
      </div>

      {availableCount > 1 && (
        <p className="text-xs text-zinc-600">{availableCount} films available on your services</p>
      )}
    </div>
  )
}
