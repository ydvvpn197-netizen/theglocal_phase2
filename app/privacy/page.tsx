import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: October 8, 2025</p>
        </div>

        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle>Our Commitment to Privacy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              At Theglocal, privacy isn&apos;t an afterthought—it&apos;s our foundation. We believe
              you should be able to participate in your local community without sacrificing your
              privacy.
            </p>
            <p>
              This policy explains what data we collect, how we use it, and your rights regarding
              your information.
            </p>
          </CardContent>
        </Card>

        {/* Information We Collect */}
        <Card>
          <CardHeader>
            <CardTitle>1. Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Information You Provide:</h3>
              <ul className="space-y-1 ml-6 list-disc text-muted-foreground">
                <li>Email address or phone number (for authentication)</li>
                <li>City/location (for local content filtering)</li>
                <li>Content you post (text, images)</li>
                <li>Messages sent through the platform</li>
                <li>For artists: Stage name, service category, portfolio, rates</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Automatically Collected:</h3>
              <ul className="space-y-1 ml-6 list-disc text-muted-foreground">
                <li>IP address (for rate limiting and security)</li>
                <li>Device and browser information</li>
                <li>Usage analytics (page views, feature usage)</li>
                <li>Location coordinates (if granted, rounded to ~1km for privacy)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">We Do NOT Collect:</h3>
              <ul className="space-y-1 ml-6 list-disc text-green-700">
                <li>Real names</li>
                <li>Precise location data</li>
                <li>Browsing history outside our platform</li>
                <li>Data from third-party websites</li>
                <li>Biometric data</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Your Data */}
        <Card>
          <CardHeader>
            <CardTitle>2. How We Use Your Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>To Provide Our Service:</strong>
            </p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Authenticate your account</li>
              <li>Show you relevant local content</li>
              <li>Enable communication between users and artists</li>
              <li>Process payments and subscriptions</li>
            </ul>

            <p>
              <strong>To Improve Our Service:</strong>
            </p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Understand how features are used</li>
              <li>Fix bugs and improve performance</li>
              <li>Develop new features</li>
            </ul>

            <p>
              <strong>For Safety and Security:</strong>
            </p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Prevent fraud and abuse</li>
              <li>Enforce our community guidelines</li>
              <li>Comply with legal obligations</li>
            </ul>
          </CardContent>
        </Card>

        {/* Data Sharing */}
        <Card>
          <CardHeader>
            <CardTitle>3. Data Sharing and Disclosure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="font-semibold text-green-800 mb-2">We Do NOT Sell Your Data</p>
              <p className="text-green-700">
                We never sell, rent, or share your personal information with third parties for
                marketing purposes.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">We Share Data With:</h3>
              <ul className="ml-6 list-disc text-muted-foreground space-y-1">
                <li>
                  <strong>Service Providers:</strong> Supabase (hosting), Razorpay (payments),
                  Resend (emails) - only as needed to provide service
                </li>
                <li>
                  <strong>Legal Requirements:</strong> If required by law or to protect rights and
                  safety
                </li>
                <li>
                  <strong>With Your Consent:</strong> When you explicitly agree to share
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card>
          <CardHeader>
            <CardTitle>4. Your Privacy Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>You have the right to:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <strong>Access:</strong> Request a copy of your data
              </li>
              <li>
                <strong>Rectification:</strong> Correct inaccurate data
              </li>
              <li>
                <strong>Erasure:</strong> Delete your account and data
              </li>
              <li>
                <strong>Portability:</strong> Export your data
              </li>
              <li>
                <strong>Object:</strong> Opt out of certain data processing
              </li>
              <li>
                <strong>Withdraw Consent:</strong> Revoke permissions at any time
              </li>
            </ul>

            <p className="mt-4">
              To exercise these rights, email us at{' '}
              <a href="mailto:privacy@theglocal.com" className="text-brand-primary hover:underline">
                privacy@theglocal.com
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card>
          <CardHeader>
            <CardTitle>5. Data Retention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <strong>Account Data:</strong> Retained while account is active
              </li>
              <li>
                <strong>Content:</strong> Retained indefinitely but anonymized if you delete your
                account
              </li>
              <li>
                <strong>Deleted Accounts:</strong> Personal data deleted within 30 days
              </li>
              <li>
                <strong>Backup Data:</strong> Removed from backups within 90 days
              </li>
              <li>
                <strong>Legal Hold:</strong> Data may be retained longer if legally required
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle>6. Security Measures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="ml-6 list-disc space-y-2">
              <li>Encryption in transit (HTTPS/TLS)</li>
              <li>Encryption at rest (database and storage)</li>
              <li>Row Level Security (RLS) on all database tables</li>
              <li>Regular security audits</li>
              <li>Secure authentication (OTP-based)</li>
              <li>Rate limiting to prevent abuse</li>
            </ul>
          </CardContent>
        </Card>

        {/* Children's Privacy */}
        <Card>
          <CardHeader>
            <CardTitle>7. Children&apos;s Privacy</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Our service is not intended for children under 13. We do not knowingly collect
              information from children under 13. If you believe we have collected data from a child
              under 13, please contact us immediately.
            </p>
          </CardContent>
        </Card>

        {/* Changes to Policy */}
        <Card>
          <CardHeader>
            <CardTitle>8. Changes to This Policy</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              We may update this policy from time to time. We will notify you of significant changes
              via email or prominent notice on the platform. Continued use after changes constitutes
              acceptance.
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>9. Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Questions about this privacy policy?</p>
            <p className="mt-2">
              Email:{' '}
              <a href="mailto:privacy@theglocal.com" className="text-brand-primary hover:underline">
                privacy@theglocal.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Privacy Policy - Theglocal',
  description: 'How we protect your privacy and handle your data',
}
