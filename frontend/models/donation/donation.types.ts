export const PENDING_DONOR_DETAILS_KEY = 'foodrescue.pendingDonorDetails'

export interface PendingDonorDetails {
  donorName: string
  donorContact: string
  donorNotes: string
}

export interface DonationFoodItem {
  foodType: string
  quantity: number
  quantityUnit: string
  expiresAt: string
}

export interface DonationBroadcastRequest {
  pickupAddress: string
  region: string
  latitude: number | null
  longitude: number | null
  foodType: string
  quantity: number
  quantityUnit: string
  expiresAt: string
  selectedNgoId?: string | null
  foodItems?: DonationFoodItem[]
  donorName?: string | null
  donorContact?: string | null
  donorNotes?: string | null
}

export interface DonationRecord {
  id: string
  pickupAddress: string
  region: string
  latitude: number | null
  longitude: number | null
  foodType: string
  quantity: number
  quantityUnit: string
  expiresAt: string
  createdAt: string
  status: 'broadcasting' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'expired'
  selectedNgoId?: string | null
  foodItems: DonationFoodItem[]
  donorName?: string | null
  donorContact?: string | null
  donorNotes?: string | null
}
