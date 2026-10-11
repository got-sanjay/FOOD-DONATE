'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FastForward,
  KeyRound,
  MapPin,
  RotateCcw,
  Share2,
  Sparkles,
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
  latitude?: number | null
  longitude?: number | null
  donorName?: string | null
  donorContact?: string | null
  donorNotes?: string | null
  foodType: string
  quantity: number
  quantityUnit: string
  foodItems: DonationFoodItem[]
  expiresAt: string
  broadcastStartedAt: string
  ngos: Ngo[]
  onClose: () => void
}

export function BroadcastView({
  donationId,
  pickup,
  region,
  latitude,
  longitude,
  donorName,
  donorContact,
  donorNotes,
  foodType,
  quantity,
  quantityUnit,
  foodItems,
  expiresAt,
  broadcastStartedAt: initialBroadcastStartedAt,
  ngos,
  onClose,
}: BroadcastViewProps) {
  const [phase, setPhase] = useState<BroadcastPhase>('broadcasting')
  const [deadline, setDeadline] = useState(() => broadcastDeadline(initialBroadcastStartedAt))
  const [now, setNow] = useState(() => Date.now())
  const [acceptedId, setAcceptedId] = useState<string | null>(null)
  const [acceptedNgoName, setAcceptedNgoName] = useState<string | null>(null)
  const [pickupOtp, setPickupOtp] = useState<string | null>(null)
  const [otpVerified, setOtpVerified] = useState<boolean>(false)
  const [completionPhoto, setCompletionPhoto] = useState<string | null>(null)
  const [greetingsSent, setGreetingsSent] = useState<boolean>(false)
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
        const result = (await response.json()) as {
          status?: string
          selectedNgoName?: string | null
          pickupOtp?: string | null
          otpVerified?: boolean
          completionPhoto?: string | null
          greetingsSent?: boolean
        }
        if (!active) return
        if (typeof result.pickupOtp === 'string') setPickupOtp(result.pickupOtp)
        if (typeof result.otpVerified === 'boolean') setOtpVerified(result.otpVerified)
        if (typeof result.completionPhoto === 'string') setCompletionPhoto(result.completionPhoto)
        if (typeof result.greetingsSent === 'boolean') setGreetingsSent(result.greetingsSent)

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

  const [copiedTrackId, setCopiedTrackId] = useState(false)
  const handleCopyTrackId = () => {
    if (donationId) {
      void navigator.clipboard.writeText(donationId)
      setCopiedTrackId(true)
      setTimeout(() => setCopiedTrackId(false), 2000)
    }
  }

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

        <div className="flex items-center gap-2.5">
          <p id="broadcast-title" className="text-sm font-bold md:text-base">
            Live NGO Broadcast
          </p>
          {donationId && (
            <button
              type="button"
              onClick={handleCopyTrackId}
              title="Click to copy Track ID"
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2 py-1 text-xs font-mono font-bold text-foreground hover:bg-muted transition-colors"
            >
              <span className="text-muted-foreground font-sans font-medium text-[11px]">Track ID:</span>
              <span>{donationId.slice(0, 10)}...</span>
              {copiedTrackId ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3 text-muted-foreground" />}
            </button>
          )}
        </div>

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
          <BroadcastMap
            phase={phase}
            acceptedId={acceptedId}
            ngos={ngos}
            pickupAddress={pickup}
            donorName={donorName}
            donorContact={donorContact}
            donorNotes={donorNotes}
            donorLat={latitude}
            donorLng={longitude}
            onSelectNgo={acceptBy}
          />
        </div>

        <section
          aria-label="Request status"
          className="absolute inset-x-0 bottom-0 z-10 max-h-[70%] overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.25)] md:inset-x-auto md:bottom-auto md:left-6 md:top-6 md:max-h-[calc(100%-3rem)] md:w-[420px] md:rounded-3xl md:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)]"
        >
          <p role="status" aria-live="polite" className="sr-only">
            {statusMessage}
          </p>

          {/* TRACK ID BADGE FOR DONOR */}
          {donationId && (
            <div className="mb-3 flex items-center justify-between rounded-xl border border-border/80 bg-muted/40 px-3 py-2 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Track ID:</span>
                <span className="font-mono font-bold text-foreground truncate">{donationId}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyTrackId}
                className="flex items-center gap-1 shrink-0 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-bold text-foreground hover:bg-muted transition-colors"
              >
                {copiedTrackId ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                <span>{copiedTrackId ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

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
              pickupOtp={pickupOtp}
              otpVerified={otpVerified}
              completionPhoto={completionPhoto}
              donorName={donorName}
              pickupAddress={pickup}
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
  pickupOtp?: string | null
  otpVerified?: boolean
  completionPhoto?: string | null
  donorName?: string | null
  pickupAddress?: string
  onDone: () => void
}

function AcceptedPanel({
  name,
  address,
  distanceKm,
  pickupMins,
  status,
  pickupOtp,
  otpVerified,
  completionPhoto,
  donorName,
  pickupAddress,
  onDone,
}: AcceptedPanelProps) {
  const [copiedOtp, setCopiedOtp] = useState(false)
  const statusLabel = status === 'completed' ? 'Pickup completed' : status === 'in_progress' ? 'Pickup in progress' : 'Accepted'
  const isCompleted = status === 'completed'

  const handleCopyOtp = () => {
    if (pickupOtp) {
      void navigator.clipboard.writeText(pickupOtp)
      setCopiedOtp(true)
      setTimeout(() => setCopiedOtp(false), 2500)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-2xl border-2 border-brand-blue bg-brand-blue/[0.04] p-4">
        <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-brand-blue" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-base font-extrabold leading-snug">
            {isCompleted ? `Rescued by ${name}` : `Accepted by ${name} - ${pickupMins} mins away`}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <BadgeCheck className="size-3.5 text-brand-blue" aria-hidden="true" />
            Verified NGO {'\u00B7'} {statusLabel}
          </p>
        </div>
      </div>

      {/* SECURE PICKUP VERIFICATION OTP (FOR DONOR) */}
      {!isCompleted && pickupOtp && (
        <div className="rounded-2xl border-2 border-emerald-500/80 bg-emerald-500/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              <KeyRound className="size-4 text-emerald-600" aria-hidden="true" />
              Pickup Handover OTP
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              {otpVerified ? '✓ Verified' : 'Share on arrival'}
            </span>
          </div>

          <div className="my-2.5 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-background/95 px-4 py-3 shadow-inner">
            <span className="font-mono text-3xl font-black tracking-widest text-emerald-600 dark:text-emerald-400">
              {pickupOtp}
            </span>
            <button
              type="button"
              onClick={handleCopyOtp}
              className="flex items-center gap-1 rounded-lg border border-border bg-muted/60 px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition-colors"
            >
              {copiedOtp ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              <span>{copiedOtp ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Please share this <strong>4-digit OTP</strong> with the <strong>{name}</strong> pickup team when they arrive to verify collection.
          </p>
        </div>
      )}

      {/* COMPLETED GREETINGS & DISTRIBUTION PHOTO PROOF */}
      {isCompleted && (
        <div className="rounded-2xl border-2 border-brand-green/80 bg-brand-green/10 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-amber-500" aria-hidden="true" />
            <p className="text-base font-extrabold text-foreground">
              Food Rescued & Distributed!
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Dear {donorName || 'Generous Donor'}, thank you! <strong>{name}</strong> has safely delivered your surplus food to families in need.
          </p>

          {completionPhoto ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-border shadow-sm">
              <img src={completionPhoto} alt="Distribution proof" className="h-44 w-full object-cover" />
              <div className="bg-background/95 px-3 py-1.5 text-center text-[11px] font-semibold text-brand-green flex items-center justify-center gap-1.5">
                <BadgeCheck className="size-3.5 text-brand-green" />
                <span>Verified Distribution Photo Proof</span>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-brand-green/40 bg-brand-green/5 p-3 text-center text-xs text-brand-green font-medium flex items-center justify-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-brand-green" />
              <span>Food delivery verified! Greetings sent to donor with distribution confirmation.</span>
            </div>
          )}

          <div className="mt-3.5 flex gap-2">
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                `Our surplus food donation was safely collected and distributed by ${name}! Together we saved food and fed people in need with FoodRescue.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-3 text-xs font-bold text-white shadow-sm hover:brightness-95 transition-all"
            >
              <Share2 className="size-3.5" aria-hidden="true" />
              Share WhatsApp Greeting
            </a>
          </div>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-muted/60 p-3">
          <dt className="text-[11px] font-medium text-muted-foreground">Status</dt>
          <dd className="text-lg font-bold">{statusLabel}</dd>
        </div>
        <div className="rounded-2xl bg-muted/60 p-3">
          <dt className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Clock className="size-3" aria-hidden="true" />
            {isCompleted ? 'Pickup location' : 'Pickup ETA'}
          </dt>
          <dd className="text-lg font-bold">{isCompleted ? address : `${pickupMins} mins`}</dd>
        </div>
      </dl>

      <p className="text-xs text-muted-foreground">
        {isCompleted
          ? 'Thank you for reducing food waste and supporting local hunger relief.'
          : 'Keep the food packed and ready for the NGO pickup team following the highlighted route.'}
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
