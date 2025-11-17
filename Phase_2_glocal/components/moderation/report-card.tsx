'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/hooks/use-toast'
import { User, Clock, MessageSquare, Trash2, Eye, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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

interface ReportCardProps {
  report: Report
  onActionComplete?: () => void
}

export function ReportCard({ report, onActionComplete }: ReportCardProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleDismiss = async () => {
    setIsProcessing(true)

    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'dismissed',
          resolution_note: 'Not a violation',
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to dismiss report')
      }

      toast({
        title: 'Report dismissed',
        description: 'The report has been dismissed',
      })

      if (onActionComplete) {
        onActionComplete()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to dismiss report',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveContent = async () => {
    if (!confirm('Are you sure you want to remove this content? This action cannot be undone.')) {
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch('/api/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: report.content_type,
          content_id: report.content_id,
          action: 'removed',
          reason: report.reason,
          report_id: report.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove content')
      }

      toast({
        title: 'Content removed',
        description: 'The reported content has been removed and replaced with a placeholder',
      })

      if (onActionComplete) {
        onActionComplete()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove content',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleViewContent = () => {
    // Navigate to the content based on type
    let url = ''
    if (report.content_type === 'post') {
      url = `/posts/${report.content_id}`
    } else if (report.content_type === 'comment') {
      // Comments are shown in context of their post
      url = `/posts/${report.content_id}` // Would need post_id in real implementation
    } else if (report.content_type === 'poll') {
      // Polls are shown in community feed
      url = `/communities`
    }

    if (url) {
      window.open(url, '_blank')
    }
  }

  return (
    <Card className="border-l-4 border-l-destructive">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="destructive" className="capitalize">
                  {report.content_type}
                </Badge>
                <Badge variant="secondary">{report.reason}</Badge>
                <Badge variant="outline" className="capitalize">
                  {report.status}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Reported by {report.users?.anonymous_handle || 'Anonymous'}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</span>
              </div>

              {report.additional_context && (
                <div className="flex items-start gap-2 text-sm">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-muted-foreground italic">
                    &quot;{report.additional_context}&quot;
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {report.status === 'pending' && (
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewContent}
                disabled={isProcessing}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Content
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveContent}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Remove Content
              </Button>

              <Button variant="ghost" size="sm" onClick={handleDismiss} disabled={isProcessing}>
                Dismiss Report
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
