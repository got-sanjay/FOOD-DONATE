import { DonationFoodItem } from '../donation/donation.types'

export interface NgoItem {
  id: string
  name: string
  address: string
  distanceKm: number
  status: 'available' | 'busy'
  pickupMins: number
  logo: 'hands' | 'soup' | 'wheat'
  bearingDeg: number
}

export interface NgoRequestItem {
  id: string
  pickupAddress: string
  region: string
  latitude?: number | null
  longitude?: number | null
  foodType: string
  quantity: number
  quantityUnit: string
  expiresAt: string
  createdAt: string
  status?: string
  foodItems: DonationFoodItem[]
}

export interface NgoRequestsResponse {
  requests: NgoRequestItem[]
  assignedRequests: NgoRequestItem[]
  availability: 'available' | 'busy'
  region: string
  checkedAt: string
}
