import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteHeaderView } from '@/frontend/views/shared/SiteHeaderView'
import { NgoDashboardView } from '@/frontend/views/ngo/NgoDashboardView'
import { getAuthenticatedNgo } from '@/lib/ngo-auth'

export const metadata: Metadata = {
  title: 'Donor Requests | FoodRescue NGO Portal',
  description: 'View and respond to available FoodRescue donor broadcasts.',
}

export default async function NgoDashboardPage() {
  const ngo = await getAuthenticatedNgo()
  if (!ngo) redirect('/login')

  return (
    <div className="min-h-screen bg-background">
      <SiteHeaderView showNavigation={false} showDonorRequests={false} />
      <NgoDashboardView ngoName={ngo.name} region={ngo.region} initialAvailability={ngo.availability} />
    </div>
  )
}