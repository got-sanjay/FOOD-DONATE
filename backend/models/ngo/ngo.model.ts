import { db } from '@/backend/config/database'

export interface CreateNgoAccountData {
  name: string
  region: string
  passwordHash: string
  reviewStatus?: 'pending' | 'approved' | 'rejected'
  phone?: string | null
  email?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  additionalNotes?: string | null
}

export class NgoModel {
  static async findByNameKey(nameKey: string) {
    return db.ngoAccount.findUnique({
      where: { nameKey: nameKey.toLocaleLowerCase('en') },
    })
  }

  static async findById(id: string) {
    return db.ngoAccount.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        region: true,
        availability: true,
        isActive: true,
        reviewStatus: true,
      },
    })
  }

  static async create(data: CreateNgoAccountData) {
    return db.ngoAccount.create({
      data: {
        name: data.name,
        nameKey: data.name.toLocaleLowerCase('en'),
        region: data.region,
        passwordHash: data.passwordHash,
        reviewStatus: data.reviewStatus ?? 'pending',
        phone: data.phone ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        additionalNotes: data.additionalNotes ?? null,
      },
      select: {
        id: true,
        name: true,
        reviewStatus: true,
        region: true,
        isActive: true,
      },
    })
  }

  static async updateAvailability(id: string, availability: 'available' | 'busy') {
    return db.ngoAccount.update({
      where: { id },
      data: { availability },
    })
  }

  static async recordDecline(donationId: string, ngoId: string) {
    return db.ngoRequestDecline.upsert({
      where: { donationId_ngoId: { donationId, ngoId } },
      create: { donationId, ngoId },
      update: {},
    })
  }

  static async getApprovedActiveDirectory() {
    return db.ngoAccount.findMany({
      where: { isActive: true, reviewStatus: 'approved' },
      select: { id: true, name: true, availability: true },
      orderBy: { createdAt: 'asc' },
    })
  }
}
