'use client'

import { useMemo, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { BROADCAST_RADIUS_KM, type Ngo } from '@/lib/ngos'
import { cn } from '@/lib/utils'

export type BroadcastPhase = 'broadcasting' | 'accepted' | 'in_progress' | 'completed' | 'expired'

type BroadcastMapProps = {
  phase: BroadcastPhase
  acceptedId: string | null
  ngos: Ngo[]
  pickupAddress?: string
  donorName?: string
  donorContact?: string
  donorNotes?: string
  donorLat?: number
  donorLng?: number
  onSelectNgo?: (ngoId: string) => void
}

const VIEW = 1000
const CENTER = VIEW / 2
const PX_PER_KM = 40
const RADIUS_PX = BROADCAST_RADIUS_KM * PX_PER_KM
const ZOOM_LEVELS = [1, 1.4, 2]

type Point = { x: number; y: number }

function projectNgo(ngo: Ngo): Point {
  const bearing = (ngo.bearingDeg * Math.PI) / 180
  const d = ngo.distanceKm * PX_PER_KM
  return { x: CENTER + Math.sin(bearing) * d, y: CENTER - Math.cos(bearing) * d }
}

function routePath(to: Point) {
  const midX = CENTER + (to.x - CENTER) * 0.55
  return `M ${CENTER} ${CENTER} L ${midX} ${CENTER} L ${midX} ${to.y} L ${to.x} ${to.y}`
}

const minorRoads = [
  'M -2000 180 H 3000',
  'M -2000 330 H 3000',
  'M -2000 640 H 3000',
  'M -2000 800 H 3000',
  'M 160 -2000 V 3000',
  'M 320 -2000 V 3000',
  'M 680 -2000 V 3000',
  'M 840 -2000 V 3000',
]

const majorRoads = [
  'M -2000 500 H 3000',
  'M 500 -2000 V 3000',
  'M -400 1300 L 1400 -300',
  'M -300 -100 Q 400 420 1300 260',
]

const parks = [
  { x: 190, y: 200, w: 110, h: 110 },
  { x: 700, y: 350, w: 120, h: 80 },
  { x: 345, y: 660, w: 130, h: 120 },
  { x: 870, y: 660, w: 140, h: 120 },
]

export function BroadcastMapView({
  phase,
  acceptedId,
  ngos: ngoDirectory,
  onSelectNgo,
}: BroadcastMapProps) {
  const [zoomIndex, setZoomIndex] = useState(0)
  const zoom = ZOOM_LEVELS[zoomIndex]

  const ngos = useMemo(() => ngoDirectory.map((ngo) => ({ ngo, point: projectNgo(ngo) })), [ngoDirectory])
  const accepted = ngos.find(({ ngo }) => ngo.id === acceptedId) ?? null
  const isBroadcasting = phase === 'broadcasting'
  const isAccepted = (phase === 'accepted' || phase === 'in_progress' || phase === 'completed') && accepted !== null

  const size = VIEW / zoom
  const focus = isAccepted ? { x: (CENTER + accepted.point.x) / 2, y: (CENTER + accepted.point.y) / 2 } : { x: CENTER, y: CENTER }
  const viewBox = `${focus.x - size / 2} ${focus.y - size / 2} ${size} ${size}`

  return (
    <div className="relative size-full overflow-hidden bg-muted">
      <div className="absolute inset-0 flex pb-[52vh] md:pb-0 md:pl-[468px]">
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          overflow="visible"
          className="size-full"
          role="img"
          aria-label={
            isAccepted
              ? `Map showing route from your pickup to ${accepted.ngo.name}`
              : `Map of ${ngos.length} verified NGOs within ${BROADCAST_RADIUS_KM} KM of your pickup`
          }
        >
          <g aria-hidden="true">
            <path
              d="M -2000 900 C 0 820, 250 980, 520 900 S 900 760, 3000 880"
              className="fill-none stroke-brand-blue/20"
              strokeWidth={34}
              strokeLinecap="round"
            />
            {parks.map((p) => (
              <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width={p.w} height={p.h} rx={18} className="fill-brand-green/10" />
            ))}
            {minorRoads.map((d) => (
              <path key={d} d={d} className="fill-none stroke-background/70" strokeWidth={6} />
            ))}
            {majorRoads.map((d) => (
              <path key={d} d={d} className="fill-none stroke-background" strokeWidth={14} strokeLinecap="round" />
            ))}
          </g>

          {!isAccepted && (
            <g aria-hidden="true">
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS_PX}
                className="fill-brand-green/[0.06] stroke-brand-green"
                strokeWidth={2.5}
                strokeDasharray="10 10"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={CENTER}
                y={CENTER - RADIUS_PX - 14}
                textAnchor="middle"
                className="fill-brand-green text-[22px] font-bold"
              >
                {BROADCAST_RADIUS_KM} KM radius
              </text>
            </g>
          )}

          {isBroadcasting && (
            <g aria-hidden="true">
              {[0, 0.9, 1.8].map((delay) => (
                <circle
                  key={delay}
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS_PX}
                  className="fr-radar-ring fill-brand-green/15 stroke-brand-green/60"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </g>
          )}

          {isAccepted && (
            <g aria-hidden="true">
              <path
                d={routePath(accepted.point)}
                className="fill-none stroke-foreground/15"
                strokeWidth={18}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={routePath(accepted.point)}
                pathLength={1}
                className="fr-route-draw fill-none stroke-brand-blue"
                strokeWidth={9}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}

          {ngos.map(({ ngo, point }) => {
            const isThisAccepted = isAccepted && ngo.id === acceptedId
            const dimmed = isAccepted && !isThisAccepted
            const color = ngo.status === 'available' ? 'fill-brand-blue' : 'fill-brand-orange'
            const scale = isThisAccepted ? 1.3 : 1
            return (
              <g
                key={ngo.id}
                transform={`translate(${point.x} ${point.y}) scale(${scale})`}
                onClick={() => {
                  if (phase === 'broadcasting' && onSelectNgo) {
                    onSelectNgo(ngo.id)
                  }
                }}
                style={{ cursor: phase === 'broadcasting' && onSelectNgo ? 'pointer' : 'default' }}
                className={cn('transition-opacity duration-300', dimmed && 'opacity-35')}
              >
                <title>{`${ngo.name} - ${ngo.distanceKm} KM - ${ngo.status === 'available' ? 'Available' : 'Busy'}`}</title>
                <ellipse cx={0} cy={2} rx={12} ry={4} className="fill-foreground/20" />
                <path
                  d="M 0 0 C -6 -14, -20 -22, -20 -38 A 20 20 0 1 1 20 -38 C 20 -22, 6 -14, 0 0 Z"
                  className={cn(color, 'stroke-background')}
                  strokeWidth={4}
                />
                <circle cx={0} cy={-38} r={7} className="fill-background" />
                <text
                  x={0}
                  y={-94}
                  textAnchor="middle"
                  className="fill-foreground stroke-background text-[22px] font-bold"
                  strokeWidth={6}
                  paintOrder="stroke"
                >
                  {ngo.name}
                </text>
                <text
                  x={0}
                  y={-70}
                  textAnchor="middle"
                  className="fill-muted-foreground stroke-background text-[17px] font-semibold"
                  strokeWidth={5}
                  paintOrder="stroke"
                >
                  {ngo.distanceKm} KM {'\u00B7'} {ngo.status === 'available' ? 'Available' : 'Busy'}
                </text>
              </g>
            )
          })}

          <g transform={`translate(${CENTER} ${CENTER})`}>
            <title>Your pickup location</title>
            <circle r={30} className="fill-brand-green/25" />
            <circle r={17} className="fill-brand-green stroke-background" strokeWidth={6} />
            <text
              y={60}
              textAnchor="middle"
              className="fill-foreground stroke-background text-[22px] font-extrabold"
              strokeWidth={6}
              paintOrder="stroke"
            >
              Your pickup
            </text>
          </g>
        </svg>
      </div>

      <div className="absolute right-4 top-4 z-10 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-md">
        <button
          type="button"
          onClick={() => setZoomIndex((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
          disabled={zoomIndex === ZOOM_LEVELS.length - 1}
          aria-label="Zoom in"
          className="flex size-10 items-center justify-center transition-colors hover:bg-muted disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
        <span className="h-px bg-border" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
          disabled={zoomIndex === 0}
          aria-label="Zoom out"
          className="flex size-10 items-center justify-center transition-colors hover:bg-muted disabled:opacity-40"
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
      </div>

      <ul className="absolute bottom-[54vh] right-4 z-10 flex flex-col gap-1.5 rounded-xl border border-border bg-card/95 px-3 py-2 text-xs font-medium shadow-md md:bottom-4">
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-brand-green" aria-hidden="true" />
          Your pickup
        </li>
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-brand-blue" aria-hidden="true" />
          Available NGO
        </li>
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-brand-orange" aria-hidden="true" />
          Busy NGO
        </li>
      </ul>
    </div>
  )
}

export const BroadcastMap = BroadcastMapView
export default BroadcastMapView
