import type { Metadata } from 'next'
import { SelectNgoView } from '@/frontend/views/donation/SelectNgoView'
import { getNgoDirectory } from '@/lib/ngo-directory'
import type { DonationFoodItem } from '@/frontend/models/donation/donation.types'

export const metadata: Metadata = {
  title: 'Select a Verified NGO | FoodRescue',
  description: 'Choose a verified NGO within 10 KM to pick up your surplus food donation.',
}

export default async function SelectNgoPage({
  searchParams,
}: {
  searchParams: Promise<{
    pickup?: string
    region?: string
    foodType?: string
    quantity?: string
    quantityUnit?: string
    foodItems?: string
    expiresAt?: string
    lat?: string
    lng?: string
  }>
}) {
  const { pickup, region, foodType, quantity, quantityUnit, foodItems: foodItemsParam, expiresAt, lat, lng } = await searchParams
  const parsedQuantity = Number(quantity)
  let foodItems: DonationFoodItem[] = []
  try {
    const parsedItems: unknown = JSON.parse(foodItemsParam || '[]')
    if (Array.isArray(parsedItems)) {
      foodItems = parsedItems.flatMap((item): DonationFoodItem[] => {
        if (!item || typeof item !== 'object') return []
        const candidate = item as Record<string, unknown>
        if (typeof candidate.foodType !== 'string' || typeof candidate.quantity !== 'number' || typeof candidate.quantityUnit !== 'string') return []
        return [{
          foodType: candidate.foodType,
          quantity: candidate.quantity,
          quantityUnit: candidate.quantityUnit,
          expiresAt: typeof candidate.expiresAt === 'string' ? candidate.expiresAt : expiresAt || '',
        }]
      }).slice(0, 8)
    }
  } catch {
    foodItems = []
  }
  if (foodItems.length === 0 && foodType?.trim() && Number.isFinite(parsedQuantity) && parsedQuantity > 0) {
    foodItems = [{ foodType: foodType.trim(), quantity: parsedQuantity, quantityUnit: quantityUnit?.trim() || 'kg', expiresAt: expiresAt || '' }]
  }
  const parsedLatitude = Number.isFinite(Number(lat)) ? Number(lat) : null
  const parsedLongitude = Number.isFinite(Number(lng)) ? Number(lng) : null
  const ngos = await getNgoDirectory(parsedLatitude, parsedLongitude)

  return (
    <SelectNgoView
      pickup={pickup?.trim() || ''}
      region={region?.trim() || ''}
      foodType={foodType?.trim() || ''}
      quantity={Number.isFinite(parsedQuantity) ? parsedQuantity : 0}
      quantityUnit={quantityUnit?.trim() || 'kg'}
      foodItems={foodItems}
      expiresAt={expiresAt || ''}
      latitude={Number.isFinite(parsedLatitude) ? parsedLatitude : null}
      longitude={Number.isFinite(parsedLongitude) ? parsedLongitude : null}
      ngos={ngos}
    />
  )
}
