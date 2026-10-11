import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DonationModel } from '@/backend/models/donation/donation.model'
import { getNgoDirectory } from '@/lib/ngo-directory'
import { SiteHeaderView } from '@/frontend/views/shared/SiteHeaderView'
import { BroadcastView } from '@/frontend/views/ngo/BroadcastView'
import type { DonationFoodItem } from '@/frontend/models/donation/donation.types'

export const metadata: Metadata = {
  title: 'Track Pickup & Assignment | FoodRescue',
  description: 'Live pickup status, assignment, and OTP verification for your food donation.',
}

export default async function TrackDonationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const donation = await DonationModel.getStatus(id)

  if (!donation) {
    notFound()
  }

  const ngos = await getNgoDirectory(donation.latitude, donation.longitude)

  const foodItems: DonationFoodItem[] = (donation.items ?? []).map((item) => ({
    foodType: item.foodType,
    quantity: item.quantity,
    quantityUnit: item.quantityUnit,
    expiresAt: item.expiresAt.toISOString(),
  }))

  return (
    <div className="min-h-screen bg-background">
      <SiteHeaderView />
      <main>
        <BroadcastView
          donationId={donation.id}
          pickup={donation.pickupAddress}
          region={donation.region}
          latitude={donation.latitude}
          longitude={donation.longitude}
          donorName={donation.donorName ?? ''}
          donorContact={donation.donorContact ?? ''}
          donorNotes={donation.donorNotes ?? ''}
          foodType={donation.foodType}
          quantity={donation.quantity}
          quantityUnit={donation.quantityUnit}
          foodItems={foodItems.length > 0 ? foodItems : [{
            foodType: donation.foodType,
            quantity: donation.quantity,
            quantityUnit: donation.quantityUnit,
            expiresAt: donation.expiresAt,
          }]}
          expiresAt={donation.expiresAt}
          broadcastStartedAt={donation.createdAt}
          ngos={ngos}
        />
      </main>
    </div>
  )
}
