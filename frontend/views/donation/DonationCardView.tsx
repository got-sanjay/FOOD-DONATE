'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, FileText, LocateFixed, Loader2, Mail, MapPin, Phone, Plus, ShieldCheck, Trash2, User, UtensilsCrossed } from 'lucide-react'

type Coordinates = { lat: number; lng: number } | null
const MINIMUM_EXPIRY_BUFFER_MS = 10 * 60 * 1000
const MAX_FOOD_ITEMS = 8

type FoodItemInput = { foodType: string; quantity: string; quantityUnit: string; expiresAt: string }

function formatLocalDateTime(date: Date) {
  const roundedDate = new Date(Math.ceil(date.getTime() / 60_000) * 60_000)
  const localDate = new Date(roundedDate.getTime() - roundedDate.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

export function DonationCardView() {
  const router = useRouter()
  const [location, setLocation] = useState('')
  const [region, setRegion] = useState('')
  const [coordinates, setCoordinates] = useState<Coordinates>(null)
  const [foodItems, setFoodItems] = useState<FoodItemInput[]>([{ foodType: '', quantity: '', quantityUnit: 'kg', expiresAt: '' }])
  const [donorName, setDonorName] = useState('')
  const [donorContact, setDonorContact] = useState('')
  const [donorNotes, setDonorNotes] = useState('')
  const [now, setNow] = useState<number | null>(null)
  const [locating, setLocating] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [formError, setFormError] = useState('')

  const geocodeTimer = useRef<NodeJS.Timeout | null>(null)
  const isAutoDetecting = useRef(false)

  // Initialize local timestamp on mount
  useEffect(() => {
    setNow(Date.now())
  }, [])

  function useCurrentLocation(silent = false) {
    if (!silent) setLocationError('')
    if (!navigator.geolocation) {
      if (!silent) setLocationError('Location services are not available in this browser. Enter an address instead.')
      return
    }

    setLocating(true)
    isAutoDetecting.current = true
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point = { lat: coords.latitude, lng: coords.longitude }
        setCoordinates(point)
        setLocation(`Current location (${point.lat.toFixed(5)}, ${point.lng.toFixed(5)})`)
        void fetch(`/api/location/reverse?lat=${encodeURIComponent(point.lat)}&lng=${encodeURIComponent(point.lng)}`, { cache: 'no-store' })
          .then(async (response) => {
            const result = await response.json()
            if (!response.ok) throw new Error(result.error || 'Could not find the region for this location.')
            if (typeof result.address === 'string' && result.address) setLocation(result.address)
            if (typeof result.region === 'string' && result.region) setRegion(result.region)
          })
          .catch(() => {
            if (!silent) setLocationError('Location found, but its address could not be looked up. Enter manually.')
          })
          .finally(() => {
            setLocating(false)
            isAutoDetecting.current = false
          })
      },
      (err) => {
        setLocating(false)
        isAutoDetecting.current = false
        if (!silent) {
          let msg = 'Could not access your location. Check browser permissions or enter an address.'
          if (err.code === 1) msg = 'Location permission denied. Please allow location access in your browser.'
          else if (err.code === 2) msg = 'Location position unavailable. Please ensure GPS/Wi-Fi is active.'
          else if (err.code === 3) msg = 'Location request timed out. Please try again.'
          setLocationError(msg)
        }
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    )
  }

  // Automatic geocoding (lat/long resolution) when user manually types address or region
  function triggerAutoGeocode(newAddress: string, newRegion: string) {
    if (isAutoDetecting.current) return
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current)

    const query = [newAddress.trim(), newRegion.trim()].filter(Boolean).join(', ')
    if (query.length < 3) return

    geocodeTimer.current = setTimeout(async () => {
      setGeocoding(true)
      try {
        const res = await fetch(`/api/location/geocode?q=${encodeURIComponent(query)}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data.found && typeof data.lat === 'number' && typeof data.lng === 'number') {
            setCoordinates({ lat: data.lat, lng: data.lng })
            if (data.region && !newRegion.trim()) {
              setRegion(data.region)
            }
          }
        }
      } catch {
        // Silently continue; coordinates can still be picked or verified
      } finally {
        setGeocoding(false)
      }
    }, 700)
  }

  function handleAddressChange(value: string) {
    setLocation(value)
    setLocationError('')
    triggerAutoGeocode(value, region)
  }

  function handleRegionChange(value: string) {
    setRegion(value)
    triggerAutoGeocode(location, value)
  }

  function submitDonation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    const expiryTimestamps = foodItems.map((item) => item.expiresAt ? new Date(item.expiresAt).getTime() : Number.NaN)
    if (expiryTimestamps.some((timestamp) => !Number.isFinite(timestamp) || timestamp < Date.now() + MINIMUM_EXPIRY_BUFFER_MS)) {
      setFormError('Enter an expiry date and time at least 10 minutes from now for every food item.')
      return
    }

    const params = new URLSearchParams({
      pickup: location.trim(),
      region: region.trim(),
      foodType: foodItems[0].foodType.trim(),
      quantity: foodItems[0].quantity,
      quantityUnit: foodItems[0].quantityUnit,
      foodItems: JSON.stringify(foodItems.map((item) => ({
        ...item,
        foodType: item.foodType.trim(),
        quantity: Number(item.quantity),
        expiresAt: new Date(item.expiresAt).toISOString(),
      }))),
      expiresAt: new Date(Math.min(...expiryTimestamps)).toISOString(),
    })
    if (donorName.trim()) params.set('donorName', donorName.trim())
    if (donorContact.trim()) params.set('donorContact', donorContact.trim())
    if (donorNotes.trim()) params.set('donorNotes', donorNotes.trim())
    if (coordinates) {
      params.set('lat', String(coordinates.lat))
      params.set('lng', String(coordinates.lng))
    }
    router.push(`/select-ngo?${params.toString()}`)
  }

  return (
    <form
      id="donate"
      onSubmit={submitDonation}
      className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.18)] md:p-7"
    >
      <h2 className="text-lg font-bold">Schedule a food pickup</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Add pickup details and food safety timing before choosing where to broadcast.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-input bg-muted/60 px-4 py-3.5 transition-colors focus-within:border-foreground focus-within:bg-background">
            <MapPin className="size-4 shrink-0 text-brand-green" aria-hidden="true" />
            <span className="sr-only">Pickup location or address</span>
            <input
              type="text"
              value={location}
              onChange={(event) => handleAddressChange(event.target.value)}
              placeholder="Pickup address or street location"
              autoComplete="street-address"
              required
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
            />
          </label>
          <button
            type="button"
            onClick={() => useCurrentLocation(false)}
            disabled={locating}
            aria-label="Use my current location"
            title="Use my current location"
            className="flex shrink-0 items-center justify-center rounded-2xl border border-input bg-background px-3 text-brand-green transition-colors hover:bg-muted disabled:opacity-60"
          >
            {locating ? <Loader2 className="size-5 animate-spin text-brand-green" aria-hidden="true" /> : <LocateFixed className="size-5" aria-hidden="true" />}
          </button>
        </div>
        {locationError && <p role="alert" className="text-xs text-destructive">{locationError}</p>}
        {geocoding && (
          <p className="flex items-center gap-1.5 text-xs text-brand-blue font-medium">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Auto-detecting coordinates & region...
          </p>
        )}
        {coordinates && (
          <div className="flex items-center justify-between rounded-xl bg-brand-green/10 px-3 py-2 text-xs text-brand-green">
            <span>
              GPS: <strong>{coordinates.lat.toFixed(5)}</strong>, <strong>{coordinates.lng.toFixed(5)}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setCoordinates(null)
                setLocation('')
              }}
              className="text-xs underline hover:opacity-80"
            >
              Clear
            </button>
          </div>
        )}

        <label className="flex items-center gap-3 rounded-2xl border border-input bg-muted/60 px-4 py-3.5 focus-within:border-foreground focus-within:bg-background">
          <MapPin className="size-4 shrink-0 text-brand-blue" aria-hidden="true" />
          <span className="sr-only">Pickup city or region</span>
          <input
            type="text"
            value={region}
            onChange={(event) => handleRegionChange(event.target.value)}
            placeholder="City or region (for example, Bengaluru or Perundurai)"
            autoComplete="address-level2"
            maxLength={100}
            required
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
          />
        </label>

        {/* Donor Details Section */}
        <fieldset className="flex flex-col gap-2.5 rounded-2xl border border-border bg-background/50 p-3.5">
          <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Donor Details</legend>
          
          <label className="flex items-center gap-3 rounded-xl border border-input bg-muted/60 px-3.5 py-2.5 transition-colors focus-within:border-foreground focus-within:bg-background">
            <User className="size-4 shrink-0 text-brand-green" aria-hidden="true" />
            <span className="sr-only">Your Name</span>
            <input
              type="text"
              value={donorName}
              onChange={(event) => setDonorName(event.target.value)}
              placeholder="Your name or organization"
              maxLength={100}
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-input bg-muted/60 px-3.5 py-2.5 transition-colors focus-within:border-foreground focus-within:bg-background">
            <Phone className="size-4 shrink-0 text-brand-blue" aria-hidden="true" />
            <span className="sr-only">Phone number or Email</span>
            <input
              type="text"
              value={donorContact}
              onChange={(event) => setDonorContact(event.target.value)}
              placeholder="Mobile number or email"
              maxLength={100}
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
            />
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-input bg-muted/60 px-3.5 py-2.5 transition-colors focus-within:border-foreground focus-within:bg-background">
            <FileText className="size-4 shrink-0 mt-0.5 text-brand-orange" aria-hidden="true" />
            <span className="sr-only">Additional Details</span>
            <textarea
              value={donorNotes}
              onChange={(event) => setDonorNotes(event.target.value)}
              placeholder="Additional details (e.g. gate instructions)"
              rows={2}
              maxLength={250}
              className="w-full resize-none bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
            />
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-bold">Food items and quantities</legend>
          {foodItems.map((item, index) => (
            <div key={index} className="rounded-2xl border border-border bg-background/70 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-muted-foreground">Food item {index + 1}</span>
                {foodItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setFoodItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    aria-label={`Remove food item ${index + 1}`}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
              <label className="flex items-center gap-3 rounded-xl border border-input bg-muted/60 px-4 py-3.5 transition-colors focus-within:border-foreground focus-within:bg-background">
                {index === 0 && <UtensilsCrossed className="size-4 shrink-0 text-brand-orange" aria-hidden="true" />}
                <span className="sr-only">Type of food, item {index + 1}</span>
                <input
                  type="text"
                  value={item.foodType}
                  onChange={(event) => setFoodItems((current) => current.map((food, itemIndex) => itemIndex === index ? { ...food, foodType: event.target.value } : food))}
                  placeholder={index === 0 ? 'What type of food do you have?' : 'What other food do you have?'}
                  required
                  maxLength={120}
                  className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                />
              </label>
              <div className="mt-2 flex gap-3">
                <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-input bg-muted/60 px-4 py-3.5 focus-within:border-foreground focus-within:bg-background">
                  <span className="sr-only">Quantity for food item {index + 1}</span>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(event) => setFoodItems((current) => current.map((food, itemIndex) => itemIndex === index ? { ...food, quantity: event.target.value } : food))}
                    placeholder="Quantity"
                    min="0.01"
                    step="any"
                    required
                    className="w-full min-w-0 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                  />
                </label>
                <label className="flex items-center rounded-xl border border-input bg-muted/60 px-3 focus-within:border-foreground focus-within:bg-background">
                  <span className="sr-only">Unit for food item {index + 1}</span>
                  <select
                    value={item.quantityUnit}
                    onChange={(event) => setFoodItems((current) => current.map((food, itemIndex) => itemIndex === index ? { ...food, quantityUnit: event.target.value } : food))}
                    className="bg-transparent py-3.5 text-sm font-semibold outline-none"
                  >
                    <option value="kg">kg</option>
                    <option value="servings">servings</option>
                    <option value="boxes">boxes</option>
                    <option value="litres">litres</option>
                  </select>
                </label>
              </div>
              <label className="mt-2 block text-xs font-semibold text-muted-foreground" htmlFor={`food-expiry-${index}`}>
                Expected expiry date and time
                <input
                  id={`food-expiry-${index}`}
                  type="datetime-local"
                  value={item.expiresAt}
                  onChange={(event) => {
                    setFoodItems((current) => current.map((food, itemIndex) => itemIndex === index ? { ...food, expiresAt: event.target.value } : food))
                    setFormError('')
                  }}
                  min={now === null ? undefined : formatLocalDateTime(new Date(now + MINIMUM_EXPIRY_BUFFER_MS))}
                  required
                  className="mt-1.5 w-full rounded-xl border border-input bg-muted/60 px-3 py-3 text-sm font-medium text-foreground outline-none focus:border-foreground focus:bg-background"
                />
              </label>
            </div>
          ))}
          {foodItems.length < MAX_FOOD_ITEMS && (
            <button
              type="button"
              onClick={() => setFoodItems((current) => [...current, { foodType: '', quantity: '', quantityUnit: 'kg', expiresAt: '' }])}
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-brand-green/50 bg-brand-green/5 px-4 py-3 text-sm font-bold text-brand-green transition-colors hover:bg-brand-green/10"
            >
              <Plus className="size-4" aria-hidden="true" />Add another food item
            </button>
          )}
        </fieldset>
      </div>

      {formError && <p role="alert" className="mt-3 text-sm font-medium text-destructive">{formError}</p>}

      <button
        type="submit"
        className="group mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFC107] px-6 py-4 text-base font-bold text-black transition-all hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFC107]/40"
      >
        Find Nearby Verified NGOs
        <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </button>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0 text-brand-green" aria-hidden="true" />
        Your food details and each item’s expiry are shared with the selected NGO.
      </p>
    </form>
  )
}

export const DonationCard = DonationCardView
