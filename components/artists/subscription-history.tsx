'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Receipt, CheckCircle2, XCircle, Clock } from 'lucide-react'

interface PaymentOrder {
  id: string
  order_id: string
  amount: number
  currency: string
  plan: string
  status: string
  payment_id?: string
  paid_at?: string
  failed_at?: string
  created_at: string
}

interface SubscriptionHistoryProps {
  paymentHistory: PaymentOrder[]
}

export function SubscriptionHistory({ paymentHistory }: SubscriptionHistoryProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'created':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Receipt className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'created':
        return <Badge variant="secondary">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatAmount = (amount: number, currency: string) => {
    return `${currency === 'INR' ? '₹' : currency} ${(amount / 100).toFixed(2)}`
  }

  if (!paymentHistory || paymentHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No payment history yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {paymentHistory.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(payment.status)}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium capitalize">{payment.plan} Plan</p>
                    {getStatusBadge(payment.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(payment.created_at), 'PPP')}
                  </p>
                  {payment.payment_id && (
                    <p className="text-xs text-muted-foreground font-mono">
                      ID: {payment.payment_id}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatAmount(payment.amount, payment.currency)}</p>
                {payment.paid_at && (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(payment.paid_at), 'PP')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
