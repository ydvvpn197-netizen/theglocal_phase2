import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/context/auth-context'

export interface UserCommunity {
  id: string
  name: string
  slug: string
  description?: string
  member_count: number
  location_city: string
  role: 'admin' | 'member'
}

export function useUserCommunities() {
  const [communities, setCommunities] = useState<UserCommunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      setCommunities([])
      setIsLoading(false)
      return
    }

    const fetchCommunities = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/communities/user', {
          credentials: 'include',
        })
        const result = (await response.json()) as {
          error?: string
          data?: UserCommunity[]
        }

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch communities')
        }

        setCommunities(result.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch communities')
        setCommunities([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchCommunities()
  }, [user])

  return { communities, isLoading, error }
}
