import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: October 8, 2025</p>
        </div>

        {/* Acceptance */}
        <Card>
          <CardHeader>
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              By accessing or using Theglocal ("the Service"), you agree to be bound by these Terms
              of Service ("Terms"). If you do not agree to these Terms, please do not use the
              Service.
            </p>
          </CardContent>
        </Card>

        {/* Service Description */}
        <Card>
          <CardHeader>
            <CardTitle>2. Service Description</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>Theglocal is a privacy-first local community platform that enables:</p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Anonymous community participation and discussions</li>
              <li>Discovery of local news, events, and content</li>
              <li>Artist profiles and booking services</li>
              <li>Civic engagement through polls and discussions</li>
            </ul>
          </CardContent>
        </Card>

        {/* Eligibility */}
        <Card>
          <CardHeader>
            <CardTitle>3. Eligibility</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              You must be at least 13 years old to use the Service. By using the Service, you
              represent that you meet this age requirement.
            </p>
          </CardContent>
        </Card>

        {/* User Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>4. User Accounts</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              <strong>Account Creation:</strong> You may create an account using email or phone
              number.
            </p>
            <p>
              <strong>Account Security:</strong> You are responsible for maintaining the security of
              your account credentials.
            </p>
            <p>
              <strong>Anonymous Handles:</strong> Your account will be assigned an anonymous handle
              to protect your privacy.
            </p>
            <p>
              <strong>One Account:</strong> You may only maintain one active account.
            </p>
          </CardContent>
        </Card>

        {/* Content Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>5. Content and Conduct</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              <strong>Your Content:</strong> You retain ownership of content you post, but grant us
              license to display and distribute it on the platform.
            </p>

            <p>
              <strong>Prohibited Content:</strong> You agree not to post content that:
            </p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Violates laws or regulations</li>
              <li>Infringes intellectual property rights</li>
              <li>Contains hate speech or discrimination</li>
              <li>Harasses or threatens others</li>
              <li>Contains spam or commercial solicitation</li>
              <li>Spreads misinformation</li>
              <li>Is sexually explicit or inappropriate</li>
            </ul>

            <p>
              See our{' '}
              <a href="/transparency/guidelines" className="text-brand-primary hover:underline">
                Community Guidelines
              </a>{' '}
              for details.
            </p>
          </CardContent>
        </Card>

        {/* Artist Services */}
        <Card>
          <CardHeader>
            <CardTitle>6. Artist Services</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              <strong>Subscription:</strong> Artist profiles require a paid subscription
              (₹500/month) after a 30-day free trial.
            </p>
            <p>
              <strong>Payment Terms:</strong>
            </p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Payments processed through Razorpay</li>
              <li>Card required for free trial (not charged during trial)</li>
              <li>Subscriptions auto-renew monthly unless cancelled</li>
              <li>15-day grace period after failed payment</li>
              <li>Profile hidden after grace period expires</li>
              <li>Refunds: Pro-rated for unused days (contact support)</li>
            </ul>

            <p>
              <strong>Booking Services:</strong> Theglocal facilitates connections between users and
              artists but is not party to booking agreements. All terms, pricing, and fulfillment
              are between you and the artist.
            </p>
          </CardContent>
        </Card>

        {/* Moderation */}
        <Card>
          <CardHeader>
            <CardTitle>7. Moderation and Enforcement</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              <strong>We May:</strong>
            </p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Remove content that violates these Terms</li>
              <li>Suspend or ban accounts for violations</li>
              <li>Report illegal activity to authorities</li>
            </ul>

            <p>
              <strong>Moderation is Transparent:</strong> All moderation actions are logged publicly
              (with anonymized identities) in our{' '}
              <a href="/transparency/moderation" className="text-brand-primary hover:underline">
                moderation log
              </a>
              .
            </p>

            <p>
              <strong>Appeals:</strong> See our{' '}
              <a href="/transparency/appeals" className="text-brand-primary hover:underline">
                appeal process
              </a>{' '}
              if you disagree with a moderation decision.
            </p>
          </CardContent>
        </Card>

        {/* Disclaimers */}
        <Card>
          <CardHeader>
            <CardTitle>8. Disclaimers</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              <strong>AS IS:</strong> The Service is provided "as is" without warranties of any
              kind.
            </p>
            <p>
              <strong>No Liability:</strong> We are not liable for user-generated content,
              third-party services, or booking disputes.
            </p>
            <p>
              <strong>External Links:</strong> We are not responsible for external websites or
              services linked from our platform.
            </p>
          </CardContent>
        </Card>

        {/* Limitation of Liability */}
        <Card>
          <CardHeader>
            <CardTitle>9. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              To the maximum extent permitted by law, Theglocal shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, or any loss of
              profits or revenues, whether incurred directly or indirectly, or any loss of data,
              use, goodwill, or other intangible losses.
            </p>
          </CardContent>
        </Card>

        {/* Changes to Terms */}
        <Card>
          <CardHeader>
            <CardTitle>10. Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              We may modify these Terms at any time. We will notify users of material changes via
              email or platform notice. Continued use after changes constitutes acceptance.
            </p>
          </CardContent>
        </Card>

        {/* Termination */}
        <Card>
          <CardHeader>
            <CardTitle>11. Termination</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              <strong>By You:</strong> You may delete your account at any time from your profile
              settings.
            </p>
            <p>
              <strong>By Us:</strong> We may suspend or terminate accounts that violate these Terms.
            </p>
            <p>
              <strong>Effect:</strong> Upon termination, your access to the Service ends. Content
              may be anonymized rather than deleted to preserve community continuity.
            </p>
          </CardContent>
        </Card>

        {/* Governing Law */}
        <Card>
          <CardHeader>
            <CardTitle>12. Governing Law</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              These Terms are governed by the laws of India. Disputes shall be resolved in the
              courts of Mumbai, Maharashtra.
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>13. Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Questions about these Terms?</p>
            <p className="mt-2">
              Email:{' '}
              <a href="mailto:legal@theglocal.com" className="text-brand-primary hover:underline">
                legal@theglocal.com
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Acceptance */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            By using Theglocal, you acknowledge that you have read, understood, and agree to be
            bound by these Terms of Service and our{' '}
            <a href="/privacy" className="text-brand-primary hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Terms of Service - Theglocal',
  description: 'Terms and conditions for using Theglocal platform',
}
