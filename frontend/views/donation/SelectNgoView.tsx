import { SiteHeaderView } from '@/frontend/views/shared/SiteHeaderView'
import { NgoSelectionView } from '@/frontend/views/ngo/NgoSelectionView'
import { Ngo } from '@/lib/ngos'
import { DonationFoodItem } from '@/frontend/models/donation/donation.types'

interface SelectNgoViewProps {
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

export function SelectNgoView({
  pickup,
  region,
  foodType,
  quantity,
  quantityUnit,
  foodItems,
  expiresAt,
  latitude,
  longitude,
  donorName,
  donorContact,
  donorNotes,
  ngos,
}: SelectNgoViewProps) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeaderView />
      <main>
        <NgoSelectionView
          pickup={pickup}
          region={region}
          foodType={foodType}
          quantity={quantity}
          quantityUnit={quantityUnit}
          foodItems={foodItems}
          expiresAt={expiresAt}
          latitude={latitude}
          longitude={longitude}
          donorName={donorName}
          donorContact={donorContact}
          donorNotes={donorNotes}
          ngos={ngos}
        />
      </main>
    </div>
  )
}
