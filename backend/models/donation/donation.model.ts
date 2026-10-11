import { randomInt } from 'node:crypto'
import { db } from '@/backend/config/database'
import { BROADCAST_WINDOW_MS } from '@/lib/donation'

function generatePickupOtp() {
  return randomInt(1000, 10000).toString()
}

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
      select: {
        id: true,
        pickupAddress: true,
        region: true,
        latitude: true,
        longitude: true,
        foodType: true,
        quantity: true,
        quantityUnit: true,
        expiresAt: true,
        status: true,
        selectedNgoId: true,
        pickupOtp: true,
        otpVerified: true,
        completionPhoto: true,
        greetingsSent: true,
        donorName: true,
        donorContact: true,
        donorNotes: true,
        createdAt: true,
        updatedAt: true,
        items: true,
      },
    })
    if (!donation) return null

    const selectedNgo = donation.selectedNgoId
      ? await db.ngoAccount.findUnique({
          where: { id: donation.selectedNgoId },
          select: { name: true, phone: true, email: true, address: true, rating: true, completedCount: true },
        })
      : null

    return {
      id: donation.id,
      pickupAddress: donation.pickupAddress,
      region: donation.region,
      latitude: donation.latitude,
      longitude: donation.longitude,
      foodType: donation.foodType,
      quantity: donation.quantity,
      quantityUnit: donation.quantityUnit,
      expiresAt: donation.expiresAt.toISOString(),
      items: donation.items,
      createdAt: donation.createdAt.toISOString(),
      updatedAt: donation.updatedAt.toISOString(),
      status: donation.status,
      selectedNgoName: selectedNgo?.name ?? null,
      selectedNgoPhone: selectedNgo?.phone ?? null,
      selectedNgoEmail: selectedNgo?.email ?? null,
      selectedNgoAddress: selectedNgo?.address ?? null,
      selectedNgoRating: selectedNgo?.rating ?? null,
      selectedNgoCompletedCount: selectedNgo?.completedCount ?? null,
      pickupOtp: donation.pickupOtp,
      otpVerified: donation.otpVerified,
      completionPhoto: donation.completionPhoto,
      greetingsSent: donation.greetingsSent,
      donorName: donation.donorName,
      donorContact: donation.donorContact,
      donorNotes: donation.donorNotes,
    }
  }

  static async createDonation(data: CreateDonationData) {
    const { items, ...donationData } = data
    const pickupOtp = generatePickupOtp()
    return db.donation.create({
      data: {
        ...donationData,
        pickupOtp,
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
    const existing = await db.donation.findUnique({
      where: { id },
      select: { pickupOtp: true },
    })
    const pickupOtp = existing?.pickupOtp ?? generatePickupOtp()

    return db.donation.update({
      where: { id },
      data: {
        status,
        ...(status === 'accepted' && selectedNgoId ? { selectedNgoId, pickupOtp } : {}),
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
      select: {
        id: true,
        region: true,
        pickupAddress: true,
        latitude: true,
        longitude: true,
        selectedNgoId: true,
      },
    })
  }

  static async acceptBroadcast(id: string, ngoId: string) {
    const cutoff = new Date(Date.now() - BROADCAST_WINDOW_MS)
    const existing = await db.donation.findFirst({
      where: {
        id,
        status: 'broadcasting',
        updatedAt: { gt: cutoff },
      },
      select: { pickupOtp: true },
    })
    const pickupOtp = existing?.pickupOtp ?? generatePickupOtp()

    return db.donation.updateMany({
      where: {
        id,
        status: 'broadcasting',
        updatedAt: { gt: cutoff },
      },
      data: {
        status: 'accepted',
        selectedNgoId: ngoId,
        pickupOtp,
      },
    })
  }

  static async updatePickupStatus(
    id: string,
    ngoId: string,
    status: 'in_progress' | 'completed',
    options?: {
      otp?: string | null
      completionPhoto?: string | null
      greetingsSent?: boolean
    },
  ) {
    const donation = await db.donation.findFirst({
      where: { id, selectedNgoId: ngoId },
      select: { id: true, status: true, pickupOtp: true },
    })
    if (!donation) {
      return { count: 0, error: 'Pickup order not found or not assigned to your NGO.' }
    }

    // When advancing from accepted -> in_progress, verify the donor's OTP
    if (status === 'in_progress') {
      if (donation.pickupOtp && options?.otp) {
        if (options.otp.trim() !== donation.pickupOtp.trim()) {
          return { count: 0, error: 'Invalid Donor OTP! Please enter the correct 4-digit code provided by the donor.' }
        }
      }
    }

    const updated = await db.donation.updateMany({
      where: {
        id,
        selectedNgoId: ngoId,
      },
      data: {
        status,
        ...(status === 'in_progress' ? { otpVerified: true } : {}),
        ...(options?.completionPhoto ? { completionPhoto: options.completionPhoto } : {}),
        ...(typeof options?.greetingsSent === 'boolean' ? { greetingsSent: options.greetingsSent } : {}),
      },
    })

    return { count: updated.count, error: null }
  }
}
