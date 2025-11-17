'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, AlertCircle, XCircle, RefreshCw } from 'lucide-react'
import type { ApiResponse } from '@/lib/types/api.types'

interface ApiHealth {
  service: string
  status: 'healthy' | 'degraded' | 'down'
  response_time_ms: number
  last_checked: string
  error_message?: string
}

export default function AdminHealthPage() {
  const [healthData, setHealthData] = useState<ApiHealth[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchHealth = useCallback(async () => {
    setIsLoading(true)
    setIsRefreshing(true)

    try {
      const response = await fetch('/api/admin/health')
      const result = (await response.json()) as ApiResponse<ApiHealth[]>

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch health')
      }

      setHealthData(result.data || [])
    } catch (error) {
      logger.error('Error fetching health:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'down':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return (
          <Badge variant="default" className="bg-green-600">
            Healthy
          </Badge>
        )
      case 'degraded':
        return (
          <Badge variant="secondary" className="bg-yellow-600">
            Degraded
          </Badge>
        )
      case 'down':
        return <Badge variant="destructive">Down</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">API Health Monitoring</h1>
            <p className="mt-2 text-muted-foreground">External service integration status</p>
          </div>

          <Button onClick={fetchHealth} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {/* Health Status Cards */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : healthData.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No health data available
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {healthData.map((api) => (
              <Card key={api.service}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      {getStatusIcon(api.status)}
                      {api.service}
                    </span>
                    {getStatusBadge(api.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Response Time</span>
                    <span className="font-medium">
                      {api.response_time_ms > 0 ? `${api.response_time_ms}ms` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Checked</span>
                    <span className="font-medium">
                      {new Date(api.last_checked).toLocaleTimeString()}
                    </span>
                  </div>

                  {api.error_message && (
                    <div className="mt-2 rounded-md bg-destructive/10 p-2">
                      <p className="text-xs text-destructive">{api.error_message}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Overall Summary */}
        {!isLoading && healthData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Overall Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">
                      {healthData.filter((h) => h.status === 'healthy').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Healthy</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                  <div>
                    <div className="text-2xl font-bold">
                      {healthData.filter((h) => h.status === 'degraded').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Degraded</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <XCircle className="h-8 w-8 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold">
                      {healthData.filter((h) => h.status === 'down').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Down</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
