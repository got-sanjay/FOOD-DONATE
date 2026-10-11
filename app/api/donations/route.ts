import { DonationController } from '@/backend/controllers/donation/donation.controller'

export const runtime = 'nodejs'

export const GET = DonationController.getAll
export const POST = DonationController.create