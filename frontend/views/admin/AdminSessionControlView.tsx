'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AdminSessionControlView({ username }: { username: string | null }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  if (!username) return null

  async function signOut() {
    setPending(true)
    try {
      await fetch('/api/admin-auth/logout', { method: 'POST' })
      router.push('/admin/login')
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-40 truncate text-sm font-semibold sm:inline" title={username}>{username}</span>
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

export const AdminSessionControl = AdminSessionControlView
