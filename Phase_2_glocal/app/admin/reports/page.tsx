'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Flag, CheckSquare, Square } from 'lucide-react'
import { ReportCard } from '@/components/moderation/report-card'

interface Report {
  id: string
  content_type: string
  content_id: string
  reason: string
  additional_context?: string
  status: string
  created_at: string
  community_id?: string
  users?: {
    anonymous_handle: string
  }
  communities?: {
    name: string
  }
}

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'Actioned', value: 'actioned' },
  { label: 'Dismissed', value: 'dismissed' },
]

const CONTENT_TYPE_FILTERS = [
  { label: 'All Types', value: 'all' },
  { label: 'Posts', value: 'post' },
  { label: 'Comments', value: 'comment' },
  { label: 'Polls', value: 'poll' },
]

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [contentTypeFilter, setContentTypeFilter] = useState('all')
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set())
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)

  const fetchReports = useCallback(async () => {
    setIsLoading(true)

    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (contentTypeFilter !== 'all') params.append('content_type', contentTypeFilter)

      const response = await fetch(`/api/reports?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch reports')
      }

      setReports(result.data || [])
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, contentTypeFilter])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const toggleSelectReport = (reportId: string) => {
    const newSelected = new Set(selectedReports)
    if (newSelected.has(reportId)) {
      newSelected.delete(reportId)
    } else {
      newSelected.add(reportId)
    }
    setSelectedReports(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedReports.size === reports.length) {
      setSelectedReports(new Set())
    } else {
      setSelectedReports(new Set(reports.map((r) => r.id)))
    }
  }

  const handleBulkDismiss = async () => {
    if (selectedReports.size === 0) return
    if (!confirm(`Dismiss ${selectedReports.size} reports?`)) return

    setIsBulkProcessing(true)

    try {
      await Promise.all(
        Array.from(selectedReports).map((reportId) =>
          fetch(`/api/reports/${reportId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'dismissed', resolution_note: 'Bulk dismissed' }),
          })
        )
      )

      setSelectedReports(new Set())
      fetchReports()
    } catch (error) {
      console.error('Bulk dismiss error:', error)
    } finally {
      setIsBulkProcessing(false)
    }
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reports Queue</h1>
            <p className="mt-2 text-muted-foreground">Platform-wide content reports</p>
          </div>

          {selectedReports.size > 0 && (
            <Button
              variant="outline"
              onClick={handleBulkDismiss}
              disabled={isBulkProcessing}
            >
              {isBulkProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Dismiss Selected ({selectedReports.size})
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
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

              <div>
                <label className="text-sm font-medium mb-2 block">Content Type</label>
                <div className="flex gap-2">
                  {CONTENT_TYPE_FILTERS.map((filter) => (
                    <Button
                      key={filter.value}
                      variant={contentTypeFilter === filter.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setContentTypeFilter(filter.value)}
                    >
                      {filter.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Select All */}
        {reports.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
              {selectedReports.size === reports.length ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              <span className="ml-2">
                {selectedReports.size === reports.length ? 'Deselect All' : 'Select All'}
              </span>
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedReports.size} / {reports.length} selected
            </span>
          </div>
        )}

        {/* Reports List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Flag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No reports found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== 'all' || contentTypeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No reports have been submitted yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="flex items-start gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-4"
                  onClick={() => toggleSelectReport(report.id)}
                >
                  {selectedReports.has(report.id) ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </Button>

                <div className="flex-1">
                  <ReportCard report={report} onActionComplete={fetchReports} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
