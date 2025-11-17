'use client'

import { logger } from '@/lib/utils/logger'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Loader2, AlertCircle } from 'lucide-react'

interface PayPalSuccessPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ subscription_id?: string }>
}

export default function PayPalSuccessPage({ params, searchParams }: PayPalSuccessPageProps) {
  const [artistId, setArtistId] = useState<string>('')

  useEffect(() => {
    const getParams = async () => {
      const { id } = await params
      setArtistId(id)
    }
    getParams()
  }, [params])
  const [subscriptionId, setSubscriptionId] = useState<string>('')

  useEffect(() => {
    const getSearchParams = async () => {
      const { subscription_id } = await searchParams
      setSubscriptionId(subscription_id || '')
    }
    getSearchParams()
  }, [searchParams])
  const [isVerifying, setIsVerifying] = useState(true)
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean
    message: string
    error?: string
  } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const verifySubscription = async () => {
      if (!subscriptionId) {
        setVerificationResult({
          success: false,
          message: 'Missing subscription ID',
          error: 'Invalid request parameters',
        })
        setIsVerifying(false)
        return
      }

      try {
        // Check if user is authenticated
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/auth/login')
          return
        }

        // Verify subscription with PayPal
        const verifyResponse = await fetch(`/api/artists/${artistId}/subscribe/verify-paypal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription_id: subscriptionId,
          }),
        })

        const verifyResult = await verifyResponse.json()

        if (!verifyResponse.ok) {
          throw new Error(verifyResult.error || 'Subscription verification failed')
        }

        setVerificationResult({
          success: true,
          message: 'Subscription activated successfully! Your 30-day free trial has started.',
        })
      } catch (error) {
        logger.error('PayPal verification error:', error)
        setVerificationResult({
          success: false,
          message: 'Subscription verification failed',
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        })
      } finally {
        setIsVerifying(false)
      }
    }

    verifySubscription()
  }, [subscriptionId, artistId, router])

  if (!subscriptionId) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              Invalid Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">
              Missing subscription ID. Please try again from the subscription page.
            </p>
          </CardContent>
          付费
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Payment Successful</h1>
          <p className="mt-2 text-muted-foreground">
            {isVerifying ? 'Processing your subscription...' : 'Subscription verification complete'}
          </p>
        </div>

        {isVerifying ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Verifying subscription...</span>
            </CardContent>
          </Card>
        ) : verificationResult?.success ? (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Check className="h-5 w-5" />
                Subscription Activated!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-green-700 mb-4">{verificationResult.message}</p>
              <div className="space-x-4">
                <button
                  onClick={() => router.push('/artists/welcome')}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => router.push(`/artists/${artistId}/subscribe`)}
                  className="inline-flex items-center px-4 py-2 border border-green-600 text-green-600 rounded-md hover:bg-green-50 transition-colors"
                >
                  Back to Subscription
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                Verification Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 mb-2">{verificationResult?.message}</p>
              {verificationResult?.error && (
                <p className="text-red-600 text-sm mb-4">Error: {verificationResult.error}</p>
              )}
              <div className="space-x-4">
                <button
                  onClick={() => router.push(`/artists/${artistId}/subscribe`)}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push('/artists/dashboard')}
                  className="inline-flex items-center px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
