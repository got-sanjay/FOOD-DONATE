import { DonationController } from '@/backend/controllers/donation/donation.controller'

export const runtime = 'nodejs'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return DonationController.getStatus(request, context)
}