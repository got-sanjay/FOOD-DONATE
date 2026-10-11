import { db } from '@/backend/config/database'

export class AdminModel {
  static async getNgos() {
    return db.ngoAccount.findMany({
      orderBy: [{ region: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        region: true,
        isActive: true,
        reviewStatus: true,
        createdAt: true,
      },
    })
  }

  static async getDonationsOverview(limit = 2000) {
    return db.donation.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        pickupAddress: true,
        foodType: true,
        quantity: true,
        quantityUnit: true,
        expiresAt: true,
        items: { select: { foodType: true, quantity: true, quantityUnit: true, expiresAt: true } },
        region: true,
        status: true,
        createdAt: true,
        selectedNgoId: true,
      },
    })
  }

  static async getDonationsGroupedByRegionStatus() {
    return db.donation.groupBy({
      by: ['region', 'status'],
      _count: { _all: true },
    })
  }

  static async createNgo(data: { name: string; region: string; passwordHash: string }) {
    return db.ngoAccount.create({
      data: {
        name: data.name,
        nameKey: data.name.toLocaleLowerCase('en'),
        region: data.region,
        passwordHash: data.passwordHash,
      },
      select: {
        id: true,
        name: true,
        region: true,
        isActive: true,
        reviewStatus: true,
        createdAt: true,
      },
    })
  }

  static async updateNgo(
    id: string,
    data: { region?: string; isActive?: boolean; reviewStatus?: 'pending' | 'approved' | 'rejected'; name?: string }
  ) {
    return db.ngoAccount.update({
      where: { id },
      data: {
        ...(data.region !== undefined ? { region: data.region } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.reviewStatus !== undefined ? { reviewStatus: data.reviewStatus } : {}),
        ...(data.name !== undefined ? { name: data.name, nameKey: data.name.toLocaleLowerCase('en') } : {}),
      },
      select: {
        id: true,
        name: true,
        region: true,
        isActive: true,
        reviewStatus: true,
        createdAt: true,
      },
    })
  }
}
