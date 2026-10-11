import { prisma } from '@/lib/prisma'
import { nearbyNgos, type Ngo, calculateDistanceKm, getNgoLocation } from '@/lib/ngos'

const ngoLogos: Ngo['logo'][] = ['hands', 'soup', 'wheat']

interface RegisteredAccountRecord {
  id: string
  name: string
  region: string
  availability: string
  phone?: string | null
  email?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  rating?: number | null
  completedCount?: number | null
  additionalNotes?: string | null
}

function getRegisteredNgoDetails(
  account: RegisteredAccountRecord,
  donorLat: number | null,
  donorLng: number | null
): Ngo {
  const hash = Array.from(account.id).reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 7)
  const bearingDeg = (hash >>> 8) % 360

  let distanceKm: number
  let pickupMins: number

  if (donorLat !== null && donorLng !== null && account.latitude != null && account.longitude != null) {
    distanceKm = calculateDistanceKm(donorLat, donorLng, account.latitude, account.longitude)
    pickupMins = Math.max(10, Math.round(distanceKm * 4 + 6))
  } else if (donorLat !== null && donorLng !== null) {
    // If NGO hasn't configured exact coordinates yet, generate a realistic location offset based on their hash
    const pseudoDist = Number((1.2 + (hash % 780) / 100).toFixed(1))
    distanceKm = pseudoDist
    pickupMins = Math.max(10, Math.round(distanceKm * 4 + 6))
  } else {
    distanceKm = Number((1.5 + (hash % 850) / 100).toFixed(1))
    pickupMins = Math.max(10, Math.round(distanceKm * 4 + 6))
  }

  return {
    id: account.id,
    name: account.name,
    address: account.address || `${account.region} Area, Registered NGO`,
    distanceKm,
    status: account.availability === 'busy' ? 'busy' : 'available',
    pickupMins,
    logo: ngoLogos[hash % ngoLogos.length],
    bearingDeg,
    rating: typeof account.rating === 'number' ? Number(account.rating.toFixed(1)) : 4.8,
    completedCount: typeof account.completedCount === 'number' ? account.completedCount : 12,
    phone: account.phone ?? null,
    email: account.email ?? null,
    additionalNotes: account.additionalNotes ?? null,
    latitude: account.latitude ?? null,
    longitude: account.longitude ?? null,
    region: account.region,
  }
}

export async function getNgoDirectory(donorLat: number | null = null, donorLng: number | null = null): Promise<Ngo[]> {
  const registeredAccounts = (await prisma.ngoAccount.findMany({
    where: { isActive: true, reviewStatus: 'approved' },
    select: {
      id: true,
      name: true,
      region: true,
      availability: true,
      phone: true,
      email: true,
      address: true,
      latitude: true,
      longitude: true,
      rating: true,
      completedCount: true,
      additionalNotes: true,
    },
    orderBy: { createdAt: 'asc' },
  })) as RegisteredAccountRecord[]

  const registeredNgos = registeredAccounts.map((account) =>
    getRegisteredNgoDetails(account, donorLat, donorLng)
  )

  const registeredNames = new Set(registeredNgos.map((ngo) => ngo.name.toLocaleLowerCase('en')))

  // Calculate distances for simulated seed NGOs based on the donor's coordinates
  const simulatedNgos: Ngo[] = nearbyNgos
    .filter((ngo) => !registeredNames.has(ngo.name.toLocaleLowerCase('en')))
    .map((ngo) => {
      let distanceKm = ngo.distanceKm
      let pickupMins = ngo.pickupMins

      if (donorLat !== null && donorLng !== null) {
        const [simLat, simLng] = getNgoLocation(ngo)
        distanceKm = calculateDistanceKm(donorLat, donorLng, simLat, simLng)
        pickupMins = Math.max(10, Math.round(distanceKm * 4 + 6))
      }

      return {
        ...ngo,
        distanceKm,
        pickupMins,
        rating: 4.9,
        completedCount: 25,
        phone: '+91 98765 43210',
        email: `contact@${ngo.id}.org`,
        additionalNotes: 'Verified FoodRescue partner fleet ready for rapid surplus food collection.',
      }
    })

  const allNgos = [...registeredNgos, ...simulatedNgos]

  // Filter within 10 km radius!
  const within10Km = allNgos.filter((ngo) => ngo.distanceKm <= 10)

  // Sort ascending by distance (closest first)
  return within10Km.sort((a, b) => a.distanceKm - b.distanceKm)
}