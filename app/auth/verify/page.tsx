import { OTPVerificationForm } from '@/components/auth/otp-verification-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Verify Your Identity</CardTitle>
          <CardDescription>Enter the 6-digit code we sent to your email or phone</CardDescription>
        </CardHeader>
        <CardContent>
          <OTPVerificationForm />
        </CardContent>
      </Card>
    </div>
  )
}
