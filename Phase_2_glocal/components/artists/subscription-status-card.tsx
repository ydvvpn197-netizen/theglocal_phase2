'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Calendar, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'

interface SubscriptionStatusCardProps {
  status: string
  plan?: string
  amount?: number
  currency?: string
  trialEnd?: string | null
  currentEnd?: string | null
  nextBillingDate?: string | null
  cancelledAt?: string | null
}

export function SubscriptionStatusCard({
  status,
  plan,
  amount,
  currency: _currency = 'INR',
  trialEnd,
  currentEnd,
  nextBillingDate,
  cancelledAt,
}: SubscriptionStatusCardProps) {
  const getStatusBadge = () => {
    switch (status) {
      case 'trial':
        return <Badge variant="secondary">Free Trial</Badge>
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>
      case 'paused':
        return <Badge variant="outline">Paused</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>
      default:
        return <Badge variant="outline">Inactive</Badge>
    }
  }

  const formatAmount = (amt?: number) => {
    if (!amt) return '₹0'
    return `₹${(amt / 100).toFixed(0)}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription Status
          </span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan Details */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Plan</p>
            <p className="text-lg font-semibold capitalize">{plan || 'No Plan'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="text-lg font-semibold">
              {formatAmount(amount)}/{plan === 'yearly' ? 'year' : 'month'}
            </p>
          </div>
        </div>

        {/* Trial Info */}
        {status === 'trial' && trialEnd && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-start gap-2">
              <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Free Trial Active</p>
                <p className="text-sm text-blue-700">
                  Your trial ends on {format(new Date(trialEnd), 'PPP')}. Your card will be charged
                  after the trial period ends.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Next Billing Date */}
        {(status === 'active' || status === 'trial') && (currentEnd || nextBillingDate) && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Next Billing Date
            </p>
            <p className="text-base font-medium">
              {format(new Date(nextBillingDate || currentEnd!), 'PPP')}
            </p>
          </div>
        )}

        {/* Cancelled Info */}
        {status === 'cancelled' && cancelledAt && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-900">Subscription Cancelled</p>
              <p className="text-sm text-red-700">
                Cancelled on {format(new Date(cancelledAt), 'PPP')}
              </p>
              {currentEnd && (
                <p className="text-sm text-red-700">
                  You can continue using features until {format(new Date(currentEnd), 'PPP')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Paused Info */}
        {status === 'paused' && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-yellow-900">Subscription Paused</p>
              <p className="text-sm text-yellow-700">
                Your subscription is paused. Resume to continue using premium features.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
