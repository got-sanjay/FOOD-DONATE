import { DonationController } from '@/backend/controllers/donation/donation.controller'

export const runtime = 'nodejs'

export const GET = DonationController.getById
export const PATCH = DonationController.updateStatus