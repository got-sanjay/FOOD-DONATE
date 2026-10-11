'use client'

import { useState, useCallback, useEffect } from 'react'
import { NgoRequestsResponse, NgoRequestItem } from '@/frontend/models/ngo/ngo.types'

export function useNgoController() {
  const [data, setData] = useState<NgoRequestsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/ngo-requests')
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error('Failed to load requests.')
      }
      const json: NgoRequestsResponse = await res.json()
      setData(json)
      setError(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching requests.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
    const interval = setInterval(fetchRequests, 3000)
    return () => clearInterval(interval)
  }, [fetchRequests])

  const acceptRequest = useCallback(async (requestId: string) => {
    setActionInProgress(requestId)
    try {
      const res = await fetch(`/api/ngo-requests/${requestId}/accept`, {
        method: 'POST',
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to accept request.')
      }
      await fetchRequests()
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to accept.'
      setError(message)
      return false
    } finally {
      setActionInProgress(null)
    }
  }, [fetchRequests])

  const declineRequest = useCallback(async (requestId: string) => {
    setActionInProgress(requestId)
    try {
      const res = await fetch(`/api/ngo-requests/${requestId}/decline`, {
        method: 'POST',
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to decline request.')
      }
      await fetchRequests()
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to decline.'
      setError(message)
      return false
    } finally {
      setActionInProgress(null)
    }
  }, [fetchRequests])

  const updatePickupStatus = useCallback(async (requestId: string, status: 'in_progress' | 'completed') => {
    setActionInProgress(requestId)
    try {
      const res = await fetch(`/api/ngo-requests/${requestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update pickup status.')
      }
      await fetchRequests()
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update.'
      setError(message)
      return false
    } finally {
      setActionInProgress(null)
    }
  }, [fetchRequests])

  const toggleAvailability = useCallback(async (newStatus: 'available' | 'busy') => {
    try {
      const res = await fetch('/api/ngo-auth/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update availability.')
      setData((prev) => (prev ? { ...prev, availability: newStatus } : prev))
      await fetchRequests()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update availability.'
      setError(message)
    }
  }, [fetchRequests])

  return {
    requests: data?.requests ?? [],
    assignedRequests: data?.assignedRequests ?? [],
    availability: data?.availability ?? 'available',
    region: data?.region ?? '',
    isLoading,
    error,
    actionInProgress,
    fetchRequests,
    acceptRequest,
    declineRequest,
    updatePickupStatus,
    toggleAvailability,
  }
}
