import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Eye, Lock, UserX, Database, FileCheck } from 'lucide-react'

export default function PrivacyMetricsPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Privacy Metrics</h1>
          <p className="mt-2 text-muted-foreground">
            How we protect your privacy and handle your data
          </p>
        </div>

        {/* Privacy Principles */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Shield className="h-5 w-5" />
                Anonymous by Default
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-green-700 space-y-2">
              <p>
                <strong>100%</strong> of users are represented by anonymous handles
              </p>
              <p>No real names, emails, or phone numbers are ever displayed publicly</p>
              <p>User identity is unlinkable across communities for maximum privacy</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Eye className="h-5 w-5" />
                Location Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-700 space-y-2">
              <p>
                <strong>City-level only:</strong> We never expose exact coordinates
              </p>
              <p>GPS coordinates rounded to ~1km for privacy</p>
              <p>Location data used only for local content filtering</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <Lock className="h-5 w-5" />
                Data Encryption
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-purple-700 space-y-2">
              <p>
                <strong>End-to-end:</strong> All data encrypted in transit and at rest
              </p>
              <p>SSL/TLS for all connections</p>
              <p>Secure authentication with JWT tokens</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <UserX className="h-5 w-5" />
                Data Deletion
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-orange-700 space-y-2">
              <p>
                <strong>Right to be forgotten:</strong> Users can delete their accounts anytime
              </p>
              <p>All personal data permanently removed within 30 days</p>
              <p>Content anonymized, not deleted (for community continuity)</p>
            </CardContent>
          </Card>
        </div>

        {/* Data Handling Metrics */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Data Handling (Last 30 Days)</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-5 w-5 text-muted-foreground" />
                  Deletion Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">0</div>
                <p className="text-sm text-muted-foreground">Processed: 0 (100%)</p>
                <p className="text-xs text-muted-foreground mt-2">Average processing time: N/A</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserX className="h-5 w-5 text-muted-foreground" />
                  Account Deletions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">0</div>
                <p className="text-sm text-muted-foreground">Completed deletions</p>
                <p className="text-xs text-muted-foreground mt-2">All data permanently removed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileCheck className="h-5 w-5 text-muted-foreground" />
                  Data Breaches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2 text-green-600">0</div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  No breaches reported
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  We will immediately disclose any security incidents
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Privacy Commitments */}
        <Card>
          <CardHeader>
            <CardTitle>Our Privacy Commitments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-green-100 p-2">
                  <Shield className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold">No Tracking or Profiling</h4>
                  <p className="text-sm text-muted-foreground">
                    We don't track your activity across the web or build user profiles for
                    advertising
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-100 p-2">
                  <Lock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold">Minimal Data Collection</h4>
                  <p className="text-sm text-muted-foreground">
                    We only collect data necessary for platform functionality - email/phone for
                    authentication, location for local content
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-purple-100 p-2">
                  <Eye className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold">No Third-Party Data Sharing</h4>
                  <p className="text-sm text-muted-foreground">
                    Your data is never sold or shared with third parties for marketing purposes
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-orange-100 p-2">
                  <UserX className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold">You Control Your Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Export or delete your data anytime. No questions asked, no retention period
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Privacy Metrics - Theglocal',
  description: 'See how we protect user privacy and handle data',
}
