export const BROADCAST_WINDOW_MS = 60 * 60 * 1000

export type DonationFoodItem = {
  foodType: string
  quantity: number
  quantityUnit: string
  expiresAt: string
}
