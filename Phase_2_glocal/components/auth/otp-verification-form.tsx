'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { OTPInput } from '@/components/auth/otp-input'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

export function OTPVerificationForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [contact, setContact] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Get contact from session storage
  useEffect(() => {
    const storedContact = sessionStorage.getItem('signup_contact')
    if (!storedContact) {
      // Redirect back to signup if no contact found
      router.push('/auth/signup')
    } else {
      setContact(storedContact)
    }
  }, [router])

  // Countdown for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (otp.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter the complete 6-digit code',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact, otp }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Verification failed')
      }

      // Clear session storage
      sessionStorage.removeItem('signup_contact')

      toast({
        title: 'Welcome to Theglocal!',
        description: `Your anonymous handle: ${result.data.anonymous_handle}`,
      })

      // Redirect to location permission or home
      router.push('/')
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'Invalid OTP code',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (!contact || resendCooldown > 0) return

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to resend OTP')
      }

      toast({
        title: 'OTP Resent',
        description: 'Check your email or phone for the new code',
      })

      setResendCooldown(60) // 60 second cooldown
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to resend OTP',
        variant: 'destructive',
      })
    }
  }

  if (!contact) {
    return <div className="text-center">Redirecting...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-center text-muted-foreground">Code sent to:</p>
        <p className="text-center font-medium">{contact}</p>
      </div>

      <div className="space-y-4">
        <OTPInput value={otp} onChange={setOtp} disabled={isLoading} />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : (
          'Verify & Continue'
        )}
      </Button>

      <div className="text-center">
        <Button
          type="button"
          variant="link"
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="text-sm"
        >
          {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
        </Button>
      </div>

      <div className="text-center">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/auth/signup')}
          className="text-sm"
        >
          ← Back to signup
        </Button>
      </div>
    </form>
  )
}
