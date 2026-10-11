import { db } from '@/backend/config/database'
import { BROADCAST_WINDOW_MS } from '@/lib/donation'

export interface CreateDonationItemData {
  foodType: string
  quantity: number
  quantityUnit: string
  expiresAt: Date
}

export interface CreateDonationData {
  pickupAddress: string
  region: string
  latitude: number | null
  longitude: number | null
  foodType: string
  quantity: number
  quantityUnit: string
  items: CreateDonationItemData[]
  expiresAt: Date
  selectedNgoId?: string | null
  donorName?: string | null
  donorContact?: string | null
  donorNotes?: string | null
}

export class DonationModel {
  static async getRecentDonations(limit = 100) {
    return db.donation.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        items: true,
      },
    })
  }

  static async getById(id: string) {
    return db.donation.findUnique({
      where: { id },
      include: {
        items: true,
      },
    })
  }

  static async getStatus(id: string) {
    const donation = await db.donation.findUnique({
      where: { id },
      select: { status: true, selectedNgoId: true },
    })
    if (!donation) return null

    const selectedNgo = donation.selectedNgoId
      ? await db.ngoAccount.findUnique({
          where: { id: donation.selectedNgoId },
          select: { name: true },
        })
      : null

    return {
      status: donation.status,
      selectedNgoName: selectedNgo?.name ?? null,
    }
  }

  static async createDonation(data: CreateDonationData) {
    const { items, ...donationData } = data
    return db.donation.create({
      data: {
        ...donationData,
        status: 'broadcasting',
        items: {
          create: items,
        },
      },
      include: {
        items: true,
      },
    })
  }

  static async updateStatus(id: string, status: string, selectedNgoId?: string) {
    return db.donation.update({
      where: { id },
      data: {
        status,
        ...(status === 'accepted' && selectedNgoId ? { selectedNgoId } : {}),
      },
    })
  }

  static async expireStaleBroadcasts() {
    const cutoff = new Date(Date.now() - BROADCAST_WINDOW_MS)
    return db.donation.updateMany({
      where: {
        status: 'broadcasting',
        updatedAt: { lte: cutoff },
      },
      data: { status: 'expired' },
    })
  }

  static async getOpenRequestsForNgo(ngoId: string, limit = 100) {
    const cutoff = new Date(Date.now() - BROADCAST_WINDOW_MS)
    return db.donation.findMany({
      where: {
        status: 'broadcasting',
        updatedAt: { gt: cutoff },
        declines: { none: { ngoId } },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
      include: {
        items: {
          select: {
            foodType: true,
            quantity: true,
            quantityUnit: true,
            expiresAt: true,
          },
        },
      },
    })
  }

  static async getAssignedRequestsForNgo(ngoId: string, limit = 100) {
    return db.donation.findMany({
      where: {
        selectedNgoId: ngoId,
        status: { in: ['accepted', 'in_progress', 'completed'] },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit,
      include: {
        items: {
          select: {
            foodType: true,
            quantity: true,
            quantityUnit: true,
            expiresAt: true,
          },
        },
      },
    })
  }

  static async findActiveBroadcast(id: string, ngoId: string) {
    const cutoff = new Date(Date.now() - BROADCAST_WINDOW_MS)
    return db.donation.findFirst({
      where: {
        id,
        status: 'broadcasting',
        updatedAt: { gt: cutoff },
        declines: { none: { ngoId } },
      },
      select: { id: true, region: true },
    })
  }

  static async acceptBroadcast(id: string, ngoId: string) {
    const cutoff = new Date(Date.now() - BROADCAST_WINDOW_MS)
    return db.donation.updateMany({
      where: {
        id,
        status: 'broadcasting',
        updatedAt: { gt: cutoff },
      },
      data: {
        status: 'accepted',
        selectedNgoId: ngoId,
      },
    })
  }

  static async updatePickupStatus(id: string, ngoId: string, status: 'in_progress' | 'completed') {
    const previousStatus = status === 'in_progress' ? 'accepted' : 'in_progress'
    return db.donation.updateMany({
      where: {
        id,
        selectedNgoId: ngoId,
        status: previousStatus,
      },
      data: { status },
    })
  }
}
