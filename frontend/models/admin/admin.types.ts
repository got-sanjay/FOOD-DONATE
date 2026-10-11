import { NgoRequestItem } from '../ngo/ngo.types'

export interface AdminNgoAccount {
  id: string
  name: string
  region: string
  isActive: boolean
  reviewStatus: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export interface AdminSummaryItem {
  region: string
  status: string
  count: number
}

export interface AdminDashboardPayload {
  ngos: AdminNgoAccount[]
  donations: NgoRequestItem[]
  summary: AdminSummaryItem[]
}
