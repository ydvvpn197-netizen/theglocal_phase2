'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Check, CreditCard, Shield, Clock } from 'lucide-react'

interface SubscriptionFormProps {
  artistId: string
  onSuccess?: () => void
}

export function SubscriptionForm({ artistId, onSuccess }: SubscriptionFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubscribe = async () => {
    setIsLoading(true)

    try {
      // Create subscription order
      const response = await fetch(`/api/artists/${artistId}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: 'monthly',
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create subscription')
      }

      // Load Razorpay script
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => {
        // @ts-expect-error - Razorpay is loaded dynamically
        const rzp = new Razorpay({
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: result.data.amount,
          currency: result.data.currency,
          name: 'Theglocal',
          description: 'Artist Subscription - 30 Day Free Trial',
          image: '/logo.png',
          order_id: result.data.order_id,
          prefill: {
            name: result.data.customer_name,
            email: result.data.customer_email,
          },
          theme: {
            color: '#6366f1',
          },
          handler: async (response: {
            razorpay_payment_id: string
            razorpay_order_id: string
            razorpay_signature: string
          }) => {
            try {
              // Verify payment
              const verifyResponse = await fetch(`/api/artists/${artistId}/subscribe/verify`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              })

              const verifyResult = await verifyResponse.json()

              if (verifyResponse.ok) {
                toast({
                  title: 'Subscription Activated!',
                  description:
                    'Your 30-day free trial has started. You can now create events and receive bookings.',
                })
                onSuccess?.()
              } else {
                throw new Error(verifyResult.error || 'Payment verification failed')
              }
            } catch (error) {
              toast({
                title: 'Payment Verification Failed',
                description: error instanceof Error ? error.message : 'Please contact support',
                variant: 'destructive',
              })
            }
          },
          modal: {
            ondismiss: () => {
              setIsLoading(false)
            },
          },
        })

        rzp.open()
      }
      script.onerror = () => {
        toast({
          title: 'Payment Error',
          description: 'Failed to load payment gateway. Please try again.',
          variant: 'destructive',
        })
        setIsLoading(false)
      }

      document.body.appendChild(script)
    } catch (error) {
      toast({
        title: 'Subscription Error',
        description: error instanceof Error ? error.message : 'Failed to start subscription',
        variant: 'destructive',
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Plan Details */}
      <Card className="border-brand-primary/20 bg-brand-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Artist Subscription Plan
            <Badge variant="secondary">₹500/month</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex gap-2">
              <Check className="h-5 w-5 text-brand-primary" />
              <span className="text-sm">30-day free trial (card required)</span>
            </div>
            <div className="flex gap-2">
              <Check className="h-5 w-5 text-brand-primary" />
              <span className="text-sm">Unlimited event creation</span>
            </div>
            <div className="flex gap-2">
              <Check className="h-5 w-5 text-brand-primary" />
              <span className="text-sm">Direct booking requests</span>
            </div>
            <div className="flex gap-2">
              <Check className="h-5 w-5 text-brand-primary" />
              <span className="text-sm">Portfolio showcase (10 images)</span>
            </div>
            <div className="flex gap-2">
              <Check className="h-5 w-5 text-brand-primary" />
              <span className="text-sm">Profile analytics</span>
            </div>
            <div className="flex gap-2">
              <Check className="h-5 w-5 text-brand-primary" />
              <span className="text-sm">Featured in local discovery</span>
            </div>
          </div>

          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <div className="flex items-start gap-2">
              <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Free Trial Terms</p>
                <p className="text-sm text-yellow-700">
                  Your card will be saved but not charged during the 30-day trial. You can cancel
                  anytime before the trial ends to avoid charges.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex items-start gap-3 pt-6">
          <Shield className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">Secure Payment</p>
            <p className="text-sm text-green-700">
              Your payment is processed securely by Razorpay. We never store your card details.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Subscribe Button */}
      <Button onClick={handleSubscribe} disabled={isLoading} size="lg" className="w-full">
        {isLoading ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Start Free Trial
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        By subscribing, you agree to our terms of service and privacy policy.
      </p>
    </div>
  )
}
