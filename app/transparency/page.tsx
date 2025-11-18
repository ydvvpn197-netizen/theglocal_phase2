import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Shield, Users, FileText, TrendingUp, Eye } from 'lucide-react'

export default function TransparencyDashboardPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Platform Transparency</h1>
          <p className="text-lg text-muted-foreground">
            We believe in complete transparency. Explore our platform metrics, moderation decisions,
            and privacy practices.
          </p>
        </div>

        {/* Transparency Sections */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Platform Statistics */}
          <Link href="/transparency/stats">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-brand-primary" />
                  Platform Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View real-time metrics about users, communities, posts, and engagement across the
                  platform.
                </p>
                <div className="mt-4 text-xs text-brand-primary font-medium">View Statistics →</div>
              </CardContent>
            </Card>
          </Link>

          {/* Moderation Log */}
          <Link href="/transparency/moderation">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-brand-secondary" />
                  Moderation Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Public log of all moderation actions with anonymized identities for privacy
                  protection.
                </p>
                <div className="mt-4 text-xs text-brand-primary font-medium">
                  View Moderation Log →
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Privacy Metrics */}
          <Link href="/transparency/privacy">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-brand-accent" />
                  Privacy Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  See how we protect user privacy, handle data requests, and maintain anonymity.
                </p>
                <div className="mt-4 text-xs text-brand-primary font-medium">
                  View Privacy Metrics →
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Community Guidelines */}
          <Link href="/transparency/guidelines">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Community Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Read our content policy, community standards, and moderation guidelines.
                </p>
                <div className="mt-4 text-xs text-brand-primary font-medium">View Guidelines →</div>
              </CardContent>
            </Card>
          </Link>

          {/* Appeal Process */}
          <Link href="/transparency/appeals">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Appeal Process
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Learn how to appeal moderation decisions and understand the review process.
                </p>
                <div className="mt-4 text-xs text-brand-primary font-medium">
                  View Appeal Process →
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Growth & Impact */}
          <Link href="/transparency/impact">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  Platform Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  See how our platform is growing and making an impact in local communities.
                </p>
                <div className="mt-4 text-xs text-brand-primary font-medium">
                  View Impact Report →
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Our Principles */}
        <Card>
          <CardHeader>
            <CardTitle>Our Transparency Principles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-2">Privacy First</h3>
                <p className="text-sm text-muted-foreground">
                  We never expose personally identifiable information. All metrics are aggregated
                  and anonymized.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Public Accountability</h3>
                <p className="text-sm text-muted-foreground">
                  All moderation actions are logged publicly to ensure accountability and prevent
                  abuse of power.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Community-Driven</h3>
                <p className="text-sm text-muted-foreground">
                  Platform policies and features are shaped by community feedback and democratic
                  participation.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Open Data</h3>
                <p className="text-sm text-muted-foreground">
                  Platform statistics and performance metrics are openly shared with the community.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Platform Transparency - Theglocal',
  description: 'Explore platform metrics, moderation decisions, and privacy practices at Theglocal',
}
