'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/lib/hooks/use-toast'
import { Loader2 } from 'lucide-react'

const signupSchema = z.object({
  contact: z
    .string()
    .min(1, 'Email or phone is required')
    .refine(
      (value) => {
        // Check if it's a valid email or phone number
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/
        return emailRegex.test(value) || phoneRegex.test(value)
      },
      {
        message: 'Please enter a valid email or phone number',
      }
    ),
})

type SignupFormData = z.infer<typeof signupSchema>

export function SignupForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: data.contact }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Signup failed')
      }

      // Store contact in session storage for OTP verification
      sessionStorage.setItem('signup_contact', data.contact)

      toast({
        title: 'OTP Sent!',
        description: 'Check your email or phone for the verification code.',
      })

      // Redirect to OTP verification page
      router.push('/auth/verify')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="contact" className="text-sm font-medium">
          Email or Phone Number
        </label>
        <Input
          id="contact"
          type="text"
          inputMode="text"
          autoComplete="email tel"
          placeholder="your@email.com or +1234567890"
          {...register('contact')}
          disabled={isLoading}
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
            'Continue with OTP'
          )}
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
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

      <div className="mt-6 p-4 bg-accent/10 rounded-md border border-accent/20">
        <p className="text-sm text-center">
          <strong className="text-accent">Privacy First:</strong> We&apos;ll never ask for your real
          name. You&apos;ll get an anonymous handle automatically.
        </p>
      </div>
    </form>
  )
}
