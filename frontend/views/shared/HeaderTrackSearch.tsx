'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'

export function HeaderTrackSearch() {
  const [trackId, setTrackId] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = trackId.trim()
    if (!trimmed) return

    setLoading(true)
    router.push(`/track/${encodeURIComponent(trimmed)}`)
  }

  return (
    <form onSubmit={handleSearch} className="relative flex items-center">
      <div className="relative flex items-center w-48 sm:w-64 md:w-72">
        <input
          type="text"
          value={trackId}
          onChange={(e) => setTrackId(e.target.value)}
          placeholder="Input Track ID..."
          className="w-full rounded-full border border-border bg-background/80 pl-8 pr-16 py-1.5 text-xs text-foreground placeholder:text-muted-foreground shadow-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30 transition-all font-mono"
        />
        <Search className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
        <button
          type="submit"
          disabled={!trackId.trim() || loading}
          className="absolute right-1 rounded-full bg-brand-green px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:brightness-95 disabled:opacity-40 transition-all flex items-center gap-1"
        >
          {loading ? <Loader2 className="size-3 animate-spin" /> : 'Track'}
        </button>
      </div>
    </form>
  )
}
