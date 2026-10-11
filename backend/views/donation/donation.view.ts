export interface FormattedFoodItem {
  foodType: string
  quantity: number
  quantityUnit: string
  expiresAt: string
}

export interface FormattedDonationRequest {
  id: string
  pickupAddress: string
  region: string
  latitude?: number | null
  longitude?: number | null
  foodType: string
  quantity: number
  quantityUnit: string
  expiresAt: Date | string
  createdAt: Date | string
  status?: string
  foodItems: FormattedFoodItem[]
  donorName?: string | null
  donorContact?: string | null
  donorNotes?: string | null
}

export class DonationView {
  static formatDonationItem(item: { foodType: string; quantity: number; quantityUnit: string; expiresAt: Date | string }): FormattedFoodItem {
    return {
      foodType: item.foodType,
      quantity: item.quantity,
      quantityUnit: item.quantityUnit,
      expiresAt: typeof item.expiresAt === 'string' ? item.expiresAt : item.expiresAt.toISOString(),
    }
  }

  static formatRequestWithItems(request: {
    id: string
    pickupAddress: string
    region: string
    latitude?: number | null
    longitude?: number | null
    foodType: string
    quantity: number
    quantityUnit: string
    expiresAt: Date
    createdAt: Date
    status?: string
    donorName?: string | null
    donorContact?: string | null
    donorNotes?: string | null
    items?: { foodType: string; quantity: number; quantityUnit: string; expiresAt: Date }[]
  }): FormattedDonationRequest {
    const foodItems = request.items && request.items.length > 0
      ? request.items.map((item) => this.formatDonationItem(item))
      : [
          this.formatDonationItem({
            foodType: request.foodType,
            quantity: request.quantity,
            quantityUnit: request.quantityUnit,
            expiresAt: request.expiresAt,
          }),
        ]

    return {
      id: request.id,
      pickupAddress: request.pickupAddress,
      region: request.region,
      latitude: request.latitude,
      longitude: request.longitude,
      foodType: request.foodType,
      quantity: request.quantity,
      quantityUnit: request.quantityUnit,
      expiresAt: request.expiresAt,
      createdAt: request.createdAt,
      status: request.status,
      donorName: request.donorName ?? null,
      donorContact: request.donorContact ?? null,
      donorNotes: request.donorNotes ?? null,
      foodItems,
    }
  }
}
