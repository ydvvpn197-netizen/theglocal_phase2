import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PayPalCancelPageProps {
  params: Promise<{ id: string }>
}

export default async function PayPalCancelPage({ params }: PayPalCancelPageProps) {
  const { id: artistId } = await params

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Payment Cancelled</h1>
          <p className="mt-2 text-muted-foreground">Your subscription was not completed</p>
        </div>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <X className="h-5 w-5" />
              Subscription Cancelled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700">
              You cancelled the subscription process. No charges have been made to your account.
            </p>
            <div className="mt-4 space-x-4">
              <Link
                href={`/artists/${artistId}/subscribe`}
                className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Try Again
              </Link>
              <Link
                href="/artists/dashboard"
                className="inline-flex items-center px-4 py-2 border border-yellow-600 text-yellow-600 rounded-md hover:bg-yellow-50 transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If you're having trouble with the payment process, please contact our support team.
              We're here to help you get started with your artist subscription.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Payment Cancelled - Theglocal',
  description: 'Your subscription was cancelled',
}
