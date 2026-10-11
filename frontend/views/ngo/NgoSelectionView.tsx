'use client'

import { useState } from 'react'
import { HeartHandshake, Radio } from 'lucide-react'
import { BROADCAST_RADIUS_KM, type Ngo } from '@/lib/ngos'
import type { DonationFoodItem } from '@/frontend/models/donation/donation.types'
import { RouteSummaryView } from './RouteSummaryView'
import { NgoOptionCardView } from './NgoOptionCardView'
import { BroadcastView } from './BroadcastView'

type NgoSelectionProps = {
  pickup: string
  region: string
  foodType: string
  quantity: number
  quantityUnit: string
  foodItems: DonationFoodItem[]
  expiresAt: string
  latitude: number | null
  longitude: number | null
  donorName?: string
  donorContact?: string
  donorNotes?: string
  ngos: Ngo[]
}

export function NgoSelectionView({ pickup, region, foodType, quantity, quantityUnit, foodItems, expiresAt, latitude, longitude, donorName, donorContact, donorNotes, ngos }: NgoSelectionProps) {
  // Do not select any NGO by default
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [broadcasting, setBroadcasting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [donationId, setDonationId] = useState('')
  const [broadcastStartedAt, setBroadcastStartedAt] = useState('')
  const [broadcastError, setBroadcastError] = useState('')
  const selected = ngos.find((ngo) => ngo.id === selectedId) ?? null
  const hasDonationDetails = Boolean(
    pickup && region && foodItems.length > 0 && foodItems.every((item) => item.foodType.trim() && item.quantity > 0 && new Date(item.expiresAt).getTime() >= Date.now() + 10 * 60 * 1000) && expiresAt && new Date(expiresAt).getTime() > Date.now(),
  )

  async function handleSend(targetNgoId: string | null) {
    setBroadcastError('')
    if (!hasDonationDetails) {
      setBroadcastError('Please return to the donation form and enter a pickup location, region, food, quantity, and future expiry time.')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupAddress: pickup,
          region,
          latitude,
          longitude,
          foodType,
          quantity,
          quantityUnit,
          foodItems,
          expiresAt,
          selectedNgoId: targetNgoId,
          donorName: donorName || null,
          donorContact: donorContact || null,
          donorNotes: donorNotes || null,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save this donation.')
      setDonationId(result.donation.id)
      setBroadcastStartedAt(result.donation.updatedAt)
      setBroadcasting(true)
    } catch (error) {
      setBroadcastError(error instanceof Error ? error.message : 'Could not save this donation.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-56 pt-6 md:px-6 md:pt-10">
        <RouteSummaryView
          pickup={pickup}
          region={region}
          foodType={foodType}
          quantity={quantity}
          quantityUnit={quantityUnit}
          foodItems={foodItems}
          expiresAt={expiresAt}
          ngoName={selected ? selected.name : 'All 10 KM Surrounding NGOs'}
          ngoAddress={selected ? selected.address : 'Nearby verified network'}
        />

        <section aria-labelledby="ngo-list-title">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h1 id="ngo-list-title" className="text-xl font-extrabold tracking-tight md:text-2xl">
                Select Verified NGO <span className="text-muted-foreground">(Within 10 KM)</span>
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Click an NGO to view ratings, completed pickups, and contact details before assigning.
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              {ngos.length} found
            </span>
          </div>

          {ngos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No verified NGOs found within 10 KM of your pickup coordinates. You can still broadcast to regional volunteers.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {ngos.map((ngo) => (
                <div
                  key={ngo.id}
                  onClick={() => setSelectedId(selectedId === ngo.id ? null : ngo.id)}
                  className="cursor-pointer"
                >
                  <NgoOptionCardView ngo={ngo} selected={selectedId === ngo.id} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-green/10">
                <HeartHandshake className="size-4 text-brand-green" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Donation Mode</p>
                <p className="text-sm font-bold">Free Social Rescue</p>
              </div>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">{'\u20B9'}0</span>
          </div>

          {selected ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => handleSend(selected.id)}
                disabled={saving || !hasDonationDetails}
                className="group flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-green px-5 py-4 text-base font-extrabold text-white transition-all hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-green/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Assigning...' : `Assign to ${selected.name}`}
              </button>
              <button
                type="button"
                onClick={() => handleSend(null)}
                disabled={saving || !hasDonationDetails}
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-border bg-background px-4 py-4 text-sm font-bold text-foreground transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 disabled:opacity-60"
              >
                <Radio className="size-4" aria-hidden="true" />
                Broadcast to All 10 KM
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleSend(null)}
              disabled={saving || !hasDonationDetails}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFC107] px-6 py-4 text-base font-bold text-black transition-all hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFC107]/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Radio className="size-5" aria-hidden="true" />
              {saving ? 'Saving donation...' : 'Broadcast to All Nearby NGOs (10 KM)'}
            </button>
          )}

          {broadcastError && <p role="alert" className="text-center text-sm font-medium text-destructive">{broadcastError}</p>}
          <p className="text-center text-xs text-muted-foreground">
            {selected
              ? `Directly assigning this request to ${selected.name} · Auto-cancels after 60 minutes`
              : `Broadcast notifies all verified NGOs within 10 KM · Auto-cancels after 60 minutes`}
          </p>
        </div>
      </div>

      {broadcasting && (
        <BroadcastView
          donationId={donationId}
          pickup={pickup}
          region={region}
          latitude={latitude}
          longitude={longitude}
          donorName={donorName}
          donorContact={donorContact}
          donorNotes={donorNotes}
          foodType={foodType}
          quantity={quantity}
          quantityUnit={quantityUnit}
          foodItems={foodItems}
          expiresAt={expiresAt}
          broadcastStartedAt={broadcastStartedAt}
          ngos={ngos}
          onClose={() => setBroadcasting(false)}
        />
      )}
    </>
  )
}

export const NgoSelection = NgoSelectionView
