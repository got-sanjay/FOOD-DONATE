'use client'

import { useState, useCallback, useEffect } from 'react'
import { AdminDashboardPayload } from '@/frontend/models/admin/admin.types'

export function useAdminController() {
  const [data, setData] = useState<AdminDashboardPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [regionFilter, setRegionFilter] = useState<string>('all')

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard')
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/admin/login'
          return
        }
        throw new Error('Failed to load admin overview data.')
      }
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching admin data.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const createNgoAccount = useCallback(async (name: string, region: string, password: string) => {
    try {
      const res = await fetch('/api/admin/ngos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, region, password }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to create NGO account.')
      await fetchDashboardData()
      return { success: true, ngo: result.ngo }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error creating NGO.'
      return { success: false, error: message }
    }
  }, [fetchDashboardData])

  return {
    ngos: data?.ngos ?? [],
    donations: data?.donations ?? [],
    summary: data?.summary ?? [],
    isLoading,
    error,
    regionFilter,
    setRegionFilter,
    fetchDashboardData,
    createNgoAccount,
  }
}
