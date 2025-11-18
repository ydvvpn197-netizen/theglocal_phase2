'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { ExternalLink } from 'lucide-react'

interface Subscription {
  id: string
  artist_id: string
  user_id: string
  razorpay_subscription_id: string | null
  razorpay_plan_id: string | null
  plan: string
  status: string
  amount: number
  currency: string
  trial_start: string | null
  trial_end: string | null
  current_start: string | null
  current_end: string | null
  next_billing_date: string | null
  created_at: string
  artist: {
    id: string
    stage_name: string
    service_category: string
    location_city: string
  }
  user: {
    id: string
    email: string
    anonymous_handle: string
  }
}

interface SubscriptionListProps {
  subscriptions: Subscription[]
}

export function SubscriptionList({ subscriptions }: SubscriptionListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'trial':
        return <Badge variant="secondary">Trial</Badge>
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>
      case 'paused':
        return <Badge variant="outline">Paused</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      case 'completed':
        return <Badge variant="outline">Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatAmount = (amount: number, currency: string) => {
    return `${currency === 'INR' ? '₹' : currency} ${(amount / 100).toFixed(0)}`
  }

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (statusFilter !== 'all' && sub.status !== statusFilter) return false
    if (planFilter !== 'all' && sub.plan !== planFilter) return false
    return true
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>All Subscriptions ({filteredSubscriptions.length})</span>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredSubscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subscriptions found.</p>
        ) : (
          <div className="space-y-4">
            {filteredSubscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Freelancer/Creator Info */}
                  <div className="space-y-1">
                    <p className="font-semibold">{subscription.artist.stage_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {subscription.artist.service_category}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {subscription.artist.location_city}
                    </p>
                  </div>

                  {/* Plan & Status */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(subscription.status)}
                      <Badge variant="outline" className="capitalize">
                        {subscription.plan}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">
                      {formatAmount(subscription.amount, subscription.currency)}/
                      {subscription.plan === 'yearly' ? 'year' : 'month'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Since {format(new Date(subscription.created_at), 'PP')}
                    </p>
                  </div>

                  {/* Dates */}
                  <div className="space-y-1">
                    {subscription.trial_end && subscription.status === 'trial' && (
                      <div>
                        <p className="text-xs text-muted-foreground">Trial Ends</p>
                        <p className="text-sm">{format(new Date(subscription.trial_end), 'PP')}</p>
                      </div>
                    )}
                    {subscription.next_billing_date && (
                      <div>
                        <p className="text-xs text-muted-foreground">Next Billing</p>
                        <p className="text-sm">
                          {format(new Date(subscription.next_billing_date), 'PP')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/artists/${subscription.artist_id}`} target="_blank">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View Freelancer/Creator
                      </a>
                    </Button>
                  </div>
                </div>

                {/* User Info */}
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  <span>User: {subscription.user.anonymous_handle}</span>
                  {subscription.razorpay_subscription_id && (
                    <span className="ml-4">
                      Razorpay ID: {subscription.razorpay_subscription_id}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
