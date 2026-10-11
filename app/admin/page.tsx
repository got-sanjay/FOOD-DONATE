import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SiteHeaderView } from '@/frontend/views/shared/SiteHeaderView'
import { AdminDashboardView } from '@/frontend/views/admin/AdminDashboardView'
import { getAuthenticatedAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Operations Admin | FoodRescue',
  description: 'Manage NGO accounts and review regional food rescue operations.',
}

export default async function AdminPage() {
  if (!(await getAuthenticatedAdmin())) redirect('/admin/login')
  return (
    <div className="min-h-screen bg-background">
      <SiteHeaderView showNavigation={false} portal="admin" />
      <AdminDashboardView username={process.env.ADMIN_USERNAME ?? 'Administrator'} />
    </div>
  )
}