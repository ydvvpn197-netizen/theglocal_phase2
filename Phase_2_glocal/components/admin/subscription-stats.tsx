'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  TrendingUp,
  DollarSign,
  UserCheck,
  UserX,
  AlertCircle,
  BarChart3,
  CalendarDays,
} from 'lucide-react'

interface AnalyticsData {
  totalSubscriptions: number
  activeSubscriptions: number
  trialSubscriptions: number
  cancelledSubscriptions: number
  mrr: number
  churnRate: number
  trialConversionRate: number
  failedPayments: number
  revenueByPlan: {
    monthly: number
    yearly: number
  }
}

interface SubscriptionStatsProps {
  analytics: AnalyticsData
}

export function SubscriptionStats({ analytics }: SubscriptionStatsProps) {
  const stats = [
    {
      title: 'Total Subscriptions',
      value: analytics.totalSubscriptions,
      icon: Users,
      description: 'All time subscriptions',
      color: 'text-blue-600',
    },
    {
      title: 'Active Subscriptions',
      value: analytics.activeSubscriptions,
      icon: UserCheck,
      description: 'Currently active',
      color: 'text-green-600',
    },
    {
      title: 'Trial Subscriptions',
      value: analytics.trialSubscriptions,
      icon: CalendarDays,
      description: 'In free trial',
      color: 'text-yellow-600',
    },
    {
      title: 'Monthly Recurring Revenue',
      value: `₹${analytics.mrr.toLocaleString()}`,
      icon: DollarSign,
      description: 'MRR from all plans',
      color: 'text-purple-600',
    },
    {
      title: 'Churn Rate',
      value: `${analytics.churnRate}%`,
      icon: UserX,
      description: 'Last 30 days',
      color: 'text-red-600',
    },
    {
      title: 'Trial Conversion',
      value: `${analytics.trialConversionRate}%`,
      icon: TrendingUp,
      description: 'Trial to paid conversion',
      color: 'text-indigo-600',
    },
    {
      title: 'Monthly Plan Revenue',
      value: `₹${analytics.revenueByPlan.monthly.toLocaleString()}`,
      icon: BarChart3,
      description: 'Monthly plan MRR',
      color: 'text-cyan-600',
    },
    {
      title: 'Yearly Plan Revenue',
      value: `₹${analytics.revenueByPlan.yearly.toLocaleString()}`,
      icon: BarChart3,
      description: 'Yearly plan revenue',
      color: 'text-orange-600',
    },
  ]

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Failed Payments Alert */}
      {analytics.failedPayments > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-900">
                {analytics.failedPayments} Failed Payments
              </p>
              <p className="text-sm text-red-700">
                Some subscription payments have failed. Follow up with affected users.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
