'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { Compass, Minus, Plus } from 'lucide-react'
import { type Ngo } from '@/lib/ngos'

export type BroadcastPhase = 'broadcasting' | 'accepted' | 'in_progress' | 'completed' | 'expired'

type BroadcastMapProps = {
  phase: BroadcastPhase
  acceptedId: string | null
  ngos: Ngo[]
  pickupAddress?: string
  donorName?: string
  donorContact?: string
  donorNotes?: string
  donorLat?: number | null
  donorLng?: number | null
  onSelectNgo?: (ngoId: string) => void
}

// Default fallback to Bengaluru if donor coordinates are not set
const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946]
const BROADCAST_RADIUS_METERS = 10000
const BROADCAST_INNER_RADIUS_METERS = 3000

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character]
  })
}

// 1. Donor Pin: Green teardrop marker with white inner circle (matches reference image)
function createDonorIcon() {
  return L.divIcon({
    className: 'custom-donor-pin',
    html: `
      <div style="position: relative; width: 36px; height: 46px; cursor: pointer; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
        <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 0C8.06 0 0 8.06 0 18C0 31.5 18 46 18 46C18 46 36 31.5 36 18C36 8.06 27.94 0 18 0Z" fill="#16A34A"/>
          <circle cx="18" cy="18" r="8" fill="#FFFFFF"/>
          <circle cx="18" cy="18" r="4.5" fill="#16A34A"/>
        </svg>
        <span style="position: absolute; bottom: -20px; font-size: 11px; font-weight: 800; color: #166534; background: rgba(255,255,255,0.95); padding: 1px 6px; border-radius: 9999px; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.2); border: 1px solid #bbf7d0;">
          Pickup
        </span>
      </div>
    `,
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -46],
  })
}

// 2. NGO Pin: Orange teardrop marker with white cutlery / fork-and-knife icon (matches reference image)
function createNgoIcon(isAccepted: boolean) {
  const pinColor = isAccepted ? '#2563EB' : '#F97316'

  return L.divIcon({
    className: 'custom-ngo-pin',
    html: `
      <div style="position: relative; width: 36px; height: 46px; cursor: pointer; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); ${isAccepted ? 'transform: scale(1.15);' : ''}">
        <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 0C8.06 0 0 8.06 0 18C0 31.5 18 46 18 46C18 46 36 31.5 36 18C36 8.06 27.94 0 18 0Z" fill="${pinColor}"/>
          <!-- Fork and Knife Cutlery Symbol -->
          <g transform="translate(10, 8)" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none">
            <!-- Fork -->
            <path d="M3 1v6M1 1v4c0 1.1.9 2 2 2v6M5 1v4c0 1.1-.9 2-2 2"/>
            <!-- Knife -->
            <path d="M11 1c1.5 1.5 2 3.5 2 6v6h-2V1"/>
          </g>
        </svg>
      </div>
    `,
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -46],
  })
}

export function BroadcastMapView({
  phase,
  acceptedId,
  ngos,
  pickupAddress = 'Donor Pickup Location',
  donorName,
  donorContact,
  donorNotes,
  donorLat,
  donorLng,
  onSelectNgo,
}: BroadcastMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const layerGroupRef = useRef<L.LayerGroup | null>(null)
  const [, setMapReady] = useState(false)

  // 1. Resolve Donor Coordinates based on request region
  const donorCoords: [number, number] =
    typeof donorLat === 'number' && typeof donorLng === 'number' && Number.isFinite(donorLat) && Number.isFinite(donorLng)
      ? [donorLat, donorLng]
      : ngos.length > 0 && typeof ngos[0].latitude === 'number' && typeof ngos[0].longitude === 'number'
      ? [ngos[0].latitude, ngos[0].longitude]
      : DEFAULT_CENTER

  // Initialize Map with 100% Free OpenStreetMap Tiles (NO API KEY, NO WATERMARK)
  useEffect(() => {
    if (!mapContainerRef.current) return
    let resizeTimer: ReturnType<typeof setTimeout> | null = null

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: donorCoords,
        zoom: 12,
        zoomControl: false,
      })

      // Clean OpenStreetMap standard tile provider - 100% Free, NO API key required
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      const layerGroup = L.layerGroup().addTo(map)
      layerGroupRef.current = layerGroup
      mapInstanceRef.current = map
      setMapReady(true)

      // Ensure proper sizing
      resizeTimer = setTimeout(() => {
        if (mapInstanceRef.current === map && mapContainerRef.current?.isConnected) {
          map.invalidateSize()
        }
      }, 200)
    }

    return () => {
      if (resizeTimer !== null) clearTimeout(resizeTimer)
      const map = mapInstanceRef.current
      mapInstanceRef.current = null
      layerGroupRef.current = null
      if (map) {
        map.remove()
      }
    }
  }, [])

  // Update Markers, Route, and Perimeter Circle when data changes
  useEffect(() => {
    const map = mapInstanceRef.current
    const layerGroup = layerGroupRef.current
    if (!map || !layerGroup) return

    layerGroup.clearLayers()

    const [dLat, dLng] = donorCoords

    // 1. Pulse to the 3 km inner zone and full 10 km broadcast radius.
    if (phase === 'broadcasting') {
      const createRadarIcon = () => {
        const metersPerPixel =
          (40075016.686 * Math.cos((dLat * Math.PI) / 180)) / (256 * 2 ** map.getZoom())
        const diameter = (BROADCAST_RADIUS_METERS * 2) / metersPerPixel
        const center = diameter / 2
        const radius = center

        return L.divIcon({
          className: 'leaflet-radar-container',
          html: `
            <svg class="broadcast-wave-scene" width="${diameter}" height="${diameter}" viewBox="0 0 ${diameter} ${diameter}" aria-hidden="true">
              ${[
                {
                  radius: (BROADCAST_INNER_RADIUS_METERS / BROADCAST_RADIUS_METERS) * radius,
                  delay: 0,
                  className: 'fr-radar-ring--inner',
                },
                { radius, delay: 2, className: 'fr-radar-ring--outer' },
              ]
                .map(
                  ({ radius: ringRadius, delay, className }) => `
                    <circle
                      cx="${center}"
                      cy="${center}"
                      r="${ringRadius}"
                      class="fr-radar-ring ${className}"
                      fill="rgba(22,163,74,0.2)"
                      stroke="rgba(22,163,74,0.75)"
                      stroke-width="2"
                      vector-effect="non-scaling-stroke"
                      style="animation-delay: ${delay}s"
                    ></circle>
                  `,
                )
                .join('')}
            </svg>
          `,
          iconSize: [diameter, diameter],
          iconAnchor: [diameter / 2, diameter / 2],
        })
      }

      const radarMarker = L.marker([dLat, dLng], {
        icon: createRadarIcon(),
        interactive: false,
        zIndexOffset: 50,
      })
      const updateRadarSize = () => radarMarker.setIcon(createRadarIcon())
      map.on('zoomend', updateRadarSize)
      radarMarker.on('remove', () => map.off('zoomend', updateRadarSize))
      radarMarker.addTo(layerGroup)
    }

    // 2. Add Donor Marker
    const donorMarker = L.marker([dLat, dLng], {
      icon: createDonorIcon(),
      zIndexOffset: 1000,
    })

    donorMarker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; min-width: 200px; padding: 4px;">
        <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
          <span>Donor Pickup Location</span>
        </div>
        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px; line-height: 1.3;">
          ${pickupAddress}
        </div>
        ${donorName ? `<div style="font-size: 11px; color: #475569;">Donor: <strong>${donorName}</strong></div>` : ''}
        ${donorContact ? `<div style="font-size: 11px; color: #475569;">Contact: <strong>${donorContact}</strong></div>` : ''}
        ${donorNotes ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px; font-style: italic;">"${donorNotes}"</div>` : ''}
      </div>
    `)

    donorMarker.addTo(layerGroup)

    // 3. Add 10 KM Perimeter Circle
    const perimeterCircle = L.circle([dLat, dLng], {
      radius: BROADCAST_RADIUS_METERS,
      color: '#16a34a',
      weight: 2,
      dashArray: '8, 8',
      fillColor: '#16a34a',
      fillOpacity: 0.05,
    })
    if (phase === 'broadcasting') {
      L.circle([dLat, dLng], {
        radius: 7000,
        color: '#16a34a',
        weight: 1.5,
        opacity: 0.12,
        fillColor: '#22c55e',
        fillOpacity: 0.035,
        interactive: false,
      }).addTo(layerGroup)

      L.circle([dLat, dLng], {
        radius: 3000,
        color: '#16a34a',
        weight: 1.5,
        opacity: 0.28,
        fillColor: '#16a34a',
        fillOpacity: 0.1,
        interactive: false,
      }).addTo(layerGroup)
    }
    perimeterCircle.addTo(layerGroup)

    // 3. Add NGO Markers (with Cutlery Orange Icon)
    let acceptedNgoCoords: [number, number] | null = null
    ngos.forEach((ngo) => {
      // Resolve coordinates (if explicit or derived around donor location)
      const ngoLat =
        typeof ngo.latitude === 'number'
          ? ngo.latitude
          : dLat + (ngo.distanceKm / 111) * Math.cos(((ngo.bearingDeg || 45) * Math.PI) / 180)

      const ngoLng =
        typeof ngo.longitude === 'number'
          ? ngo.longitude
          : dLng + (ngo.distanceKm / (111 * Math.cos((dLat * Math.PI) / 180))) * Math.sin(((ngo.bearingDeg || 45) * Math.PI) / 180)

      const isAccepted = acceptedId === ngo.id
      if (isAccepted) {
        acceptedNgoCoords = [ngoLat, ngoLng]
      }

      const marker = L.marker([ngoLat, ngoLng], {
        icon: createNgoIcon(isAccepted),
        zIndexOffset: isAccepted ? 900 : 500,
      })

      const statusLabel = isAccepted ? 'Matched' : ngo.status === 'busy' ? 'Busy' : 'Available'
      marker.bindTooltip(
        `
          <div class="ngo-map-tooltip-content">
            <strong>${escapeHtml(ngo.name)}</strong>
            <span class="ngo-map-tooltip-meta">
              <span class="ngo-map-status ngo-map-status--${isAccepted ? 'matched' : ngo.status}">${statusLabel}</span>
              <span>${ngo.distanceKm} km · ${ngo.pickupMins} min ETA</span>
            </span>
          </div>
        `,
        {
          permanent: false,
          direction: 'top',
          offset: [0, -38],
          className: 'ngo-map-tooltip',
        },
      )

      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; min-width: 220px; padding: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <strong style="font-size: 14px; color: #0f172a; line-height: 1.2;">${escapeHtml(ngo.name)}</strong>
            <span style="font-size: 11px; font-weight: 700; color: #16a34a; background: #e6f4ea; padding: 2px 6px; border-radius: 9999px; white-space: nowrap;">Rating: ${ngo.rating ?? 4.9}</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: #334155; margin-bottom: 8px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
            <div><strong>${ngo.distanceKm} KM</strong> away · <strong>${ngo.pickupMins} mins</strong> ETA</div>
            <div><strong>${ngo.completedCount ?? 25}</strong> food rescue pickups completed</div>
            ${ngo.phone ? `<div>Phone: <strong>${escapeHtml(ngo.phone)}</strong></div>` : ''}
            ${ngo.address ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">Hub: ${escapeHtml(ngo.address)}</div>` : ''}
          </div>

          ${
            phase === 'broadcasting' && onSelectNgo
              ? `<button id="btn-assign-${escapeHtml(ngo.id)}" style="width: 100%; background: #16a34a; color: #ffffff; border: none; padding: 8px 12px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; box-shadow: 0 2px 6px rgba(22,163,74,0.3);">
                  Assign This NGO Now
                </button>`
              : isAccepted
              ? `<div style="background: #dbeafe; color: #1d4ed8; text-align: center; padding: 6px; border-radius: 6px; font-weight: 700; font-size: 11px;">
                  Matched Partner NGO
                </div>`
              : ''
          }
        </div>
      `

      marker.bindPopup(popupHtml)
      marker.on('click', () => marker.openPopup())

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-assign-${ngo.id}`)
        if (btn && onSelectNgo) {
          btn.onclick = () => {
            onSelectNgo(ngo.id)
            marker.closePopup()
          }
        }
      })

      marker.addTo(layerGroup)
    })

    // 4. Draw Route Line when Accepted (dashed connection line matching screenshot)
    if (acceptedNgoCoords && (phase === 'accepted' || phase === 'in_progress' || phase === 'completed')) {
      const routeLine = L.polyline([[dLat, dLng], acceptedNgoCoords], {
        color: '#334155',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '8, 8',
      })
      routeLine.addTo(layerGroup)

      const bounds = L.latLngBounds([[dLat, dLng], acceptedNgoCoords])
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 })
    } else {
      map.fitBounds(perimeterCircle.getBounds(), { padding: [50, 50], maxZoom: 12 })
    }
  }, [donorCoords, ngos, acceptedId, phase, pickupAddress, donorName, donorContact, donorNotes, onSelectNgo])

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn()
  }

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut()
  }

  const handleResetCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(
        L.circle(donorCoords, { radius: BROADCAST_RADIUS_METERS }).getBounds(),
        { padding: [50, 50], maxZoom: 12, animate: true },
      )
    }
  }

  return (
    <div className="relative size-full overflow-hidden bg-slate-100">
      {/* Real Interactive Street Map Container */}
      <div ref={mapContainerRef} className="size-full z-0" />

      {/* Region & Dispatch Perimeter Indicator Badge */}
      <div className="absolute top-4 left-4 z-[400] flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-background/95 px-3.5 py-2 text-xs font-semibold shadow-lg backdrop-blur">
          <span className="flex size-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-foreground">Region: {pickupAddress.split(',')[0]}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-brand-green font-bold">10 KM Radius ({ngos.length} NGOs)</span>
        </div>
      </div>

      {/* Floating Map Controls (Zoom & Center matching screenshot) */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        <div className="flex flex-col overflow-hidden rounded-xl border border-border/80 bg-background/95 shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom in"
            aria-label="Zoom in"
            className="flex size-9 items-center justify-center text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="size-4" />
          </button>
          <div className="h-px bg-border/60" />
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom out"
            aria-label="Zoom out"
            className="flex size-9 items-center justify-center text-foreground hover:bg-muted transition-colors"
          >
            <Minus className="size-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleResetCenter}
          title="Compass / Center on Donor Pickup"
          aria-label="Center on pickup location"
          className="flex size-9 items-center justify-center rounded-xl border border-border/80 bg-background/95 text-foreground shadow-lg backdrop-blur hover:bg-muted transition-colors"
        >
          <Compass className="size-4 text-brand-green" />
        </button>
      </div>

      {/* Bottom Legend */}
      <ul className="absolute bottom-6 right-4 z-[400] flex flex-col gap-1.5 rounded-xl border border-border/80 bg-background/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur">
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-green-600" aria-hidden="true" />
          <span>Pickup Location</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-orange-500" aria-hidden="true" />
          <span>Surrounding NGOs</span>
        </li>
      </ul>

      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          border-radius: 14px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25) !important;
          padding: 0 !important;
          overflow: hidden;
        }
        .leaflet-popup-content {
          margin: 10px 14px !important;
        }
      `}</style>
    </div>
  )
}

export const BroadcastMap = BroadcastMapView
export default BroadcastMapView
