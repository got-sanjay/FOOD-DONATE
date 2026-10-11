'use client'

import { useState, useCallback } from 'react'
import { DonationFoodItem, DonationBroadcastRequest, DonationRecord } from '@/frontend/models/donation/donation.types'

export function useDonationController() {
  const [pickupAddress, setPickupAddress] = useState('')
  const [region, setRegion] = useState('')
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [foodItems, setFoodItems] = useState<DonationFoodItem[]>([
    { foodType: '', quantity: 1, quantityUnit: 'kg', expiresAt: '' },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeDonation, setActiveDonation] = useState<DonationRecord | null>(null)

  const addFoodItem = useCallback(() => {
    if (foodItems.length < 8) {
      setFoodItems((prev) => [...prev, { foodType: '', quantity: 1, quantityUnit: 'kg', expiresAt: '' }])
    }
  }, [foodItems.length])

  const removeFoodItem = useCallback((index: number) => {
    if (foodItems.length > 1) {
      setFoodItems((prev) => prev.filter((_, i) => i !== index))
    }
  }, [foodItems.length])

  const updateFoodItem = useCallback((index: number, updates: Partial<DonationFoodItem>) => {
    setFoodItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    )
  }, [])

  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      })

      const lat = position.coords.latitude
      const lng = position.coords.longitude
      setCoordinates({ lat, lng })

      const res = await fetch(`/api/location/reverse?lat=${lat}&lng=${lng}`)
      if (res.ok) {
        const data = await res.json()
        if (data.address) setPickupAddress(data.address)
        if (data.region) setRegion(data.region)
      }
    } catch {
      setError('Could not retrieve your current location.')
    }
  }, [])

  const broadcastDonation = useCallback(
    async (selectedNgoId?: string): Promise<DonationRecord | null> => {
      setIsSubmitting(true)
      setError(null)

      try {
        const payload: DonationBroadcastRequest = {
          pickupAddress,
          region,
          latitude: coordinates?.lat ?? null,
          longitude: coordinates?.lng ?? null,
          foodType: foodItems[0]?.foodType || '',
          quantity: foodItems[0]?.quantity || 1,
          quantityUnit: foodItems[0]?.quantityUnit || 'kg',
          expiresAt: foodItems[0]?.expiresAt || '',
          foodItems,
          selectedNgoId: selectedNgoId || null,
        }

        const res = await fetch('/api/donations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to broadcast donation.')
        }

        setActiveDonation(data.donation)
        return data.donation
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Something went wrong.'
        setError(message)
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [pickupAddress, region, coordinates, foodItems]
  )

  return {
    pickupAddress,
    setPickupAddress,
    region,
    setRegion,
    coordinates,
    setCoordinates,
    foodItems,
    addFoodItem,
    removeFoodItem,
    updateFoodItem,
    isSubmitting,
    error,
    setError,
    activeDonation,
    detectLocation,
    broadcastDonation,
  }
}
