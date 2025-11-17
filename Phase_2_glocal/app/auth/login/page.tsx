import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/auth/login-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Suspense } from 'react'

function LoginFormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-muted rounded" />
      <div className="space-y-3">
        <div className="h-9 bg-muted rounded" />
        <div className="h-9 bg-muted rounded" />
      </div>
    </div>
  )
}

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}

export default async function LoginPage(props: LoginPageProps) {
  const searchParams = await props.searchParams
  const callbackUrl = searchParams.callbackUrl || '/'

  const supabase = await createClient()

  // Check if user is already authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Redirect to callback URL if provided, otherwise home
    redirect(callbackUrl !== '/' ? callbackUrl : '/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-brand-primary">Welcome Back</CardTitle>
          <CardDescription>Sign in to continue to Theglocal</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
