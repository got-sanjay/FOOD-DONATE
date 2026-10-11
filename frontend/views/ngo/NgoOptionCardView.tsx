import { BadgeCheck, CheckCircle2, Clock, HandHeart, Mail, Navigation, Phone, Soup, Star, Wheat } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Ngo } from '@/lib/ngos'

const logoMap = {
  hands: { Icon: HandHeart, className: 'bg-secondary text-foreground' },
  soup: { Icon: Soup, className: 'bg-brand-orange/10 text-brand-orange' },
  wheat: { Icon: Wheat, className: 'bg-brand-green/10 text-brand-green' },
}

type NgoOptionCardProps = {
  ngo: Ngo
  selected: boolean
}

export function NgoOptionCardView({ ngo, selected }: NgoOptionCardProps) {
  const { Icon, className: logoClass } = logoMap[ngo.logo]
  const isAvailable = ngo.status === 'available'

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border-2 bg-card p-4 transition-all',
        selected
          ? 'border-brand-blue bg-brand-blue/[0.04] shadow-[0_8px_30px_-12px_rgba(37,99,235,0.35)]'
          : 'border-border hover:border-muted-foreground/30',
      )}
    >
      <div className="flex items-center gap-4">
        <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-2xl', logoClass)}>
          <Icon className="size-6" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-bold md:text-base">{ngo.name}</p>
            <BadgeCheck className="size-4 shrink-0 text-brand-blue" aria-label="Verified" />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Navigation className="size-3" aria-hidden="true" />
              {ngo.distanceKm} KM away
            </span>
            <span
              className={cn(
                'flex items-center gap-1.5 font-semibold',
                isAvailable ? 'text-brand-green' : 'text-amber-600',
              )}
            >
              <span
                aria-hidden="true"
                className={cn('size-2 rounded-full', isAvailable ? 'bg-brand-green' : 'bg-brand-amber')}
              />
              {isAvailable ? 'Available Now' : 'Busy'}
            </span>
            <span className="flex items-center gap-1 font-semibold text-amber-500">
              <Star className="size-3 fill-amber-500 text-amber-500" aria-hidden="true" />
              {ngo.rating ?? 4.9}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <CheckCircle2 className="size-3 text-brand-green" aria-hidden="true" />
              {ngo.completedCount ?? 12} completed
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end">
          <span className="flex items-center gap-1 text-base font-bold">
            <Clock className="size-3.5 text-muted-foreground" aria-hidden="true" />
            {ngo.pickupMins} mins
          </span>
          <span className="text-[11px] text-muted-foreground">est. pickup</span>
        </div>
      </div>

      {/* Expanded Details when selected */}
      {selected && (
        <div className="mt-3.5 border-t border-border/80 pt-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
            {ngo.phone && (
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Phone className="size-3.5 text-brand-blue shrink-0" aria-hidden="true" />
                {ngo.phone}
              </span>
            )}
            {ngo.email && (
              <span className="flex items-center gap-1.5 font-medium text-foreground truncate">
                <Mail className="size-3.5 text-brand-green shrink-0" aria-hidden="true" />
                {ngo.email}
              </span>
            )}
          </div>
          {ngo.address && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              <strong className="text-foreground">Location:</strong> {ngo.address}
            </p>
          )}
          {ngo.additionalNotes && (
            <p className="mt-1 text-[11px] italic text-muted-foreground">
              {ngo.additionalNotes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export const NgoOptionCard = NgoOptionCardView
