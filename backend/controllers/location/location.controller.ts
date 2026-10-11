import { NextResponse } from 'next/server'

export class LocationController {
  static async reverseGeocode(request: Request) {
    const { searchParams } = new URL(request.url)
    const latitude = Number(searchParams.get('lat'))
    const longitude = Number(searchParams.get('lng'))

    if (
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    ) {
      return NextResponse.json({ error: 'Valid latitude and longitude are required.' }, { status: 400 })
    }

    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse')
      url.searchParams.set('format', 'jsonv2')
      url.searchParams.set('lat', String(latitude))
      url.searchParams.set('lon', String(longitude))
      url.searchParams.set('zoom', '18')
      url.searchParams.set('addressdetails', '1')

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'FoodRescue/1.0 (location lookup)',
          'Accept-Language': 'en',
        },
        signal: AbortSignal.timeout(8000),
      })
      if (!response.ok) {
        return NextResponse.json({ error: 'Address lookup is temporarily unavailable.' }, { status: 502 })
      }

      const result = (await response.json()) as {
        display_name?: string
        address?: Record<string, string | undefined>
      }
      const address = result.address ?? {}
      const region =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        address.state_district ||
        address.state

      return NextResponse.json(
        {
          address: result.display_name ?? '',
          region: region ?? '',
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    } catch {
      return NextResponse.json({ error: 'Address lookup is temporarily unavailable.' }, { status: 502 })
    }
  }

  static async geocode(request: Request) {
    const { searchParams } = new URL(request.url)
    const addressQuery = searchParams.get('q')?.trim() ?? ''

    if (!addressQuery || addressQuery.length < 2) {
      return NextResponse.json({ error: 'A search query is required.' }, { status: 400 })
    }

    try {
      const url = new URL('https://nominatim.openstreetmap.org/search')
      url.searchParams.set('format', 'jsonv2')
      url.searchParams.set('q', addressQuery)
      url.searchParams.set('limit', '1')
      url.searchParams.set('addressdetails', '1')

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'FoodRescue/1.0 (location search)',
          'Accept-Language': 'en',
        },
        signal: AbortSignal.timeout(8000),
      })
      if (!response.ok) {
        return NextResponse.json({ error: 'Location search is temporarily unavailable.' }, { status: 502 })
      }

      const results = (await response.json()) as Array<{
        lat: string
        lon: string
        display_name: string
        address?: Record<string, string | undefined>
      }>

      if (!results || results.length === 0) {
        return NextResponse.json({ found: false, error: 'No matching location found.' }, { status: 404 })
      }

      const topResult = results[0]
      const address = topResult.address ?? {}
      const region =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        address.state_district ||
        address.state ||
        ''

      return NextResponse.json(
        {
          found: true,
          lat: Number(topResult.lat),
          lng: Number(topResult.lon),
          displayAddress: topResult.display_name,
          region,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    } catch {
      return NextResponse.json({ error: 'Location search is temporarily unavailable.' }, { status: 502 })
    }
  }
}
