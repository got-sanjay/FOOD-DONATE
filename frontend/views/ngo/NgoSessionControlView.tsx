'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function NgoSessionControlView({
  ngoName,
  showDonorRequests = true,
}: {
  ngoName: string | null
  showDonorRequests?: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  if (!ngoName) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/admin/login" className="hidden rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground sm:inline">Admin</Link>
        <Link
          href="/login"
          className="rounded-full bg-foreground px-6 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/50"
        >
          NGO Login
        </Link>
      </div>
    )
  }

  async function signOut() {
    setPending(true)
    try {
      await fetch('/api/ngo-auth/logout', { method: 'POST' })
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/ngo/dashboard"
        className="hidden max-w-40 truncate text-sm font-semibold transition-colors hover:text-primary sm:inline"
        title={`Go to ${ngoName} dashboard`}
      >
        {ngoName}
      </Link>
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-85 disabled:opacity-60"
      >
        {pending ? 'Signing out...' : 'Sign out'}
      </button>
    </div>
  )
}

export const NgoSessionControl = NgoSessionControlView
