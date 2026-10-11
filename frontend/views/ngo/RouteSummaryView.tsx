import { Pencil } from 'lucide-react'
import Link from 'next/link'
import { formatExpiry } from '@/lib/utils'
import type { DonationFoodItem } from '@/frontend/models/donation/donation.types'

type RouteSummaryProps = {
  pickup: string
  region: string
  foodType: string
  quantity: number
  quantityUnit: string
  foodItems: DonationFoodItem[]
  expiresAt: string
  ngoName: string
  ngoAddress: string
}

export function RouteSummaryView({ pickup, region, foodType, quantity, quantityUnit, foodItems, expiresAt, ngoName, ngoAddress }: RouteSummaryProps) {
  return (
    <section aria-label="Pickup route" className="rounded-3xl bg-muted p-5">
      <div className="flex gap-4">
        <div className="flex flex-col items-center pt-1.5" aria-hidden="true">
          <span className="size-3 rounded-full border-[3px] border-brand-green bg-background" />
          <span className="my-1 w-0 flex-1 border-l-2 border-dotted border-muted-foreground/40" />
          <span className="size-3 rounded-[3px] bg-brand-orange" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Pickup Location</p>
              <p className="truncate text-sm font-semibold">{pickup}</p>
              <p className="mt-0.5 text-xs font-semibold text-brand-blue">{region}</p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground" aria-label="Food items and quantities">
                {(foodItems.length ? foodItems : [{ foodType, quantity, quantityUnit, expiresAt }]).map((item, index) => (
                  <li key={`${item.foodType}-${index}`} className="truncate">{item.foodType} · {item.quantity} {item.quantityUnit} · Use by {formatExpiry(item.expiresAt)}</li>
                ))}
              </ul>
              {expiresAt && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Soonest expiry: {formatExpiry(expiresAt)}
                </p>
              )}
            </div>
            <Link
              href="/#donate"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Edit pickup details"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="min-w-0 border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground">NGO Location</p>
            <p className="truncate text-sm font-semibold">{ngoName}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{ngoAddress}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export const RouteSummary = RouteSummaryView
