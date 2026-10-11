'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, X } from 'lucide-react'

export function HeaderTrackSearch() {
  const [trackId, setTrackId] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (expanded) inputRef.current?.focus()
  }, [expanded])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = trackId.trim()
    if (!trimmed) return

    setLoading(true)
    router.push(`/track/${encodeURIComponent(trimmed)}`)
  }

  return expanded ? (
    <form onSubmit={handleSearch} className="relative flex items-center">
      <div className="relative flex w-48 items-center sm:w-64 md:w-72">
        <input
          ref={inputRef}
          type="text"
          value={trackId}
          onChange={(e) => setTrackId(e.target.value)}
          placeholder="Input Track ID..."
          aria-label="Donation tracking ID"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setExpanded(false)
              setTrackId('')
            }
          }}
          className="w-full rounded-full border border-border bg-background/80 py-2 pl-8 pr-20 text-xs font-mono text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
        />
        <Search className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
        <button
          type="submit"
          disabled={!trackId.trim() || loading}
          className="absolute right-1 rounded-full bg-brand-green px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:brightness-95 disabled:opacity-40 transition-all flex items-center gap-1"
        >
          {loading ? <Loader2 className="size-3 animate-spin" /> : 'Track'}
        </button>
        <button
          type="button"
          onClick={() => {
            setExpanded(false)
            setTrackId('')
          }}
          aria-label="Close tracking search"
          className="absolute -right-8 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </form>
  ) : (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      aria-label="Search donation tracking ID"
      title="Track a donation"
      className="flex size-9 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground shadow-sm transition-colors hover:border-brand-green hover:text-brand-green"
    >
      <Search className="size-4" aria-hidden="true" />
    </button>
  )
}
