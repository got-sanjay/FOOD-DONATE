import { Ngo } from '@/lib/ngos'

const ngoLogos: Ngo['logo'][] = ['hands', 'soup', 'wheat']

export class NgoView {
  static formatRegisteredNgoCard(id: string, name: string, availability: string): Ngo {
    const hash = Array.from(id).reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 7)
    const distanceKm = Number((1.1 + (hash % 880) / 100).toFixed(1))

    return {
      id,
      name,
      address: 'Registered FoodRescue NGO',
      distanceKm,
      status: availability === 'busy' ? 'busy' : 'available',
      pickupMins: Math.max(10, Math.round(distanceKm * 4 + 6)),
      logo: ngoLogos[hash % ngoLogos.length],
      bearingDeg: (hash >>> 8) % 360,
    }
  }

  static formatNgoSessionResponse(ngo: { id: string; name: string }) {
    return {
      ngo: {
        id: ngo.id,
        name: ngo.name,
      },
    }
  }
}
