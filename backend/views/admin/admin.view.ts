import { DonationView } from '@/backend/views/donation/donation.view'

export class AdminView {
  static formatDashboardPayload(
    ngos: unknown[],
    donations: Array<{
      id: string
      pickupAddress: string
      region: string
      foodType: string
      quantity: number
      quantityUnit: string
      expiresAt: Date
      createdAt: Date
      status: string
      selectedNgoId: string | null
      items: { foodType: string; quantity: number; quantityUnit: string; expiresAt: Date }[]
    }>,
    groupedDonations: Array<{ region: string; status: string; _count: { _all: number } }>
  ) {
    const summary = groupedDonations.map((group) => ({
      region: group.region,
      status: group.status,
      count: group._count._all,
    }))

    const donationsWithItems = donations.map((donation) => ({
      ...donation,
      foodItems: donation.items.length
        ? donation.items.map((item) => DonationView.formatDonationItem(item))
        : [
            DonationView.formatDonationItem({
              foodType: donation.foodType,
              quantity: donation.quantity,
              quantityUnit: donation.quantityUnit,
              expiresAt: donation.expiresAt,
            }),
          ],
    }))

    return {
      ngos,
      donations: donationsWithItems,
      summary,
    }
  }
}
