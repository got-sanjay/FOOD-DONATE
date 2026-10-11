export type NgoStatus = 'available' | 'busy'

export type LatLng = [number, number]

export type Ngo = {
  id: string
  name: string
  address: string
  distanceKm: number
  status: NgoStatus
  pickupMins: number
  logo: 'hands' | 'soup' | 'wheat'
  bearingDeg: number
  rating?: number
  completedCount?: number
  phone?: string | null
  email?: string | null
  additionalNotes?: string | null
  latitude?: number | null
  longitude?: number | null
  region?: string
}

export const BROADCAST_RADIUS_KM = 10

export const donorLocation: LatLng = [12.9352, 77.6245]

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Number((R * c).toFixed(1))
}

export const nearbyNgos: Ngo[] = [
  {
    id: 'helping-hands',
    name: 'Helping Hands Foundation',
    address: '12, MG Road, Indiranagar',
    distanceKm: 2.1,
    status: 'available',
    pickupMins: 15,
    logo: 'hands',
    bearingDeg: 25,
  },
  {
    id: 'feeding-india',
    name: 'Feeding India Local',
    address: '48, 100 Ft Road, Koramangala',
    distanceKm: 5.7,
    status: 'available',
    pickupMins: 25,
    logo: 'soup',
    bearingDeg: 120,
  },
  {
    id: 'annakshetra',
    name: 'Annakshetra NGO',
    address: '7, Temple Street, Jayanagar',
    distanceKm: 8.9,
    status: 'busy',
    pickupMins: 40,
    logo: 'wheat',
    bearingDeg: 235,
  },
  {
    id: 'robin-hood-army',
    name: 'Robin Hood Army Bengaluru',
    address: '22, 80 Ft Road, HSR Layout',
    distanceKm: 3.8,
    status: 'available',
    pickupMins: 20,
    logo: 'hands',
    bearingDeg: 310,
  },
  {
    id: 'feeding-bengaluru',
    name: 'Feeding Bengaluru Foundation',
    address: '15, Residency Road, Ashok Nagar',
    distanceKm: 6.4,
    status: 'busy',
    pickupMins: 32,
    logo: 'soup',
    bearingDeg: 72,
  },
  {
    id: 'akshaya-patra-local',
    name: 'Akshaya Patra Community Kitchen',
    address: '9, JP Nagar 2nd Phase',
    distanceKm: 9.6,
    status: 'available',
    pickupMins: 45,
    logo: 'wheat',
    bearingDeg: 195,
  },
]

const EARTH_RADIUS_KM = 6371

export function offsetLatLng([lat, lng]: LatLng, distanceKm: number, bearingDeg: number): LatLng {
  const angular = distanceKm / EARTH_RADIUS_KM
  const bearing = (bearingDeg * Math.PI) / 180
  const lat1 = (lat * Math.PI) / 180
  const lng1 = (lng * Math.PI) / 180
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  )
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    )
  return [(lat2 * 180) / Math.PI, (lng2 * 180) / Math.PI]
}

export function getNgoLocation(ngo: Ngo, origin: LatLng = donorLocation): LatLng {
  return offsetLatLng(origin, ngo.distanceKm, ngo.bearingDeg)
}
