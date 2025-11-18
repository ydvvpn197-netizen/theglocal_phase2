'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReportCard } from './report-card'
import { Loader2, Inbox } from 'lucide-react'

interface Report {
  id: string
  content_type: string
  content_id: string
  reason: string
  additional_context?: string
  status: string
  created_at: string
  users?: {
    anonymous_handle: string
  }
}

interface ReportQueueProps {
  communityId: string
}

const STATUS_FILTERS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'Actioned', value: 'actioned' },
  { label: 'Dismissed', value: 'dismissed' },
]

export function ReportQueue({ communityId }: ReportQueueProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [error, setError] = useState<string | null>(null)

  const fetchReports = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append('community_id', communityId)
      params.append('status', statusFilter)

      const response = await fetch(`/api/reports?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch reports')
      }

      setReports(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports')
    } finally {
      setIsLoading(false)
    }
  }, [communityId, statusFilter])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Report Queue</CardTitle>
          <div className="flex gap-2">
            {STATUS_FILTERS.map((filter) => (
              <Button
                key={filter.value}
                variant={statusFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchReports} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No reports found</h3>
            <p className="text-muted-foreground">
              {statusFilter === 'pending'
                ? 'No pending reports. Your community is doing great!'
                : `No ${statusFilter} reports.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} onActionComplete={fetchReports} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
