import Link from 'next/link'
import { Leaf } from 'lucide-react'
import { getAuthenticatedAdmin } from '@/lib/admin-auth'
import { getAuthenticatedNgo } from '@/lib/ngo-auth'
import { AdminSessionControlView } from '@/frontend/views/admin/AdminSessionControlView'
import { NgoSessionControlView } from '@/frontend/views/ngo/NgoSessionControlView'

const navLinks: { label: string; href: string }[] = []

export async function SiteHeaderView({
  showNavigation = true,
  showDonorRequests = true,
  portal = 'ngo',
}: {
  showNavigation?: boolean
  showDonorRequests?: boolean
  portal?: 'ngo' | 'admin'
}) {
  const isAdmin = portal === 'admin' ? await getAuthenticatedAdmin() : false
  const ngo = portal === 'ngo' ? await getAuthenticatedNgo() : null

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="FoodRescue home">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary">
            <Leaf className="size-5 text-foreground" aria-hidden="true" />
          </span>
          <span className="text-xl font-extrabold tracking-tight">
            Food<span className="text-primary">Rescue</span>
          </span>
        </Link>

        {showNavigation && navLinks.length > 0 && (
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-8">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {portal === 'admin' ? (
          <AdminSessionControlView username={isAdmin ? process.env.ADMIN_USERNAME ?? 'Administrator' : null} />
        ) : (
          <NgoSessionControlView ngoName={ngo?.name ?? null} showDonorRequests={showDonorRequests} />
        )}
      </div>
    </header>
  )
}

export const SiteHeader = SiteHeaderView
