import { NextResponse } from 'next/server'
import { getAuthenticatedNgo, type AuthenticatedNgo } from '@/lib/ngo-auth'
import { DonationModel } from '@/backend/models/donation/donation.model'
import { NgoModel } from '@/backend/models/ngo/ngo.model'
import { DonationView } from '@/backend/views/donation/donation.view'
import { calculateDistanceKm } from '@/lib/ngos'

function isRequestApplicableToNgo(
  request: {
    region: string
    pickupAddress: string
    latitude: number | null
    longitude: number | null
    selectedNgoId?: string | null
  },
  ngo: AuthenticatedNgo
): boolean {
  if (request.selectedNgoId === ngo.id) return true

  const ngoReg = (ngo.region || '').trim().toLowerCase()
  if (!ngoReg || ngoReg === 'unassigned' || ngoReg === 'all') return true

  let ngoLat = ngo.latitude
  let ngoLng = ngo.longitude

  if (
    (ngoLat == null || ngoLng == null) &&
    typeof request.latitude === 'number' &&
    typeof request.longitude === 'number'
  ) {
    // Consistent with lib/ngo-directory.ts: derive coordinates for registered accounts
    const hash = Array.from(ngo.id).reduce((val, ch) => (val * 31 + ch.charCodeAt(0)) >>> 0, 7)
    ngoLat = request.latitude + ((hash % 100) - 50) * 0.0008
    ngoLng = request.longitude + (((hash >>> 4) % 100) - 50) * 0.0008
  }

  // 1. Geographic distance check (within 25 km operational radius)
  if (
    typeof request.latitude === 'number' &&
    typeof request.longitude === 'number' &&
    typeof ngoLat === 'number' &&
    typeof ngoLng === 'number'
  ) {
    const dist = calculateDistanceKm(request.latitude, request.longitude, ngoLat, ngoLng)
    if (dist <= 25) return true
  }

  // 2. Region / Address fuzzy matching
  const reqReg = (request.region || '').trim().toLowerCase()
  const pickup = (request.pickupAddress || '').trim().toLowerCase()

  if (reqReg === ngoReg) return true
  if (reqReg.includes(ngoReg) || ngoReg.includes(reqReg)) return true
  if (pickup.includes(ngoReg)) return true

  // 3. Known regional clusters (e.g. Erode <-> Perundurai in same district)
  if (
    (ngoReg.includes('perundurai') && (reqReg.includes('erode') || pickup.includes('erode'))) ||
    (ngoReg.includes('erode') && (reqReg.includes('perundurai') || pickup.includes('perundurai')))
  ) {
    return true
  }

  return false
}

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
      const filteredRequests = openRequests.filter((request) => isRequestApplicableToNgo(request, ngo))

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
      const isApplicable = donation ? isRequestApplicableToNgo(donation, ngo) : false
      if (!donation || !isApplicable) {
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
      const isApplicable = donation ? isRequestApplicableToNgo(donation, ngo) : false
      if (!donation || !isApplicable) {
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
    const input = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
    const status = input.status
    if (status !== 'in_progress' && status !== 'completed') {
      return NextResponse.json({ error: 'Choose a valid pickup status.' }, { status: 400 })
    }

    const otp = typeof input.otp === 'string' ? input.otp : null
    const completionPhoto = typeof input.completionPhoto === 'string' ? input.completionPhoto : null
    const greetingsSent = typeof input.greetingsSent === 'boolean' ? input.greetingsSent : undefined

    const { id } = await params
    try {
      const result = await DonationModel.updatePickupStatus(id, ngo.id, status, {
        otp,
        completionPhoto,
        greetingsSent,
      })
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      if (result.count === 0) {
        return NextResponse.json({ error: 'This pickup cannot be updated; it may have changed or is assigned to another NGO.' }, { status: 409 })
      }
      return NextResponse.json({ status })
    } catch {
      return NextResponse.json({ error: 'Could not update this pickup status.' }, { status: 500 })
    }
  }
}
