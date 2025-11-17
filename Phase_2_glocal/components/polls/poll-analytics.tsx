'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, TrendingUp, BarChart3 } from 'lucide-react'
import { useToast } from '@/lib/hooks/use-toast'

interface VoteHistoryPoint {
  recorded_at: string
  vote_count: number
}

interface OptionAnalytics {
  option_id: string
  option_text: string
  current_vote_count: number
  history: VoteHistoryPoint[]
}

interface PollAnalyticsData {
  poll_id: string
  interval_type: 'hourly' | 'daily'
  options: OptionAnalytics[]
}

interface PollAnalyticsProps {
  pollId: string
}

export function PollAnalytics({ pollId }: PollAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<PollAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [intervalType, setIntervalType] = useState<'hourly' | 'daily'>('hourly')
  const { toast } = useToast()

  useEffect(() => {
    fetchAnalytics()
  }, [pollId, intervalType])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(
        `/api/polls/${pollId}/analytics?interval=${intervalType}&limit=24`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics')
      }

      setAnalyticsData(data.data)
    } catch (err) {
      logger.error('Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
      toast({
        title: 'Error',
        description: 'Failed to load poll analytics',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (intervalType === 'hourly') {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getMaxVotes = () => {
    if (!analyticsData) return 0
    return Math.max(
      ...analyticsData.options.map((opt) =>
        Math.max(opt.current_vote_count, ...opt.history.map((h) => h.vote_count))
      )
    )
  }

  const getPercentage = (count: number) => {
    const max = getMaxVotes()
    return max > 0 ? (count / max) * 100 : 0
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !analyticsData) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-destructive">
            <p>{error || 'Failed to load analytics'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Poll Analytics
          </CardTitle>
          <Tabs
            value={intervalType}
            onValueChange={(value) => setIntervalType(value as 'hourly' | 'daily')}
          >
            <TabsList>
              <TabsTrigger value="hourly">Hourly</TabsTrigger>
              <TabsTrigger value="daily">Daily</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {analyticsData.options.map((option) => (
            <div key={option.option_id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{option.option_text}</span>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">{option.current_vote_count} votes</span>
                </div>
              </div>

              {/* Simple bar chart visualization */}
              {option.history.length > 0 ? (
                <div className="space-y-1">
                  <div className="flex items-end gap-1 h-20">
                    {option.history.map((point, index) => (
                      <div
                        key={index}
                        className="flex-1 bg-primary rounded-t transition-all hover:opacity-80"
                        style={{
                          height: `${getPercentage(point.vote_count)}%`,
                          minHeight: point.vote_count > 0 ? '4px' : '0',
                        }}
                        title={`${formatDate(point.recorded_at)}: ${point.vote_count} votes`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatDate(option.history[0]?.recorded_at || '')}</span>
                    <span>
                      {formatDate(option.history[option.history.length - 1]?.recorded_at || '')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No historical data available yet
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
