import { ArtistRegistrationForm } from '@/components/artists/artist-registration-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'

export default function ArtistRegisterPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Register as an Artist</h1>
          <p className="mt-2 text-muted-foreground">
            Showcase your talent and connect with your local community
          </p>
        </div>

        {/* Subscription Info */}
        <Card className="border-brand-primary/20 bg-brand-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Artist Subscription Plan
              <Badge variant="secondary">₹500/month</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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

            <p className="text-sm text-muted-foreground">
              Your profile activates immediately after trial signup. Cancel anytime before trial
              ends to avoid charges.
            </p>
          </CardContent>
        </Card>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create Your Artist Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ArtistRegistrationForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Register as Artist - Theglocal',
  description: 'Join Theglocal as a local artist or service provider',
}
