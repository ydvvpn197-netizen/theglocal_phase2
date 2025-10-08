'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, FileText, MessageSquare, BarChart3, User, Download } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ModerationLog {
  id: string
  content_type: string
  action: string
  reason: string
  created_at: string
}

interface ModerationLogTableProps {
  communityId?: string
}

const ACTION_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  removed: 'destructive',
  dismissed: 'secondary',
  warned: 'outline',
  temp_banned: 'destructive',
  banned: 'destructive',
}

const CONTENT_TYPE_ICONS = {
  post: FileText,
  comment: MessageSquare,
  poll: BarChart3,
  user: User,
}

const ACTION_FILTERS = [
  { label: 'All Actions', value: 'all' },
  { label: 'Removed', value: 'removed' },
  { label: 'Dismissed', value: 'dismissed' },
  { label: 'Warnings', value: 'warned' },
  { label: 'Bans', value: 'banned' },
]

export function ModerationLogTable({ communityId }: ModerationLogTableProps) {
  const [logs, setLogs] = useState<ModerationLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const pageSize = 20

  const exportToCSV = () => {
    setIsExporting(true)

    try {
      // Convert logs to CSV format
      const headers = ['Date', 'Content Type', 'Action', 'Reason']
      const rows = logs.map((log) => [
        new Date(log.created_at).toISOString(),
        log.content_type,
        log.action,
        log.reason,
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n')

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.setAttribute('href', url)
      link.setAttribute(
        'download',
        `moderation_log_${communityId || 'global'}_${new Date().toISOString().split('T')[0]}.csv`
      )
      link.style.visibility = 'hidden'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting CSV:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (communityId) params.append('community_id', communityId)
      if (actionFilter !== 'all') params.append('action', actionFilter)
      params.append('limit', pageSize.toString())
      params.append('offset', (page * pageSize).toString())

      const response = await fetch(`/api/moderation/log?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch moderation log')
      }

      setLogs(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load moderation log')
    } finally {
      setIsLoading(false)
    }
  }, [communityId, actionFilter, page])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <Card>
      <CardContent className="p-6">
        {/* Filters and Actions */}
        <div className="flex justify-between items-center mb-6 gap-4">
          <div className="flex gap-2 flex-wrap">
            {ACTION_FILTERS.map((filter) => (
              <Button
                key={filter.value}
                variant={actionFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setActionFilter(filter.value)
                  setPage(0)
                }}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          {logs.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export CSV
            </Button>
          )}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">{error}</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No moderation actions found</p>
            <p className="text-sm mt-2">
              {actionFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No moderation actions have been taken yet'}
            </p>
          </div>
        ) : (
          <>
            {/* Log Entries */}
            <div className="space-y-3">
              {logs.map((log) => {
                const ContentIcon =
                  CONTENT_TYPE_ICONS[log.content_type as keyof typeof CONTENT_TYPE_ICONS] ||
                  FileText

                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <ContentIcon className="h-5 w-5 text-muted-foreground" />

                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={ACTION_VARIANTS[log.action] || 'secondary'}
                          className="capitalize"
                        >
                          {log.action}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {log.content_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{log.reason}</p>
                    </div>

                    <div className="text-sm text-muted-foreground text-right">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>

              <span className="text-sm text-muted-foreground">
                Page {page + 1}
              </span>

              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={logs.length < pageSize}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

