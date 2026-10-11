'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bell,
  BellRing,
  Camera,
  CheckCircle2,
  Clock3,
  Edit3,
  HeartHandshake,
  Image as ImageIcon,
  KeyRound,
  Mail,
  MapPin,
  MessageCircle,
  PackageCheck,
  PauseCircle,
  RefreshCw,
  Send,
  Sparkles,
  Truck,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { formatExpiry } from '@/lib/utils'
import type { DonationFoodItem } from '@/frontend/models/donation/donation.types'

type DonorRequest = {
  id: string
  pickupAddress: string
  region: string
  latitude: number | null
  longitude: number | null
  foodType: string
  quantity: number
  quantityUnit: string
  foodItems: DonationFoodItem[]
  expiresAt: string
  createdAt: string
  donorName?: string | null
  donorContact?: string | null
  donorNotes?: string | null
  pickupOtp?: string | null
  otpVerified?: boolean
  completionPhoto?: string | null
  greetingsSent?: boolean
}

type AssignedRequest = DonorRequest & { status: 'accepted' | 'in_progress' | 'completed' }

export function NgoDashboardView({
  ngoName,
  region,
  initialAvailability,
}: {
  ngoName: string
  region: string
  initialAvailability: 'available' | 'busy'
}) {
  const [requests, setRequests] = useState<DonorRequest[]>([])
  const [assignedRequests, setAssignedRequests] = useState<AssignedRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [acceptedMessage, setAcceptedMessage] = useState('')
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [decliningId, setDecliningId] = useState<string | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const [availability, setAvailability] = useState(initialAvailability)
  const [availabilityPending, setAvailabilityPending] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
  const knownRequestIds = useRef<Set<string> | null>(null)

  // OTP Verification Modal
  const [otpModalRequest, setOtpModalRequest] = useState<AssignedRequest | null>(null)
  const [enteredOtp, setEnteredOtp] = useState('')
  const [otpError, setOtpError] = useState('')

  // Complete Delivery & Greetings Modal
  const [completeModalRequest, setCompleteModalRequest] = useState<AssignedRequest | null>(null)
  const [customGreeting, setCustomGreeting] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState(
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&auto=format&fit=crop&q=80',
  )
  const [customPhoto, setCustomPhoto] = useState('')

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission)
  }, [])

function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime)
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
    osc.start()
    osc.stop(ctx.currentTime + 0.45)
  } catch {
    // Ignore audio autoplay restrictions
  }
}

  const loadRequests = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true)
    try {
      const response = await fetch('/api/ngo-requests', { cache: 'no-store' })
      const result = await response.json()
      if (response.status === 401) {
        window.location.assign('/login')
        return
      }
      if (!response.ok) throw new Error(result.error || 'Could not load donor requests.')

      const nextRequests = result.requests as DonorRequest[]
      if (result.availability === 'available' || result.availability === 'busy') setAvailability(result.availability)
      setAssignedRequests((result.assignedRequests ?? []) as AssignedRequest[])
      const nextIds = new Set(nextRequests.map((request) => request.id))

      // Update browser tab title to alert NGO
      if (nextRequests.length > 0) {
        document.title = `(${nextRequests.length}) New Donor Request - FoodRescue`
      } else {
        document.title = 'NGO Dashboard · FoodRescue'
      }

      if (knownRequestIds.current) {
        const newlyAvailable = nextRequests.filter((request) => !knownRequestIds.current?.has(request.id))
        if (newlyAvailable.length > 0) {
          const newest = newlyAvailable[0]
          const itemsText = newest.foodItems.map((item) => `${item.foodType}, ${item.quantity} ${item.quantityUnit}, use by ${formatExpiry(item.expiresAt)}`).join('; ')
          const message = `New donation request: ${itemsText} at ${newest.pickupAddress}. Expected expiry: ${formatExpiry(newest.expiresAt)}.`
          setNotice(message)
          playNotificationSound()

          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('New FoodRescue Donor Request!', {
                body: `${itemsText} · ${newest.pickupAddress}`,
                icon: '/favicon.ico',
                tag: newest.id,
              })
            } catch {
              // Ignore notification constructor errors
            }
          }
        }
      } else if (nextRequests.length > 0) {
        // First load with existing requests
        const newest = nextRequests[0]
        const itemsText = newest.foodItems.map((item) => `${item.foodType}, ${item.quantity} ${item.quantityUnit}`).join('; ')
        setNotice(`${nextRequests.length} active donor broadcasts waiting: ${itemsText} at ${newest.pickupAddress}.`)
        playNotificationSound()
      }

      knownRequestIds.current = nextIds
      setRequests(nextRequests)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load donor requests.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadRequests()
    const timer = window.setInterval(() => void loadRequests(true), 3_000)
    return () => window.clearInterval(timer)
  }, [loadRequests])

  async function enableNotifications() {
    if (!('Notification' in window)) {
      setPermission('unsupported')
      setNotice('Browser notifications are not supported here. New requests still appear on this page.')
      return
    }
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') setNotice('Browser notifications are enabled for new donor requests.')
    else setNotice('Browser notifications were not enabled. New requests still appear on this page.')
  }

  async function acceptRequest(id: string) {
    setAcceptingId(id)
    setError('')
    setAcceptedMessage('')
    try {
      const response = await fetch(`/api/ngo-requests/${id}/accept`, { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not accept this request.')
      setAcceptedMessage(`Pickup accepted by ${result.acceptedBy}. The donor request is now assigned to your NGO.`)
      setRequests((current) => current.filter((request) => request.id !== id))
      knownRequestIds.current?.delete(id)
      await loadRequests(true)
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : 'Could not accept this request.')
      await loadRequests(true)
    } finally {
      setAcceptingId(null)
    }
  }

  async function declineRequest(id: string) {
    setDecliningId(id)
    setError('')
    try {
      const response = await fetch(`/api/ngo-requests/${id}/decline`, { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not decline this request.')
      setRequests((current) => current.filter((request) => request.id !== id))
      knownRequestIds.current?.delete(id)
      setAcceptedMessage('Request declined. It remains available to other NGOs in the region.')
    } catch (declineError) {
      setError(declineError instanceof Error ? declineError.message : 'Could not decline this request.')
      await loadRequests(true)
    } finally {
      setDecliningId(null)
    }
  }

  async function changeAvailability(nextAvailability: 'available' | 'busy') {
    if (nextAvailability === availability) return
    setAvailabilityPending(true)
    setError('')
    try {
      const response = await fetch('/api/ngo-auth/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: nextAvailability }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not update your availability.')
      setAvailability(nextAvailability)
      setNotice(nextAvailability === 'available' ? 'Your NGO is Active and will receive requests.' : 'Your NGO is Busy and will not receive new requests.')
      await loadRequests(true)
    } catch (availabilityError) {
      setError(availabilityError instanceof Error ? availabilityError.message : 'Could not update your availability.')
    } finally {
      setAvailabilityPending(false)
    }
  }

  async function updatePickupStatus(
    request: AssignedRequest,
    status: 'in_progress' | 'completed',
    options?: { otp?: string; completionPhoto?: string; greetingsSent?: boolean },
  ) {
    setUpdatingStatusId(request.id)
    setError('')
    try {
      const response = await fetch(`/api/ngo-requests/${request.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          otp: options?.otp,
          completionPhoto: options?.completionPhoto,
          greetingsSent: options?.greetingsSent,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not update pickup status.')
      setAssignedRequests((current) =>
        current.map((item) =>
          item.id === request.id
            ? {
                ...item,
                status,
                otpVerified: status === 'in_progress' ? true : item.otpVerified,
                completionPhoto: options?.completionPhoto ?? item.completionPhoto,
                greetingsSent: options?.greetingsSent ?? item.greetingsSent,
              }
            : item,
        ),
      )
      setAcceptedMessage(
        status === 'completed'
          ? `Food rescue completed. Thank-you greeting confirmed for ${request.donorName || 'donor'}.`
          : `OTP verified. ${request.foodType} pickup is now in progress.`,
      )
      return true
    } catch (statusError) {
      const msg = statusError instanceof Error ? statusError.message : 'Could not update pickup status.'
      setError(msg)
      if (options?.otp) setOtpError(msg)
      await loadRequests(true)
      return false
    } finally {
      setUpdatingStatusId(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <section className="overflow-hidden rounded-[2rem] bg-secondary p-6 md:p-9">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-green">NGO notification center</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Available donor requests</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Welcome, {ngoName}. Active broadcasts appear here with pickup location, food quantity, and expected expiry.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={availability === 'available'}
              onClick={() => void changeAvailability('available')}
              disabled={availabilityPending}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-60 ${availability === 'available' ? 'bg-brand-green text-white' : 'border border-border bg-background hover:bg-muted'}`}
            >Active</button>
            <button
              type="button"
              aria-pressed={availability === 'busy'}
              onClick={() => void changeAvailability('busy')}
              disabled={availabilityPending}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-60 ${availability === 'busy' ? 'bg-brand-orange text-black' : 'border border-border bg-background hover:bg-muted'}`}
            ><PauseCircle className="size-4" aria-hidden="true" />Busy</button>
            <button
              type="button"
              onClick={() => void loadRequests(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold transition-colors hover:bg-muted disabled:opacity-60"
            >
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
            <button
              type="button"
              onClick={enableNotifications}
              disabled={permission === 'granted'}
              className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-bold text-background transition-opacity hover:opacity-85 disabled:opacity-60"
            >
              {permission === 'granted' ? <BellRing className="size-4" aria-hidden="true" /> : <Bell className="size-4" aria-hidden="true" />}
              {permission === 'granted' ? 'Notifications on' : 'Enable notifications'}
            </button>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-2"><span className="size-2 animate-pulse rounded-full bg-brand-green" />Live updates every 15 seconds</span>
          <span>{region.trim().toLocaleLowerCase('en') === 'unassigned' ? 'Request scope: All regions' : `Request scope: ${region}`}</span>
          <span>{requests.length} active {requests.length === 1 ? 'request' : 'requests'}</span>
          <span>{assignedRequests.filter((request) => request.status === 'in_progress').length} in progress</span>
          <span>{assignedRequests.filter((request) => request.status === 'completed').length} completed</span>
        </div>
      </section>

      {notice && (
        <div role="status" className="mt-5 flex items-start justify-between gap-4 rounded-2xl border border-brand-green/30 bg-brand-green/5 p-4 text-sm font-semibold">
          <span className="flex items-start gap-2"><BellRing className="mt-0.5 size-4 shrink-0 text-brand-green" aria-hidden="true" />{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="shrink-0 text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
        </div>
      )}
      {error && <p role="alert" className="mt-5 rounded-2xl bg-destructive/10 p-4 text-sm font-medium text-destructive">{error}</p>}
      {acceptedMessage && <p role="status" className="mt-5 rounded-2xl border border-brand-green/30 bg-brand-green/5 p-4 text-sm font-semibold text-brand-green">{acceptedMessage}</p>}

      {loading ? (
        <div className="mt-8 rounded-3xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading available donor requests...</div>
      ) : requests.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted"><PackageCheck className="size-7 text-muted-foreground" aria-hidden="true" /></span>
          <h2 className="mt-4 text-lg font-bold">{availability === 'busy' ? 'Your NGO is marked Busy' : 'No active requests right now'}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {availability === 'busy'
              ? 'New requests are paused. Set your status to Active whenever you are ready to receive requests.'
              : 'We’ll check for new broadcasts automatically. Keep this page open to receive in-app alerts, or enable browser notifications.'}
          </p>
        </section>
      ) : (
        <section aria-label="Available donor requests" className="mt-8 grid gap-4 md:grid-cols-2">
          {requests.map((request) => (
            <article key={request.id} className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green/10 px-3 py-1 text-xs font-bold text-brand-green">
                    <span className="size-1.5 animate-pulse rounded-full bg-brand-green" />Available now
                  </span>
                  <h2 className="mt-3 text-xl font-extrabold tracking-tight">{request.foodItems.length === 1 ? request.foodItems[0].foodType : `${request.foodItems.length} food items`}</h2>
                  <p className="mt-1 text-xs font-semibold text-brand-blue">{request.region}</p>
                </div>
                <span className="rounded-2xl bg-primary/25 px-3 py-2 text-right text-xs font-bold">{request.foodItems.length} {request.foodItems.length === 1 ? 'item' : 'items'}</span>
              </div>

              <dl className="mt-5 flex flex-col gap-3">
                <div className="flex items-start gap-3 rounded-2xl bg-muted/60 p-3.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-brand-green" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Donor pickup location</dt>
                    <dd className="mt-0.5 break-words text-sm font-semibold">{request.pickupAddress}</dd>
                    {request.latitude !== null && request.longitude !== null && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${request.latitude},${request.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs font-bold text-brand-blue underline-offset-4 hover:underline"
                      >
                        Open pickup coordinates in map
                      </a>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-muted/60 p-3.5">
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><UtensilsCrossed className="size-3.5" aria-hidden="true" />Food</dt>
                    <dd className="mt-1 space-y-2 text-sm font-bold">
                      {request.foodItems.map((item, index) => <div key={`${item.foodType}-${index}`}>{item.foodType} <span className="font-medium text-muted-foreground">· {item.quantity} {item.quantityUnit}</span><span className="block text-xs font-medium text-muted-foreground">Use by {formatExpiry(item.expiresAt)}</span></div>)}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-muted/60 p-3.5">
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><Clock3 className="size-3.5" aria-hidden="true" />Expected expiry</dt>
                    <dd className="mt-1 text-sm font-bold">{formatExpiry(request.expiresAt)} <span className="font-medium text-muted-foreground">(soonest)</span></dd>
                  </div>
                </div>
                {(request.donorName || request.donorContact || request.donorNotes) && (
                  <div className="rounded-2xl border border-brand-green/30 bg-brand-green/5 p-3.5 text-xs">
                    <p className="font-bold text-brand-green uppercase tracking-wider text-[10px]">Donor details</p>
                    {request.donorName && <p className="mt-1 font-bold text-foreground text-sm">{request.donorName}</p>}
                    {request.donorContact && <p className="mt-0.5 text-muted-foreground font-medium">Contact: {request.donorContact}</p>}
                    {request.donorNotes && <p className="mt-1 text-muted-foreground italic">&ldquo;{request.donorNotes}&rdquo;</p>}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Broadcast {formatExpiry(request.createdAt)}</p>
              </dl>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => void acceptRequest(request.id)}
                  disabled={acceptingId !== null || decliningId !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FFC107] px-4 py-3.5 text-sm font-extrabold text-black transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <PackageCheck className="size-4" aria-hidden="true" />
                  {acceptingId === request.id ? 'Accepting...' : 'Accept request'}
                </button>
                <button
                  type="button"
                  onClick={() => void declineRequest(request.id)}
                  disabled={acceptingId !== null || decliningId !== null}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3.5 text-sm font-bold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`Decline ${request.foodType} request`}
                >
                  <X className="size-4" aria-hidden="true" />
                  {decliningId === request.id ? 'Declining...' : 'Decline'}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      <section aria-labelledby="assigned-pickups-title" className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-blue">Your work queue</p>
            <h2 id="assigned-pickups-title" className="mt-1 text-2xl font-extrabold tracking-tight">Assigned pickups</h2>
          </div>
          <span className="text-xs font-medium text-muted-foreground">{assignedRequests.length} total</span>
        </div>
        {assignedRequests.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Accepted requests and pickup progress will appear here.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {assignedRequests.map((request) => {
              const isCompleted = request.status === 'completed'
              const isInProgress = request.status === 'in_progress'
              return (
                <article key={request.id} className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${isCompleted ? 'bg-brand-green/10 text-brand-green' : isInProgress ? 'bg-brand-blue/10 text-brand-blue' : 'bg-[#FFC107]/20 text-foreground'}`}>
                        {isCompleted ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : isInProgress ? <Truck className="size-3.5" aria-hidden="true" /> : <PackageCheck className="size-3.5" aria-hidden="true" />}
                        {isCompleted ? 'Completed' : isInProgress ? 'In progress' : 'Accepted'}
                      </span>
                      <h3 className="mt-3 text-xl font-extrabold tracking-tight">{request.foodItems.length === 1 ? request.foodItems[0].foodType : `${request.foodItems.length} food items`}</h3>
                      <p className="mt-1 text-xs font-semibold text-brand-blue">{request.region}</p>
                    </div>
                    <span className="rounded-2xl bg-primary/25 px-3 py-2 text-right text-xs font-bold">{request.foodItems.length} {request.foodItems.length === 1 ? 'item' : 'items'}</span>
                  </div>
                  <p className="mt-4 flex items-start gap-2 rounded-2xl bg-muted/60 p-3.5 text-sm font-semibold">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-brand-green" aria-hidden="true" />{request.pickupAddress}
                  </p>
                  <ul className="mt-3 space-y-1 text-sm" aria-label="Pickup food items">
                    {request.foodItems.map((item, index) => <li key={`${item.foodType}-${index}`}><span className="font-bold">{item.foodType}</span><span className="ml-2 text-muted-foreground">{item.quantity} {item.quantityUnit}</span><span className="block text-xs text-muted-foreground">Use by {formatExpiry(item.expiresAt)}</span></li>)}
                  </ul>
                  {(request.donorName || request.donorContact || request.donorNotes) && (
                    <div className="mt-3 rounded-2xl border border-brand-green/30 bg-brand-green/5 p-3.5 text-xs">
                      <p className="font-bold text-brand-green uppercase tracking-wider text-[10px]">Donor details</p>
                      {request.donorName && <p className="mt-1 font-bold text-foreground text-sm">{request.donorName}</p>}
                      {request.donorContact && <p className="mt-0.5 text-muted-foreground font-medium">Contact: {request.donorContact}</p>}
                      {request.donorNotes && <p className="mt-1 text-muted-foreground italic">&ldquo;{request.donorNotes}&rdquo;</p>}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">Soonest expiry: {formatExpiry(request.expiresAt)}</p>

                  {/* ACTION BUTTONS ACCORDING TO ORDER STAGE */}
                  {request.status === 'accepted' && (
                    <button
                      type="button"
                      onClick={() => {
                        setOtpModalRequest(request)
                        setEnteredOtp('')
                        setOtpError('')
                      }}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-sm transition-all hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/40"
                    >
                      <KeyRound className="size-4" aria-hidden="true" />
                      Verify Donor OTP & Start Pickup
                    </button>
                  )}

                  {isInProgress && (
                    <button
                      type="button"
                      onClick={() => setCompleteModalRequest(request)}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3.5 text-sm font-extrabold text-background shadow-sm transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
                    >
                      <Camera className="size-4" aria-hidden="true" />
                      Complete Delivery & Send Greetings
                    </button>
                  )}

                  {isCompleted && (
                    <div className="mt-4 rounded-2xl border border-brand-green/30 bg-brand-green/5 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-brand-green">
                          <CheckCircle2 className="size-4" />
                          Delivery Completed & Rescued
                        </span>
                        {request.otpVerified && (
                          <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[10px] font-bold text-brand-green">
                            OTP Verified
                          </span>
                        )}
                      </div>

                      {request.completionPhoto && (
                        <div className="mt-2.5 overflow-hidden rounded-xl border border-border">
                          <img
                            src={request.completionPhoto}
                            alt="Distribution Proof"
                            className="h-32 w-full object-cover"
                          />
                        </div>
                      )}

                      <div className="mt-3 flex gap-2">
                        <a
                          href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(
                            (request.donorContact || '').replace(/[^0-9+]/g, '')
                          )}&text=${encodeURIComponent(
                            `🌟 *Food Donation Successfully Rescued & Distributed!* 🍽️\n\nDear ${
                              request.donorName || 'Donor'
                            },\nYour surplus food (${request.foodType}, ${request.quantity} ${
                              request.quantityUnit
                            }) was safely distributed by *${ngoName}* to families in need!\n\nTogether we saved food and fed hungry people. Thank you for your generosity! 💚`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
                        >
                          <MessageCircle className="size-3.5" />
                          Send WhatsApp Greeting
                        </a>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* 1. OTP VERIFICATION MODAL */}
      {otpModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="otp-title"
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
                  <KeyRound className="size-5" />
                </span>
                <div>
                  <h3 id="otp-title" className="text-lg font-extrabold tracking-tight">
                    Verify Donor Pickup OTP
                  </h3>
                  <p className="text-xs text-muted-foreground">Order: {otpModalRequest.foodType}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOtpModalRequest(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-muted/60 p-3.5 text-xs">
              <p className="font-semibold text-foreground">
                📍 {otpModalRequest.pickupAddress}
              </p>
              {otpModalRequest.donorName && (
                <p className="mt-1 text-muted-foreground">
                  Donor: <strong>{otpModalRequest.donorName}</strong>{' '}
                  {otpModalRequest.donorContact && `(${otpModalRequest.donorContact})`}
                </p>
              )}
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!enteredOtp.trim()) {
                  setOtpError('Please enter the 4-digit OTP provided by the donor.')
                  return
                }
                const ok = await updatePickupStatus(otpModalRequest, 'in_progress', { otp: enteredOtp.trim() })
                if (ok) setOtpModalRequest(null)
              }}
              className="mt-5 space-y-4"
            >
              <div>
                <label htmlFor="donor-otp-input" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Enter 4-Digit Pickup OTP
                </label>
                <input
                  id="donor-otp-input"
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 4829"
                  value={enteredOtp}
                  onChange={(e) => {
                    setEnteredOtp(e.target.value)
                    setOtpError('')
                  }}
                  autoFocus
                  className="mt-2 w-full rounded-2xl border-2 border-border bg-background px-4 py-3.5 text-center font-mono text-2xl font-black tracking-widest text-foreground focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {otpError && (
                <p role="alert" className="text-center text-xs font-bold text-destructive">
                  {otpError}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOtpModalRequest(null)}
                  className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatusId !== null}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {updatingStatusId ? 'Verifying...' : 'Verify & Start Pickup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. COMPLETE DELIVERY & SEND GREETINGS MODAL */}
      {completeModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="greetings-title"
            className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-brand-green/15 text-brand-green">
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <h3 id="greetings-title" className="text-lg font-extrabold tracking-tight">
                    Complete Rescue & Send Greetings
                  </h3>
                  <p className="text-xs text-muted-foreground">Order: {completeModalRequest.foodType}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompleteModalRequest(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Distribution Proof Photo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: 'Hot Meals Served',
                      url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&auto=format&fit=crop&q=80',
                    },
                    {
                      label: 'Food Packets Handover',
                      url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&auto=format&fit=crop&q=80',
                    },
                    {
                      label: 'Community Feeding',
                      url: 'https://images.unsplash.com/photo-1578357078586-491adf1aa5ba?w=600&auto=format&fit=crop&q=80',
                    },
                  ].map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => setSelectedPhoto(preset.url)}
                      className={`relative overflow-hidden rounded-xl border-2 transition-all text-left ${
                        selectedPhoto === preset.url
                          ? 'border-brand-green shadow-md ring-2 ring-brand-green/40'
                          : 'border-border opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="h-16 w-full object-cover" />
                      <span className="block p-1 text-[10px] font-bold truncate bg-background/90 text-center">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* EDITABLE GREETING MESSAGE */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="custom-greeting-textarea" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Edit3 className="size-3.5 text-brand-green" />
                    <span>Customize Donor Greeting Message</span>
                  </label>
                  <span className="text-[11px] font-semibold text-brand-green">Editable</span>
                </div>
                <textarea
                  id="custom-greeting-textarea"
                  value={
                    customGreeting !== ''
                      ? customGreeting
                      : `Dear ${completeModalRequest.donorName || 'Generous Donor'}, thank you for supporting hunger relief! Your surplus food donation of ${completeModalRequest.foodType} (${completeModalRequest.quantity} ${completeModalRequest.quantityUnit}) was safely collected from ${completeModalRequest.pickupAddress} and distributed by ${ngoName} to families in need. Together we eliminated food waste and fed the community!`
                  }
                  onChange={(e) => setCustomGreeting(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs leading-relaxed text-foreground shadow-xs focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
                  placeholder="Customize the greeting message sent to the donor..."
                />
              </div>

              {/* ACTION LINKS: WHATSAPP & EMAIL */}
              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(
                    (completeModalRequest.donorContact || '').replace(/[^0-9+]/g, '')
                  )}&text=${encodeURIComponent(
                    `*Thank You For Your Food Donation!* \n\n${
                      customGreeting ||
                      `Dear ${
                        completeModalRequest.donorName || 'Donor'
                      },\nYour surplus food donation (${completeModalRequest.foodType}, ${
                        completeModalRequest.quantity
                      } ${completeModalRequest.quantityUnit}) has been safely collected and distributed by *${ngoName}* to families in need!`
                    }\n\nPhoto Proof: ${selectedPhoto}\n\nTogether we saved food and fed people in need.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-4 py-3 text-xs font-bold text-white shadow-sm hover:brightness-95 transition-all"
                >
                  <MessageCircle className="size-4" />
                  Send via WhatsApp
                </a>

                {completeModalRequest.donorContact?.includes('@') && (
                  <a
                    href={`mailto:${completeModalRequest.donorContact}?subject=${encodeURIComponent(
                      `Food Donation Delivered - Thank You from ${ngoName}`
                    )}&body=${encodeURIComponent(
                      `${
                        customGreeting ||
                        `Dear ${completeModalRequest.donorName || 'Donor'},\n\nYour donation of ${
                          completeModalRequest.foodType
                        } has been safely picked up and distributed by ${ngoName}!`
                      }\n\nView photo: ${selectedPhoto}\n\nThank you for your generosity!`
                    )}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 py-3 text-xs font-bold text-foreground hover:bg-muted transition-colors"
                  >
                    <Mail className="size-4" />
                    Send via Email
                  </a>
                )}
              </div>

              <div className="pt-2 border-t border-border flex gap-2">
                <button
                  type="button"
                  onClick={() => setCompleteModalRequest(null)}
                  className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await updatePickupStatus(completeModalRequest, 'completed', {
                      completionPhoto: selectedPhoto,
                      greetingsSent: true,
                    })
                    if (ok) setCompleteModalRequest(null)
                  }}
                  disabled={updatingStatusId !== null}
                  className="flex-1 rounded-xl bg-brand-green px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:brightness-95 disabled:opacity-50"
                >
                  {updatingStatusId ? 'Completing...' : 'Confirm & Complete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export const NgoDashboard = NgoDashboardView
