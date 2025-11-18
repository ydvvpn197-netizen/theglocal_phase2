import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, AlertTriangle, Shield, Users } from 'lucide-react'

export default function CommunityGuidelinesPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Community Guidelines</h1>
          <p className="text-lg text-muted-foreground">
            Our standards for creating a safe, respectful, and engaging community
          </p>
        </div>

        {/* Core Principles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Core Principles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Privacy & Anonymity</h3>
              <p className="text-sm text-muted-foreground">
                Respect everyone&apos;s right to privacy. Never share personal information about
                others without consent. Use anonymous handles to protect identities.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. Local & Relevant</h3>
              <p className="text-sm text-muted-foreground">
                Keep discussions focused on your local community. Share content that&apos;s relevant
                to your area and neighbors.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Respectful Discourse</h3>
              <p className="text-sm text-muted-foreground">
                Engage in civil discussions even when you disagree. Personal attacks, harassment,
                and hate speech are not tolerated.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. Authentic & Honest</h3>
              <p className="text-sm text-muted-foreground">
                Share accurate information. Don&apos;t spread misinformation or impersonate others.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Content Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Content Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Allowed Content */}
            <div>
              <h3 className="font-semibold text-green-700 mb-3">✅ Encouraged Content</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Local news, events, and community updates</li>
                <li>• Civic discussions and polls about local issues</li>
                <li>• Questions and recommendations about your area</li>
                <li>• Artist showcases and event promotions</li>
                <li>• Constructive feedback and suggestions</li>
                <li>• Lost and found posts</li>
                <li>• Community organizing and meetups</li>
              </ul>
            </div>

            {/* Prohibited Content */}
            <div>
              <h3 className="font-semibold text-destructive mb-3">❌ Prohibited Content</h3>
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">Spam & Commercial Abuse</h4>
                  <p className="text-sm text-red-700">
                    Repetitive posts, unauthorized advertising, pyramid schemes, or excessive
                    self-promotion outside designated areas.
                  </p>
                  <p className="text-xs text-red-600 mt-2">
                    Example: Posting the same ad in multiple communities daily
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">Harassment & Bullying</h4>
                  <p className="text-sm text-red-700">
                    Personal attacks, doxxing, threats, stalking, or targeted harassment of
                    individuals or groups.
                  </p>
                  <p className="text-xs text-red-600 mt-2">
                    Example: Repeatedly attacking someone in comments or revealing their identity
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">
                    Misinformation & Deceptive Content
                  </h4>
                  <p className="text-sm text-red-700">
                    Deliberately false information, fake news, impersonation, or content designed to
                    deceive.
                  </p>
                  <p className="text-xs text-red-600 mt-2">
                    Example: Spreading false health information or impersonating officials
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">Violence & Illegal Activity</h4>
                  <p className="text-sm text-red-700">
                    Threats of violence, promotion of illegal activities, graphic violent content,
                    or organized harm.
                  </p>
                  <p className="text-xs text-red-600 mt-2">
                    Example: Organizing vigilante action or sharing graphic injury photos
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">Adult & NSFW Content</h4>
                  <p className="text-sm text-red-700">
                    Pornography, sexual content, or inappropriate material. This is a
                    family-friendly platform.
                  </p>
                  <p className="text-xs text-red-600 mt-2">
                    Example: Posting sexually explicit images or content
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">Hate Speech & Discrimination</h4>
                  <p className="text-sm text-red-700">
                    Content promoting hatred or discrimination based on race, religion, caste,
                    gender, sexual orientation, or other protected characteristics.
                  </p>
                  <p className="text-xs text-red-600 mt-2">
                    Example: Posts attacking people based on their identity
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enforcement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Enforcement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">How We Moderate</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Content moderation is handled by community admins with oversight from platform
                administrators. We aim to be fair, transparent, and consistent.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Actions We May Take</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Badge variant="outline" className="mr-2">
                    Content Removal
                  </Badge>
                  Violating posts/comments replaced with &quot;[removed by moderator]&quot;
                </li>
                <li>
                  <Badge variant="outline" className="mr-2">
                    Warning
                  </Badge>
                  First-time violations may result in a warning
                </li>
                <li>
                  <Badge variant="outline" className="mr-2">
                    Temporary Ban
                  </Badge>
                  Repeated violations: 7-30 day suspension
                </li>
                <li>
                  <Badge variant="outline" className="mr-2">
                    Permanent Ban
                  </Badge>
                  Severe or repeated violations: account termination
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Transparency</h3>
              <p className="text-sm text-muted-foreground">
                All moderation actions are logged publicly in our{' '}
                <a href="/transparency/moderation" className="text-brand-primary hover:underline">
                  moderation log
                </a>
                . Identities are anonymized to protect privacy while maintaining accountability.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Reporting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Reporting Violations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you see content that violates these guidelines, please report it using the report
              button on posts, comments, or polls. Your report will be reviewed by moderators.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-800 mb-2">⚠️ Report Responsibly</p>
              <p className="text-sm text-yellow-700">
                False reports or report abuse may result in action against your account. Only report
                genuine violations.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">What Happens After You Report</h3>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Your report is submitted anonymously to community moderators</li>
                <li>Moderators review the content and your reasoning</li>
                <li>A decision is made to remove, warn, or dismiss the report</li>
                <li>Action is logged publicly (without revealing identities)</li>
                <li>For privacy, you won&apos;t be notified of the outcome</li>
              </ol>
            </div>

            <p className="text-sm text-muted-foreground">
              Learn more about our{' '}
              <a href="/transparency/appeals" className="text-brand-primary hover:underline">
                appeal process
              </a>{' '}
              if you disagree with a moderation decision.
            </p>
          </CardContent>
        </Card>

        {/* Best Practices */}
        <Card className="border-brand-primary/20 bg-brand-primary/5">
          <CardHeader>
            <CardTitle>Best Practices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-sm">
              <li>✓ Be kind and assume good intentions</li>
              <li>✓ Fact-check before sharing news or information</li>
              <li>✓ Use appropriate tags and categories</li>
              <li>✓ Respect the &quot;no politics&quot; rule in non-civic communities</li>
              <li>✓ Credit sources when sharing external content</li>
              <li>✓ Keep event promotions in designated communities</li>
              <li>✓ Report violations instead of engaging</li>
            </ul>
          </CardContent>
        </Card>

        {/* Contact */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Questions about these guidelines?{' '}
            <a href="mailto:support@theglocal.com" className="text-brand-primary hover:underline">
              Contact us
            </a>
          </p>
          <p className="mt-2">Last updated: October 8, 2025</p>
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Community Guidelines - Theglocal',
  description: 'Community standards and content policy for Theglocal platform',
}
