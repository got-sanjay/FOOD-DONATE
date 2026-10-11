import { NextResponse } from 'next/server'
import { getAuthenticatedNgo } from '@/lib/ngo-auth'
import { DonationModel, CreateDonationItemData } from '@/backend/models/donation/donation.model'

const quantityUnits = new Set(['kg', 'servings', 'boxes', 'litres'])
const allowedStatuses = new Set(['broadcasting', 'accepted', 'cancelled', 'expired'])

function parseFoodItems(input: Record<string, unknown>, fallbackExpiry: Date): CreateDonationItemData[] | null {
  const rawItems = input.foodItems === undefined
    ? [{ foodType: input.foodType, quantity: input.quantity, quantityUnit: input.quantityUnit, expiresAt: fallbackExpiry }]
    : input.foodItems
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 8) return null

  const items: CreateDonationItemData[] = []
  for (const item of rawItems) {
    if (!item || typeof item !== 'object') return null
    const record = item as Record<string, unknown>
    const foodType = typeof record.foodType === 'string' ? record.foodType.trim() : ''
    const quantity = Number(record.quantity)
    const quantityUnit = typeof record.quantityUnit === 'string' ? record.quantityUnit : ''
    const expiresAt = typeof record.expiresAt === 'string' ? new Date(record.expiresAt) : fallbackExpiry
    if (!foodType || foodType.length > 120 || !Number.isFinite(quantity) || quantity <= 0 || !quantityUnits.has(quantityUnit) || !Number.isFinite(expiresAt.getTime())) {
      return null
    }
    items.push({ foodType, quantity, quantityUnit, expiresAt })
  }
  return items
}

export class DonationController {
  static async getAll() {
    const ngo = await getAuthenticatedNgo()
    if (!ngo) {
      return NextResponse.json({ error: 'Sign in as an NGO to view donor data.' }, { status: 401 })
    }

    try {
      const donations = await DonationModel.getRecentDonations(100)
      return NextResponse.json({ donations })
    } catch {
      return NextResponse.json({ error: 'Could not load donations.' }, { status: 500 })
    }
  }

  static async getById(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const ngo = await getAuthenticatedNgo()
    if (!ngo) {
      return NextResponse.json({ error: 'Sign in as an NGO to view donor data.' }, { status: 401 })
    }

    const { id } = await params
    try {
      const donation = await DonationModel.getById(id)
      if (!donation) {
        return NextResponse.json({ error: 'Donation not found.' }, { status: 404 })
      }
      return NextResponse.json({ donation })
    } catch {
      return NextResponse.json({ error: 'Could not load this donation.' }, { status: 500 })
    }
  }

  static async getStatus(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    try {
      const result = await DonationModel.getStatus(id)
      if (!result) return NextResponse.json({ error: 'Donation not found.' }, { status: 404 })
      return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
    } catch {
      return NextResponse.json({ error: 'Could not load this donation status.' }, { status: 500 })
    }
  }

  static async create(request: Request) {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Donation details are required.' }, { status: 400 })
    }

    const input = body as Record<string, unknown>
    const pickupAddress = typeof input.pickupAddress === 'string' ? input.pickupAddress.trim() : ''
    const region = typeof input.region === 'string' ? input.region.trim().replace(/\s+/g, ' ') : ''
    const fallbackExpiry = typeof input.expiresAt === 'string' ? new Date(input.expiresAt) : new Date(Number.NaN)
    const foodItems = parseFoodItems(input, fallbackExpiry)
    const latitude = input.latitude === null || input.latitude === undefined ? null : Number(input.latitude)
    const longitude = input.longitude === null || input.longitude === undefined ? null : Number(input.longitude)

    if (!pickupAddress || pickupAddress.length > 240 || !region || region.length > 100 || !foodItems) {
      return NextResponse.json({ error: 'Add a valid pickup location, city or region, and at least one valid food item with quantity.' }, { status: 400 })
    }
    if (foodItems.some((item) => item.expiresAt.getTime() < Date.now() + 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Each food item expiry must be at least 10 minutes from now.' }, { status: 400 })
    }
    if (
      (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
      (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) ||
      ((latitude === null) !== (longitude === null))
    ) {
      return NextResponse.json({ error: 'Pickup coordinates are invalid.' }, { status: 400 })
    }

    const donorName = typeof input.donorName === 'string' ? input.donorName.trim() : null
    const donorContact = typeof input.donorContact === 'string' ? input.donorContact.trim() : null
    const donorNotes = typeof input.donorNotes === 'string' ? input.donorNotes.trim() : null

    try {
      const [primaryFood, ...additionalFoods] = foodItems
      const earliestExpiry = new Date(Math.min(...foodItems.map((item) => item.expiresAt.getTime())))
      const donation = await DonationModel.createDonation({
        pickupAddress,
        region,
        latitude,
        longitude,
        foodType: primaryFood.foodType,
        quantity: primaryFood.quantity,
        quantityUnit: primaryFood.quantityUnit,
        items: [primaryFood, ...additionalFoods],
        expiresAt: earliestExpiry,
        selectedNgoId: typeof input.selectedNgoId === 'string' ? input.selectedNgoId : null,
        donorName,
        donorContact,
        donorNotes,
      })
      return NextResponse.json({ donation }, { status: 201 })
    } catch (err: unknown) {
      console.error('Donation create error:', err)
      const message = err instanceof Error ? err.message : 'Could not save this donation. Check the database setup.'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  static async updateStatus(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'A donation status is required.' }, { status: 400 })
    }
    const input = body as Record<string, unknown>
    const status = typeof input.status === 'string' ? input.status : ''
    if (!allowedStatuses.has(status)) {
      return NextResponse.json({ error: 'Unsupported donation status.' }, { status: 400 })
    }

    try {
      const current = await DonationModel.getById(id)
      if (!current) return NextResponse.json({ error: 'Donation not found.' }, { status: 404 })

      const donation = await DonationModel.updateStatus(
        id,
        status,
        typeof input.selectedNgoId === 'string' ? input.selectedNgoId : undefined
      )
      return NextResponse.json({ donation })
    } catch {
      return NextResponse.json({ error: 'Could not update this donation.' }, { status: 500 })
    }
  }
}
