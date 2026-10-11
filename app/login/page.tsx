import type { Metadata } from 'next'
import { SiteHeaderView } from '@/frontend/views/shared/SiteHeaderView'
import { NgoAuthView } from '@/frontend/views/ngo/NgoAuthView'

export const metadata: Metadata = {
  title: 'NGO Login | FoodRescue',
  description: 'Sign in or register your NGO account on FoodRescue.',
}

export default async function NgoLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode } = await searchParams
  return (
    <div className="min-h-screen bg-background">
      <SiteHeaderView showNavigation={false} showDonorRequests={false} />
      <NgoAuthView initialMode={mode === 'register' ? 'register' : 'login'} />
    </div>
  )
}