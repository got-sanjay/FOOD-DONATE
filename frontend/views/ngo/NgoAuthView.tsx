'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Building2, Leaf, LocateFixed, LockKeyhole, MapPin } from 'lucide-react'

export function NgoAuthView({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const router = useRouter()
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [region, setRegion] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [detectedAddress, setDetectedAddress] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false)
  const [pending, setPending] = useState(false)
  const [locating, setLocating] = useState(false)

  function useCurrentLocation() {
    setError('')
    if (!navigator.geolocation) {
      setError('Location services are not available in this browser. Enter your region manually.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      void fetch(`/api/location/reverse?lat=${encodeURIComponent(coords.latitude)}&lng=${encodeURIComponent(coords.longitude)}`, { cache: 'no-store' })
        .then(async (response) => {
          const result = await response.json()
          if (!response.ok) throw new Error(result.error || 'Could not look up this location.')
          if (typeof result.region !== 'string' || !result.region) throw new Error('Could not determine your region. Enter it manually.')
          setRegion(result.region)
          setDetectedAddress(typeof result.address === 'string' ? result.address : '')
        })
        .catch((locationError) => setError(locationError instanceof Error ? locationError.message : 'Could not look up this location.'))
        .finally(() => setLocating(false))
    }, (err) => {
      let msg = 'Could not access your location. Check browser permissions or enter your region manually.'
      if (err.code === 1) msg = 'Location permission denied. Please allow location access in your browser.'
      else if (err.code === 2) msg = 'Location position unavailable. Ensure GPS/Wi-Fi is active.'
      else if (err.code === 3) msg = 'Location request timed out. Please try again.'
      setError(msg)
      setLocating(false)
    }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 })
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      const response = await fetch(`/api/ngo-auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          password,
          ...(mode === 'register' ? {
            region,
            phone: phone.trim() || null,
            email: email.trim() || null,
            additionalNotes: additionalNotes.trim() || null,
          } : {}),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not authenticate this NGO account.')
      if (result.pendingReview) {
        setRegistrationSubmitted(true)
        setName('')
        setRegion('')
        setDetectedAddress('')
        setPassword('')
        return
      }
      router.push('/ngo/dashboard')
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not authenticate this NGO account.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_24px_80px_-30px_rgba(0,0,0,0.3)] md:grid-cols-[1fr_1fr]">
        <section className="relative flex min-h-72 flex-col justify-between overflow-hidden bg-secondary p-8 md:p-10">
          <div aria-hidden="true" className="absolute -right-20 -top-20 size-64 rounded-full bg-primary/40 blur-3xl" />
          <Link href="/" className="relative flex w-fit items-center gap-2" aria-label="FoodRescue home">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary"><Leaf className="size-5" /></span>
            <span className="text-lg font-extrabold">FoodRescue</span>
          </Link>
          <div className="relative mt-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-green">Verified NGO portal</p>
            <h1 className="mt-3 max-w-sm text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              Help good food reach the people who need it.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Sign in to your organization account to coordinate local food rescue pickups.
            </p>
          </div>
          <p className="relative mt-10 text-xs text-muted-foreground">FoodRescue · Community food rescue network</p>
        </section>

        <section className="p-7 md:p-10">
          <div className="mb-7 flex rounded-xl bg-muted p-1" role="tablist" aria-label="NGO account access">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => { setMode('login'); setError(''); setRegistrationSubmitted(false) }}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${mode === 'login' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => { setMode('register'); setError(''); setRegistrationSubmitted(false) }}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${mode === 'register' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            >
              New registration
            </button>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight">
            {mode === 'login' ? 'Welcome back' : 'Register your NGO'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === 'login' ? 'Enter your organization name and password.' : 'Create an account with your organization name and a password. An administrator must approve it before sign-in.'}
          </p>

          {registrationSubmitted && (
            <p role="status" className="mt-5 rounded-xl border border-brand-green/30 bg-brand-green/5 px-3.5 py-3 text-sm font-semibold text-brand-green">
              Registration submitted for admin review. You can sign in after an administrator approves your NGO.
            </p>
          )}

          <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm font-semibold">
              NGO name
              <span className="flex items-center gap-3 rounded-xl border border-input bg-muted/40 px-3.5 py-3 focus-within:border-foreground focus-within:bg-background">
                <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="organization"
                  minLength={2}
                  maxLength={100}
                  required
                  placeholder="Your registered NGO name"
                  className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                />
              </span>
            </label>

            {mode === 'register' && (
              <>
                <div>
                  <label className="flex items-center gap-3 rounded-xl border border-input bg-muted/40 px-3.5 py-3 focus-within:border-foreground focus-within:bg-background">
                    <MapPin className="size-4 shrink-0 text-brand-blue" aria-hidden="true" />
                    <span className="sr-only">NGO city or region</span>
                    <input
                      type="text"
                      value={region}
                      onChange={(event) => { setRegion(event.target.value); setDetectedAddress('') }}
                      autoComplete="address-level2"
                      minLength={2}
                      maxLength={100}
                      required
                      placeholder="NGO city or region"
                      className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      disabled={locating}
                      aria-label="Use my current location to set NGO region"
                      title="Detect region from current location"
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-brand-green transition-colors hover:bg-muted disabled:opacity-60"
                    >
                      <LocateFixed className={`size-4 ${locating ? 'animate-pulse' : ''}`} aria-hidden="true" />
                    </button>
                  </label>
                  {detectedAddress && <p className="mt-1.5 truncate text-xs text-muted-foreground" title={detectedAddress}>{detectedAddress}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5 text-xs font-semibold">
                    Contact Mobile
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+91 98765 43210"
                      maxLength={30}
                      className="rounded-xl border border-input bg-muted/40 px-3.5 py-2.5 text-sm outline-none focus:border-foreground focus:bg-background"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold">
                    Contact Email
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="help@ngo.org"
                      maxLength={80}
                      className="rounded-xl border border-input bg-muted/40 px-3.5 py-2.5 text-sm outline-none focus:border-foreground focus:bg-background"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1.5 text-xs font-semibold">
                  Additional Details / Facilities
                  <textarea
                    value={additionalNotes}
                    onChange={(event) => setAdditionalNotes(event.target.value)}
                    placeholder="e.g. 2 refrigerated vans, community kitchen capacity, 24/7 pickup service"
                    rows={2}
                    maxLength={250}
                    className="resize-none rounded-xl border border-input bg-muted/40 px-3.5 py-2.5 text-sm outline-none focus:border-foreground focus:bg-background"
                  />
                </label>
              </>
            )}

            <label className="flex flex-col gap-2 text-sm font-semibold">
              Password
              <span className="flex items-center gap-3 rounded-xl border border-input bg-muted/40 px-3.5 py-3 focus-within:border-foreground focus-within:bg-background">
                <LockKeyhole className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={mode === 'register' ? 8 : undefined}
                  maxLength={128}
                  required
                  placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
                  className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                />
              </span>
            </label>

            {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3.5 py-3 text-sm font-medium text-destructive">{error}</p>}

            {mode === 'register' && !registrationSubmitted && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Your account will remain under review and won’t receive donor requests until approved.
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFC107] px-5 py-3.5 text-sm font-extrabold text-black transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Please wait...' : mode === 'login' ? 'Sign in as NGO' : 'Create NGO account'}
              {!pending && <ArrowRight className="size-4" aria-hidden="true" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Donating food? <Link href="/" className="font-bold text-foreground underline-offset-4 hover:underline">Return to donor page</Link>
          </p>
        </section>
      </div>
    </main>
  )
}

export const NgoAuthForm = NgoAuthView
