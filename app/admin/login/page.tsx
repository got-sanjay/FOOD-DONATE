import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SiteHeaderView } from '@/frontend/views/shared/SiteHeaderView'
import { AdminLoginFormView } from '@/frontend/views/admin/AdminLoginFormView'
import { getAuthenticatedAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Admin Sign In | FoodRescue',
  description: 'Restricted FoodRescue operations administration.',
}

export default async function AdminLoginPage() {
  if (await getAuthenticatedAdmin()) redirect('/admin')
  return (
    <div className="min-h-screen bg-background">
      <SiteHeaderView showNavigation={false} portal="admin" />
      <AdminLoginFormView />
    </div>
  )
}