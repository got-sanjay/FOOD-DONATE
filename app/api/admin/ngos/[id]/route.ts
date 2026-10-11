import { AdminDashboardController } from '@/backend/controllers/admin/admin-dashboard.controller'

export const runtime = 'nodejs'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return AdminDashboardController.updateNgo(request, context)
}