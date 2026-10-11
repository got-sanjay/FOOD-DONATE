'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Leaf, LockKeyhole } from 'lucide-react'

export function AdminLoginFormView() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/admin-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not sign in as an administrator.')
      router.replace('/admin')
      router.refresh()
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Could not sign in as an administrator.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-[2rem] border border-border bg-card p-7 shadow-[0_24px_80px_-30px_rgba(0,0,0,0.3)] md:p-10">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary">
          <Leaf className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-brand-green">Restricted access</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Admin sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Use the administrator credentials configured for this FoodRescue deployment.
        </p>
        <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Username
            <span className="flex items-center gap-3 rounded-xl border border-input bg-muted/40 px-3.5 py-3 focus-within:border-foreground focus-within:bg-background">
              <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
                className="w-full bg-transparent outline-none"
              />
            </span>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Password
            <span className="flex items-center gap-3 rounded-xl border border-input bg-muted/40 px-3.5 py-3 focus-within:border-foreground focus-within:bg-background">
              <LockKeyhole className="size-4 text-muted-foreground" aria-hidden="true" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="w-full bg-transparent outline-none"
              />
            </span>
          </label>
          {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3.5 py-3 text-sm font-medium text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="mt-1 rounded-xl bg-foreground px-5 py-3.5 text-sm font-extrabold text-background transition-opacity hover:opacity-85 disabled:opacity-60"
          >
            {pending ? 'Signing in...' : 'Sign in to admin'}
          </button>
        </form>
      </section>
    </main>
  )
}

export const AdminLoginForm = AdminLoginFormView
