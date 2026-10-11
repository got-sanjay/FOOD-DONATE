'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FastForward,
  MapPin,
  RotateCcw,
  Timer,
  X,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatExpiry } from '@/lib/utils'
import { BROADCAST_RADIUS_KM, type Ngo } from '@/lib/ngos'
import { BROADCAST_WINDOW_MS } from '@/lib/donation'
import type { DonationFoodItem } from '@/frontend/models/donation/donation.types'
import type { BroadcastPhase } from './BroadcastMapView'

const BroadcastMap = dynamic(() => import('./BroadcastMapView'), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-muted text-sm text-muted-foreground">
      Loading live map...
    </div>
  ),
})

function broadcastDeadline(broadcastStartedAt: string) {
  return new Date(broadcastStartedAt).getTime() + BROADCAST_WINDOW_MS
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

type BroadcastViewProps = {
  donationId: string
  pickup: string
  region: string
  foodType: string
  quantity: number
  quantityUnit: string
  foodItems: DonationFoodItem[]
  expiresAt: string
  broadcastStartedAt: string
  ngos: Ngo[]
  onClose: () => void
}

export function BroadcastView({ donationId, pickup, region, foodType, quantity, quantityUnit, foodItems, expiresAt, broadcastStartedAt: initialBroadcastStartedAt, ngos, onClose }: BroadcastViewProps) {
  const [phase, setPhase] = useState<BroadcastPhase>('broadcasting')
  const [deadline, setDeadline] = useState(() => broadcastDeadline(initialBroadcastStartedAt))
  const [now, setNow] = useState(() => Date.now())
  const [acceptedId, setAcceptedId] = useState<string | null>(null)
  const [acceptedNgoName, setAcceptedNgoName] = useState<string | null>(null)
  const [persistenceError, setPersistenceError] = useState('')

  const saveStatus = useCallback(async (status: string, selectedNgoId?: string) => {
    try {
      const response = await fetch(`/api/donations/${donationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, selectedNgoId }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not update the donation status.')
      setPersistenceError('')
      return typeof result.donation?.updatedAt === 'string' ? result.donation.updatedAt : new Date().toISOString()
    } catch (error) {
      setPersistenceError(error instanceof Error ? error.message : 'Could not update the donation status.')
      return null
    }
  }, [donationId])

  useEffect(() => {
    if (phase !== 'broadcasting') return
    const id = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= deadline) {
        setPhase('expired')
        void saveStatus('expired')
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [phase, deadline, saveStatus])

  useEffect(() => {
    let active = true
    const syncStatus = async () => {
      try {
        const response = await fetch(`/api/donations/${donationId}/status`, { cache: 'no-store' })
        if (!response.ok) return
        const result = (await response.json()) as { status?: string; selectedNgoName?: string | null }
        if (!active) return
        if (result.status === 'accepted' || result.status === 'in_progress' || result.status === 'completed') {
          const matchedNgo = ngos.find((ngo) => ngo.name === result.selectedNgoName)
          const fallbackNgo = ngos.find((ngo) => ngo.status === 'available') ?? ngos[0]
          const assignedNgo = matchedNgo ?? fallbackNgo
          if (assignedNgo) setAcceptedId(assignedNgo.id)
          setAcceptedNgoName(result.selectedNgoName ?? assignedNgo?.name ?? 'Verified NGO')
          setPhase(result.status as BroadcastPhase)
        } else if (result.status === 'expired' || result.status === 'cancelled') {
          setPhase('expired')
        }
      } catch {
        // Retry next interval
      }
    }

    void syncStatus()
    const timer = window.setInterval(() => void syncStatus(), 1000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [donationId, ngos, phase])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const remaining = Math.max(0, deadline - now)
  const accepted = ngos.find((ngo) => ngo.id === acceptedId) ?? null
  const firstResponder = ngos.find((ngo) => ngo.status === 'available') ?? ngos[0]

  async function acceptBy(id: string) {
    if (!(await saveStatus('accepted', id))) return
    setAcceptedId(id)
    setAcceptedNgoName(ngos.find((ngo) => ngo.id === id)?.name ?? null)
    setPhase('accepted')
  }

  async function retryBroadcast() {
    const startedAt = await saveStatus('broadcasting')
    if (!startedAt) return
    const startedAtMs = new Date(startedAt).getTime()
    setNow(startedAtMs)
    setDeadline(broadcastDeadline(startedAt))
    setAcceptedId(null)
    setAcceptedNgoName(null)
    setPhase('broadcasting')
  }

  async function cancelBroadcast() {
    if (await saveStatus('cancelled')) onClose()
  }

  async function closeBroadcast() {
    if (phase === 'broadcasting') await cancelBroadcast()
    else onClose()
  }

  function fastForwardToExpiry() {
    setDeadline(Date.now() + 5000)
  }

  const statusMessage =
    phase === 'broadcasting'
      ? `Broadcasting to ${ngos.length} NGOs within ${BROADCAST_RADIUS_KM} KM. Waiting for acceptance.`
      : (phase === 'accepted' || phase === 'in_progress' || phase === 'completed') && accepted
        ? `${phase === 'completed' ? 'Pickup completed' : phase === 'in_progress' ? 'Pickup in progress' : 'Accepted'} by ${acceptedNgoName ?? accepted.name}.`
        : 'Request auto-cancelled after the 60-minute pickup window.'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="broadcast-title"
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 md:h-16 md:px-6">
        <button
          type="button"
          onClick={closeBroadcast}
          className="flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>Back</span>
        </button>
        <p id="broadcast-title" className="text-sm font-bold md:text-base">
          Live NGO Broadcast
        </p>
        <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-bold">
          <span
            aria-hidden="true"
            className={cn(
              'size-2 rounded-full',
              phase === 'broadcasting' && 'animate-pulse bg-brand-green',
              (phase === 'accepted' || phase === 'in_progress' || phase === 'completed') && 'bg-brand-blue',
              phase === 'expired' && 'bg-destructive',
            )}
          />
          {phase === 'broadcasting' ? 'Live' : phase === 'accepted' ? 'Matched' : phase === 'in_progress' ? 'Pickup in progress' : phase === 'completed' ? 'Completed' : 'Ended'}
        </span>
      </header>

      <div className="relative flex-1">
        <div className="absolute inset-0 isolate">
          <BroadcastMap phase={phase} acceptedId={acceptedId} ngos={ngos} />
        </div>

        <section
          aria-label="Request status"
          className="absolute inset-x-0 bottom-0 z-10 max-h-[70%] overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.25)] md:inset-x-auto md:bottom-auto md:left-6 md:top-6 md:max-h-[calc(100%-3rem)] md:w-[420px] md:rounded-3xl md:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)]"
        >
          <p role="status" aria-live="polite" className="sr-only">
            {statusMessage}
          </p>

          <div className="mb-4 flex items-start gap-3 rounded-2xl bg-muted/60 p-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-green/15">
              <MapPin className="size-4 text-brand-green" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">Pickup Location</p>
              <p className="truncate text-sm font-semibold">{pickup}</p>
              <p className="truncate text-xs font-semibold text-brand-blue">{region}</p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground" aria-label="Food items and quantities">
                {(foodItems.length ? foodItems : [{ foodType, quantity, quantityUnit, expiresAt }]).map((item, index) => (
                  <li key={`${item.foodType}-${index}`} className="truncate">{item.foodType} · {item.quantity} {item.quantityUnit} · Use by {formatExpiry(item.expiresAt)}</li>
                ))}
              </ul>
              <p className="mt-0.5 text-xs text-muted-foreground">Soonest expiry: {formatExpiry(expiresAt)}</p>
            </div>
          </div>

          {persistenceError && <p role="alert" className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">{persistenceError}</p>}

          {(phase === 'accepted' || phase === 'in_progress' || phase === 'completed') && accepted ? (
            <AcceptedPanel
              name={acceptedNgoName ?? accepted.name}
              address={accepted.address}
              distanceKm={accepted.distanceKm}
              pickupMins={accepted.pickupMins}
              status={phase}
              onDone={onClose}
            />
          ) : (
            <BroadcastingPanel
              countdown={formatCountdown(remaining)}
              ngos={ngos}
              onCancel={cancelBroadcast}
              onSimulateAccept={() => acceptBy(firstResponder.id)}
              onFastForward={fastForwardToExpiry}
              disabled={phase === 'expired'}
            />
          )}
        </section>

        {phase === 'expired' && <ExpiredModal onRetry={retryBroadcast} onClose={onClose} />}
      </div>
    </div>
  )
}

type BroadcastingPanelProps = {
  countdown: string
  ngos: Ngo[]
  onCancel: () => void | Promise<void>
  onSimulateAccept: () => void | Promise<void>
  onFastForward: () => void
  disabled: boolean
}

function BroadcastingPanel({ countdown, ngos, onCancel, onSimulateAccept, onFastForward, disabled }: BroadcastingPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Auto-cancels in:</p>
          <p className="font-mono text-3xl font-extrabold tabular-nums tracking-tight" aria-label={`Auto-cancels in ${countdown}`}>
            {countdown}
          </p>
        </div>
        <span className="flex size-12 items-center justify-center rounded-2xl bg-[#FFC107]/20">
          <Timer className="size-6 text-foreground" aria-hidden="true" />
        </span>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-[#FFC107]/60 bg-[#FFC107]/10 p-3">
        <Zap className="mt-0.5 size-4 shrink-0 fill-[#FFC107] text-amber-600" aria-hidden="true" />
        <p className="text-sm font-semibold leading-snug">
          Broadcasting to {ngos.length} NGOs within {BROADCAST_RADIUS_KM} KM...{' '}
          <span className="font-medium text-muted-foreground">Waiting for acceptance</span>
        </p>
      </div>

      <ul className="flex flex-col gap-2" aria-label="Notified NGOs">
        {ngos.map((ngo) => (
          <li key={ngo.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className={cn('size-2.5 shrink-0 rounded-full', ngo.status === 'available' ? 'bg-brand-blue' : 'bg-brand-orange')}
              />
              <span className="truncate font-medium">{ngo.name}</span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {ngo.distanceKm} KM {'\u00B7'} Notified
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onCancel}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-background px-6 py-3.5 text-sm font-bold transition-colors hover:border-foreground/30 hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
      >
        <X className="size-4" aria-hidden="true" />
        Cancel Request
      </button>

      <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-border pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Demo</span>
        <button
          type="button"
          onClick={onSimulateAccept}
          disabled={disabled}
          className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-secondary disabled:opacity-50"
        >
          <CheckCircle2 className="size-3.5 text-brand-blue" aria-hidden="true" />
          Simulate acceptance
        </button>
        <button
          type="button"
          onClick={onFastForward}
          disabled={disabled}
          className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-secondary disabled:opacity-50"
        >
          <FastForward className="size-3.5 text-brand-orange" aria-hidden="true" />
          Skip to expiry
        </button>
      </div>
    </div>
  )
}

type AcceptedPanelProps = {
  name: string
  address: string
  distanceKm: number
  pickupMins: number
  status: 'accepted' | 'in_progress' | 'completed'
  onDone: () => void
}

function AcceptedPanel({ name, address, distanceKm, pickupMins, status, onDone }: AcceptedPanelProps) {
  const statusLabel = status === 'completed' ? 'Pickup completed' : status === 'in_progress' ? 'Pickup in progress' : 'Accepted'
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-2xl border-2 border-brand-blue bg-brand-blue/[0.04] p-4">
        <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-brand-blue" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-base font-extrabold leading-snug">
            Accepted by {name} - {pickupMins} mins away
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <BadgeCheck className="size-3.5 text-brand-blue" aria-hidden="true" />
            Verified NGO {'\u00B7'} {statusLabel}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-muted/60 p-3">
          <dt className="text-[11px] font-medium text-muted-foreground">Status</dt>
          <dd className="text-lg font-bold">{statusLabel}</dd>
        </div>
        <div className="rounded-2xl bg-muted/60 p-3">
          <dt className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Clock className="size-3" aria-hidden="true" />
            {status === 'completed' ? 'Pickup location' : 'Pickup ETA'}
          </dt>
          <dd className="text-lg font-bold">{status === 'completed' ? address : `${pickupMins} mins`}</dd>
        </div>
      </dl>

      <p className="text-xs text-muted-foreground">
        Keep the food packed and ready for the NGO pickup team following the highlighted route.
      </p>

      <button
        type="button"
        onClick={onDone}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFC107] px-6 py-4 text-base font-bold text-black transition-all hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFC107]/40"
      >
        Done
      </button>
    </div>
  )
}

function ExpiredModal({ onRetry, onClose }: { onRetry: () => void; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="expired-title"
        aria-describedby="expired-desc"
        className="w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-2xl"
      >
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <Timer className="size-7 text-destructive" aria-hidden="true" />
        </span>
        <h2 id="expired-title" className="text-xl font-extrabold tracking-tight">
          Order Expired / Auto-Cancelled
        </h2>
        <p id="expired-desc" className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The 60-minute pickup window ended and the request was auto-cancelled.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onRetry}
            autoFocus
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFC107] px-6 py-3.5 text-base font-bold text-black transition-all hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFC107]/40"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Retry Broadcast
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl px-6 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Back to NGO list
          </button>
        </div>
      </div>
    </div>
  )
}
