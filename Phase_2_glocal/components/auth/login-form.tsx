'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/lib/hooks/use-toast'
import { Loader2, Mail, Phone, Chrome } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Separator } from '@/components/ui/separator'

const loginSchema = z.object({
  contact: z
    .string()
    .min(1, 'Email or phone is required')
    .refine(
      (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/
        return emailRegex.test(value) || phoneRegex.test(value)
      },
      {
        message: 'Please enter a valid email or phone number',
      }
    ),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone' | null>(null)

  // Get callback URL for redirect after login
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  // Get error from URL params if present
  const errorParam = searchParams.get('error')

  // Remember contact from localStorage if available
  const [rememberedContact, setRememberedContact] = useState<string>('')

  useEffect(() => {
    const storedContact = localStorage.getItem('login_contact')
    if (storedContact) {
      setRememberedContact(storedContact)
    }
  }, [])

  // Check for linked success message
  const linkedParam = searchParams.get('linked')

  // Display success message for account linking
  useEffect(() => {
    if (linkedParam === 'success') {
      toast({
        title: 'Account Linked Successfully',
        description:
          'Your Google account has been linked to your existing profile. Please sign in again.',
      })

      // Clear linked param from URL
      const url = new URL(window.location.href)
      url.searchParams.delete('linked')
      window.history.replaceState({}, '', url.toString())
    } else if (linkedParam === 'partial') {
      toast({
        title: 'Account Found',
        description:
          'We found your existing account. Please sign in with your email/phone or try Google again.',
        variant: 'default',
      })

      // Clear linked param from URL
      const url = new URL(window.location.href)
      url.searchParams.delete('linked')
      window.history.replaceState({}, '', url.toString())
    }
  }, [linkedParam, toast])

  // Display error from URL params
  useEffect(() => {
    if (errorParam) {
      const errorMessages: Record<string, { title: string; description: string }> = {
        auth_failed: {
          title: 'Authentication Failed',
          description:
            'Google authentication failed. Please try again or use email/phone verification.',
        },
        no_user: {
          title: 'User Not Found',
          description: 'Unable to retrieve user information. Please try again.',
        },
        profile_creation_failed: {
          title: 'Profile Creation Failed',
          description: 'Account created but profile setup failed. Please contact support.',
        },
        no_code: {
          title: 'Invalid Request',
          description: 'No authentication code received. Please try logging in again.',
        },
      }

      const error = errorMessages[errorParam] || {
        title: 'Authentication Error',
        description: 'An error occurred during authentication. Please try again.',
      }

      toast({
        title: error.title,
        description: error.description,
        variant: 'destructive',
      })

      // Clear error from URL
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      window.history.replaceState({}, '', url.toString())
    }
  }, [errorParam, toast])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)

    // Optimistic UI update - show loading state immediately
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: data.contact }),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle specific error codes with user-friendly messages
        let errorMessage = result.error || 'Failed to send OTP'

        if (result.code === 'RATE_LIMITED' || response.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment before trying again.'
        } else if (response.status === 503) {
          errorMessage = 'Service temporarily unavailable. Please try again in a moment.'
        } else if (result.code === 'INVALID_CONTACT') {
          errorMessage = 'Invalid email or phone number format.'
        }

        throw new Error(errorMessage)
      }

      // Store contact in URL params for persistence across refreshes
      // Also store in localStorage for "remember me" functionality
      try {
        localStorage.setItem('login_contact', data.contact)
      } catch (storageError) {
        logger.error('Error storing contact:', storageError)
        // Continue even if localStorage fails
      }

      // Build verify URL with contact and callback URL as query params
      const verifyUrl = new URL('/auth/verify', window.location.origin)
      verifyUrl.searchParams.set('contact', data.contact)
      if (callbackUrl && callbackUrl !== '/') {
        verifyUrl.searchParams.set('callbackUrl', callbackUrl)
      }

      // Show success message with optimistic UI
      toast({
        title: 'OTP Sent!',
        description: `Check your ${result.data.type === 'email' ? 'email' : 'phone'} for the verification code.`,
      })

      // Navigate to verify page with smooth transition
      router.push(verifyUrl.pathname + verifyUrl.search)
    } catch (error) {
      // Handle network errors with retry suggestion
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast({
          title: 'Network Error',
          description:
            'Unable to connect to the server. Please check your connection and try again.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Error',
          description:
            error instanceof Error ? error.message : 'Something went wrong. Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)

    // Optimistic UI update - show loading state immediately
    try {
      const supabase = createClient()

      // Build callback URL with redirect parameter
      const callbackUrlParam =
        callbackUrl && callbackUrl !== '/' ? encodeURIComponent(callbackUrl) : ''

      const redirectTo = callbackUrlParam
        ? `${window.location.origin}/api/auth/callback?callbackUrl=${callbackUrlParam}`
        : `${window.location.origin}/api/auth/callback`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        // Handle specific OAuth errors
        let errorMessage = error.message || 'Failed to login with Google'

        if (error.message?.includes('popup') || error.message?.includes('blocked')) {
          errorMessage = 'Popup was blocked. Please allow popups and try again.'
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        }

        throw new Error(errorMessage)
      }

      // Show loading state - redirect will happen automatically
      toast({
        title: 'Redirecting to Google...',
        description: 'Please complete authentication in the popup window.',
      })

      // Note: setIsGoogleLoading(false) is not called here because
      // the redirect will happen automatically and the component will unmount
    } catch (error) {
      setIsGoogleLoading(false)

      // Handle network errors with retry suggestion
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast({
          title: 'Network Error',
          description:
            'Unable to connect to the server. Please check your connection and try again.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? error.message
              : 'Failed to login with Google. Please try again.',
          variant: 'destructive',
        })
      }
    }
  }

  // Determine current step for progress indicator
  const currentStep = loginMethod ? (isLoading ? 2 : 1) : 0
  const totalSteps = 3 // Method selection → OTP entry → Verification

  // Debug: Log component render state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      logger.info('[LoginForm] Component rendered', {
        hasGoogleHandler: typeof handleGoogleLogin === 'function',
        isGoogleLoading,
        isLoading,
        loginMethod,
      })
    }
  }, [isGoogleLoading, isLoading, loginMethod])

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      {loginMethod && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className={currentStep >= 0 ? 'text-foreground font-medium' : ''}>
              Select Method
            </span>
            <span className={currentStep >= 1 ? 'text-foreground font-medium' : ''}>Enter OTP</span>
            <span className={currentStep >= 2 ? 'text-foreground font-medium' : ''}>Verify</span>
          </div>
          <div className="flex h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="bg-primary transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Google Sign In - Always visible */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading || isLoading}
        data-testid="google-sign-in-button"
      >
        {isGoogleLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redirecting to Google...
          </>
        ) : (
          <>
            <Chrome className="mr-2 h-4 w-4" />
            Continue with Google
          </>
        )}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      {/* OTP Login Methods */}
      {!loginMethod && (
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={() => setLoginMethod('email')}
          >
            <Mail className="mr-2 h-4 w-4" />
            Continue with Email
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={() => setLoginMethod('phone')}
          >
            <Phone className="mr-2 h-4 w-4" />
            Continue with Phone
          </Button>
        </div>
      )}

      {/* Email/Phone OTP Form */}
      {loginMethod && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="contact" className="text-sm font-medium">
              {loginMethod === 'email' ? 'Email Address' : 'Phone Number'}
            </label>
            <Input
              id="contact"
              type={loginMethod === 'email' ? 'email' : 'tel'}
              inputMode={loginMethod === 'email' ? 'email' : 'tel'}
              placeholder={loginMethod === 'email' ? 'your@email.com' : '+1234567890'}
              {...register('contact')}
              defaultValue={rememberedContact}
              disabled={isLoading}
              autoFocus
            />
            {errors.contact && <p className="text-sm text-destructive">{errors.contact.message}</p>}
          </div>

          <div className="space-y-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                'Send OTP'
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setLoginMethod(null)}
              disabled={isLoading}
            >
              ← Back to options
            </Button>
          </div>
        </form>
      )}

      <div className="text-center text-sm text-muted-foreground">
        <p>
          Don&apos;t have an account?{' '}
          <a href="/auth/signup" className="underline hover:text-foreground font-medium">
            Sign up
          </a>
        </p>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        <p>
          By continuing, you agree to our{' '}
          <a href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  )
}
