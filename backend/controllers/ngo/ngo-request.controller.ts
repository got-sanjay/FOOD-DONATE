import { NextResponse } from 'next/server'
import { getAuthenticatedNgo } from '@/lib/ngo-auth'
import { DonationModel } from '@/backend/models/donation/donation.model'
import { NgoModel } from '@/backend/models/ngo/ngo.model'
import { DonationView } from '@/backend/views/donation/donation.view'

export class NgoRequestController {
  static async getRequests() {
    const ngo = await getAuthenticatedNgo()
    if (!ngo) {
      return NextResponse.json({ error: 'Sign in as an NGO to view donor requests.' }, { status: 401 })
    }

    try {
      const now = new Date()
      await DonationModel.expireStaleBroadcasts()

      const openRequests = ngo.availability === 'busy' ? [] : await DonationModel.getOpenRequestsForNgo(ngo.id, 100)

      const allRegions = ngo.region.trim().toLocaleLowerCase('en') === 'unassigned'
      const filteredRequests = allRegions
        ? openRequests
        : openRequests.filter((request) => request.region.trim().toLocaleLowerCase('en') === ngo.region.trim().toLocaleLowerCase('en'))

      const requests = filteredRequests.slice(0, 100).map((request) => DonationView.formatRequestWithItems(request))

      const assignedRequestsRaw = await DonationModel.getAssignedRequestsForNgo(ngo.id, 100)
      const assignedRequests = assignedRequestsRaw.map((request) => DonationView.formatRequestWithItems(request))

      return NextResponse.json(
        {
          requests,
          assignedRequests,
          availability: ngo.availability,
          region: ngo.region,
          checkedAt: now.toISOString(),
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    } catch {
      return NextResponse.json({ error: 'Could not load donor requests.' }, { status: 500 })
    }
  }

  static async acceptRequest(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const ngo = await getAuthenticatedNgo()
    if (!ngo) return NextResponse.json({ error: 'Sign in as an NGO to accept requests.' }, { status: 401 })
    if (ngo.availability === 'busy') {
      return NextResponse.json({ error: 'Set your NGO status to Active before accepting requests.' }, { status: 409 })
    }

    const { id } = await params
    try {
      const donation = await DonationModel.findActiveBroadcast(id, ngo.id)
      const allRegions = ngo.region.trim().toLocaleLowerCase('en') === 'unassigned'
      const isInRegion = donation?.region.trim().toLocaleLowerCase('en') === ngo.region.trim().toLocaleLowerCase('en')
      if (!donation || (!allRegions && !isInRegion)) {
        return NextResponse.json({ error: 'This request is no longer available in your region.' }, { status: 409 })
      }

      const updated = await DonationModel.acceptBroadcast(id, ngo.id)
      if (updated.count === 0) {
        return NextResponse.json(
          { error: 'This request is no longer available; another NGO may have accepted it or its 60-minute pickup window ended.' },
          { status: 409 }
        )
      }

      const request = await DonationModel.getById(id)
      return NextResponse.json({
        request: request ? DonationView.formatRequestWithItems(request) : null,
        acceptedBy: ngo.name,
      })
    } catch {
      return NextResponse.json({ error: 'Could not accept this donor request.' }, { status: 500 })
    }
  }

  static async declineRequest(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const ngo = await getAuthenticatedNgo()
    if (!ngo) return NextResponse.json({ error: 'Sign in as an NGO to decline requests.' }, { status: 401 })

    const { id } = await params
    try {
      const donation = await DonationModel.findActiveBroadcast(id, ngo.id)
      const allRegions = ngo.region.trim().toLocaleLowerCase('en') === 'unassigned'
      const isInRegion = donation?.region.trim().toLocaleLowerCase('en') === ngo.region.trim().toLocaleLowerCase('en')
      if (!donation || (!allRegions && !isInRegion)) {
        return NextResponse.json({ error: 'This request is no longer available in your region.' }, { status: 409 })
      }

      await NgoModel.recordDecline(id, ngo.id)
      return NextResponse.json({ declined: true })
    } catch {
      return NextResponse.json({ error: 'Could not decline this donor request.' }, { status: 500 })
    }
  }

  static async updateStatus(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const ngo = await getAuthenticatedNgo()
    if (!ngo) return NextResponse.json({ error: 'Sign in as an NGO to update pickup status.' }, { status: 401 })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
    }
    const status = body && typeof body === 'object' && 'status' in body ? body.status : null
    if (status !== 'in_progress' && status !== 'completed') {
      return NextResponse.json({ error: 'Choose a valid pickup status.' }, { status: 400 })
    }

    const { id } = await params
    try {
      const updated = await DonationModel.updatePickupStatus(id, ngo.id, status)
      if (updated.count === 0) {
        return NextResponse.json({ error: 'This pickup cannot be updated; it may have changed or is assigned to another NGO.' }, { status: 409 })
      }
      return NextResponse.json({ status })
    } catch {
      return NextResponse.json({ error: 'Could not update this pickup status.' }, { status: 500 })
    }
  }
}
