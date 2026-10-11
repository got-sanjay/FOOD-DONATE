import { NextResponse } from 'next/server'
import { getAuthenticatedAdmin } from '@/lib/admin-auth'
import { hashPassword } from '@/lib/ngo-auth'
import { AdminModel } from '@/backend/models/admin/admin.model'
import { AdminView } from '@/backend/views/admin/admin.view'

export class AdminDashboardController {
  static async getOverview() {
    if (!(await getAuthenticatedAdmin())) {
      return NextResponse.json({ error: 'Admin access is required.' }, { status: 401 })
    }

    try {
      const [ngos, donations, groupedDonations] = await Promise.all([
        AdminModel.getNgos(),
        AdminModel.getDonationsOverview(2000),
        AdminModel.getDonationsGroupedByRegionStatus(),
      ])

      const payload = AdminView.formatDashboardPayload(ngos, donations, groupedDonations)
      return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
    } catch {
      return NextResponse.json({ error: 'Could not load admin operations data.' }, { status: 500 })
    }
  }

  static async createNgo(request: Request) {
    if (!(await getAuthenticatedAdmin())) {
      return NextResponse.json({ error: 'Admin access is required.' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
    }

    const input = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
    const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : ''
    const region = typeof input.region === 'string' ? input.region.trim().replace(/\s+/g, ' ') : ''
    const password = typeof input.password === 'string' ? input.password : ''
    if (name.length < 2 || name.length > 100 || region.length < 2 || region.length > 100 || password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'Provide an NGO name and region (2–100 characters) and an initial password (8–128 characters).' }, { status: 400 })
    }

    try {
      const passwordHash = await hashPassword(password)
      const ngo = await AdminModel.createNgo({ name, region, passwordHash })
      return NextResponse.json({ ngo }, { status: 201 })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        return NextResponse.json({ error: 'An account with that NGO name already exists.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Could not create the NGO account.' }, { status: 500 })
    }
  }

  static async updateNgo(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await getAuthenticatedAdmin())) {
      return NextResponse.json({ error: 'Admin access is required.' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
    }

    const input = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
    const region = typeof input.region === 'string' ? input.region.trim().replace(/\s+/g, ' ') : null
    const isActive = typeof input.isActive === 'boolean' ? input.isActive : null
    const reviewStatus =
      input.reviewStatus === 'pending' || input.reviewStatus === 'approved' || input.reviewStatus === 'rejected'
        ? input.reviewStatus
        : null
    const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : null

    if (
      (region !== null && (region.length < 2 || region.length > 100)) ||
      (name !== null && (name.length < 2 || name.length > 100)) ||
      (region === null && isActive === null && reviewStatus === null && name === null)
    ) {
      return NextResponse.json({ error: 'Provide a valid NGO name, region, or active state.' }, { status: 400 })
    }

    const { id } = await params
    try {
      const ngo = await AdminModel.updateNgo(id, {
        ...(region !== null ? { region } : {}),
        ...(isActive !== null ? { isActive } : {}),
        ...(reviewStatus !== null ? { reviewStatus } : {}),
        ...(name !== null ? { name } : {}),
      })
      return NextResponse.json({ ngo })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        return NextResponse.json({ error: 'NGO account not found.' }, { status: 404 })
      }
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        return NextResponse.json({ error: 'An account with that NGO name already exists.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Could not update the NGO account.' }, { status: 500 })
    }
  }
}
